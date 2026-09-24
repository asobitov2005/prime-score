from __future__ import annotations

import hashlib
import json
from types import SimpleNamespace

import pytest

from app.services import writing_checker as checker
from app.services import writing_prompt_grounding as grounding
from app.services.writing_blueprint import build_pipeline_run_payload, select_benchmark_cards
from app.services.writing_checker_smoke import (
    SYNTHETIC_ESSAY, SYNTHETIC_IMAGE, SYNTHETIC_TASK, default_writing_bundles, run_smoke,
)
from app.services.writing_config import DEFAULT_PROMPT_ENTRIES
from app.services.writing_prompt_defaults import plan_default_prompt_update
from app.services.writing_prompt_official_descriptors import SOURCE_PDF_SHA256


def grade_json(essay: str, band: int = 6) -> dict:
    criterion = {
        "band": band, "reasoning": "The descriptor matches the reported comparison; sentence control has limits.",
        "summary": "A comparison is presented.", "strengths": ["The two modes are compared."],
        "improvements": ["Correct the verb in the opening sentence."],
        "evidence_quotes": [essay.split(".")[0]],
    }
    return checker._GraderPayload(
        **{key: criterion for key in ("task_achievement", "coherence", "lexical", "grammar")},
        overall_summary="The comparison is clear; improve the opening verb agreement.",
        inline_annotations=[],
    ).model_dump()


def install_gpu(monkeypatch, responder):
    calls = []

    def completion(**kwargs):
        calls.append(kwargs)
        if "response_kind" in (getattr(kwargs.get("response_schema"), "properties", None) or {}):
            value = json.dumps({
                "response_kind": "answer", "task_relation": "on_task",
                "explanation": "The answer compares the assigned journeys.",
                "essay_evidence": [SYNTHETIC_ESSAY.split(".")[0]], "task_evidence": [SYNTHETIC_TASK],
            })
        else:
            value = responder(kwargs, len(calls) - 1)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=value))],
                               usage={"prompt_tokens": 120, "completion_tokens": 80, "total_tokens": 200})

    monkeypatch.setattr("app.services.gpu_uz.generate_completion", completion)
    return calls


def test_gpu_pipeline_full_context_metrics_and_optional_regrade(monkeypatch):
    revised = SYNTHETIC_ESSAY.replace("chart compare", "chart compares")

    def respond(call, index):
        if index == 1:
            return json.dumps(grade_json(SYNTHETIC_ESSAY))
        if index == 2:
            return revised
        assert index == 3
        return json.dumps({"overall_roast": "Your opening verb missed its subject."})

    calls = install_gpu(monkeypatch, respond)
    result = run_smoke(api_key="fake", model="synthetic")
    assert len(calls) == 4  # preflight; valid empty annotations; no recovery or default regrade
    for call in calls:
        prompt = call["messages"][-1]["content"]
        assert SYNTHETIC_TASK in prompt and SYNTHETIC_IMAGE in prompt
        assert SYNTHETIC_ESSAY in prompt or SYNTHETIC_ESSAY.replace("\n", "\\n") in prompt
    for call in calls[:3]:
        assert grounding.TASK_1_DESCRIPTORS in call["messages"][-1]["content"]
    assert result["overall_band"] == 6
    assert result["potential_band"] is None
    assert result["improved_version"] == revised
    run = result["evaluation_run"]
    assert run["confidence"] == run["possible_score_range"] == ""
    assert run["calibration_result"] == {"status": "not_performed"}
    assert run["audit_result"]["status"] == "not_performed"
    metrics = run["audit_result"]["stage_metrics"]
    assert [item["operation"] for item in metrics] == ["writing_task_fit", "writing_grader", "writing_rewrite", "writing_roast"]
    assert all(item["total_tokens"] == 200 and item["latency_ms"] >= 0 for item in metrics)


def test_opt_in_regrade_does_not_cap_rewrite_or_change_original(monkeypatch):
    revised = SYNTHETIC_ESSAY.replace("chart compare", "chart compares")

    def respond(call, index):
        if index == 1:
            return json.dumps(grade_json(SYNTHETIC_ESSAY, 5))
        if index == 2:
            return revised
        if index == 3:
            assert revised in call["messages"][-1]["content"]
            assert SYNTHETIC_IMAGE in call["messages"][-1]["content"]
            assert grounding.TASK_1_DESCRIPTORS in call["messages"][-1]["content"]
            return json.dumps(grade_json(revised, 8))
        raise TimeoutError("roast timed out")

    calls = install_gpu(monkeypatch, respond)
    result = run_smoke(api_key="fake", model="synthetic", regrade=True)
    assert len(calls) == 5
    assert result["overall_band"] == 5
    assert result["potential_band"] == 8
    assert result["roast_feedback"] == {}
    assert result["evaluation_run"]["audit_result"]["stage_metrics"][-1]["status"] == "failed"


def test_annotation_recovery_and_repair_receive_full_context(monkeypatch):
    def respond(call, index):
        if index == 1:
            data = grade_json(SYNTHETIC_ESSAY)
            del data["inline_annotations"]
            return json.dumps(data)
        if index == 2:
            return "[broken"
        if index == 3:
            return "[]"
        if index == 4:
            return SYNTHETIC_ESSAY
        return "{}"

    calls = install_gpu(monkeypatch, respond)
    result = run_smoke(api_key="fake", model="synthetic")
    assert len(calls) == 6
    for call in calls[2:4]:
        prompt = call["messages"][-1]["content"]
        assert SYNTHETIC_IMAGE in prompt and SYNTHETIC_TASK in prompt
        assert SYNTHETIC_ESSAY.replace("\n", "\\n") in prompt
        assert grounding.TASK_1_DESCRIPTORS in prompt
    assert result["overall_band"] == 6


def test_grader_repair_receives_full_context(monkeypatch):
    def respond(call, index):
        if index == 1:
            return "{broken"
        if index == 2:
            return json.dumps(grade_json(SYNTHETIC_ESSAY))
        return SYNTHETIC_ESSAY if index == 3 else "{}"

    calls = install_gpu(monkeypatch, respond)
    result = run_smoke(api_key="fake", model="synthetic")
    repair_prompt = calls[2]["messages"][-1]["content"]
    assert SYNTHETIC_ESSAY in repair_prompt and SYNTHETIC_IMAGE in repair_prompt
    assert grounding.TASK_1_DESCRIPTORS in repair_prompt
    assert result["overall_band"] == 6


@pytest.mark.parametrize("kind, expected_calls", [("timeout", 2), ("truncated", 5)])
def test_incomplete_grading_never_emits_a_score(monkeypatch, kind, expected_calls):
    def respond(call, index):
        if kind == "timeout":
            raise TimeoutError("request timed out")
        return '{"task_achievement":'

    calls = install_gpu(monkeypatch, respond)
    with pytest.raises((TimeoutError, RuntimeError)):
        run_smoke(api_key="fake", model="synthetic")
    assert len(calls) == expected_calls


@pytest.mark.parametrize("mutation", ["missing", "invented", "paraphrased", "fractional", "nan", "reasoning"])
def test_criterion_integrity_rejects_unsupported_evidence(mutation):
    data = grade_json(SYNTHETIC_ESSAY)
    criterion = data["grammar"]
    if mutation == "missing":
        criterion["evidence_quotes"] = []
    elif mutation in ("invented", "paraphrased"):
        criterion["evidence_quotes"] = ["The graph compares trains and bicycles."]
    elif mutation == "reasoning":
        criterion["reasoning"] = ""
    else:
        criterion["band"] = 6.5 if mutation == "fractional" else float("nan")
    with pytest.raises(ValueError):
        checker._assert_grader_payload_integrity(checker._GraderPayload.model_validate(data), essay_text=SYNTHETIC_ESSAY)


def test_optional_fabricated_feedback_is_removed_not_backfilled():
    data = grade_json(SYNTHETIC_ESSAY)
    data["score_boosters"] = [{"original": "invented strength"}]
    data["sentence_fixes"] = [{"original": "invented error"}]
    data["vocabulary_suggestions"] = [{"current_phrase": "invented phrase", "improved_phrase": "upgrade"}]
    grader = checker._GraderPayload.model_validate(data)
    checker._assert_grader_payload_integrity(grader, essay_text=SYNTHETIC_ESSAY)
    assert grader.score_boosters == grader.sentence_fixes == grader.vocabulary_suggestions == []
    assert checker._normalize_score_boosters(grader) == []


@pytest.mark.parametrize("words", [19, 100, 149, 150, 249, 250, 300])
def test_no_additive_word_count_penalty(words):
    grader = checker._GraderPayload.model_validate(grade_json(SYNTHETIC_ESSAY, 7))
    result = checker._build_payload(grader=grader, annotations=[], essay_text=SYNTHETIC_ESSAY,
                                    task_type="task_2", word_count=words, word_minimum=250,
                                    desired_score=None, model_version="test")
    assert result["overall_band"] == 7 and result["word_count_penalty"] == 0


def test_official_assets_and_configured_descriptors_are_distinct():
    assert SOURCE_PDF_SHA256 == "e3c88943ef92d98988ce4db454fd7fa8d8435f0b25e9ec667e3720a5c1168d1b"
    bundles = default_writing_bundles("task_2")
    bundles["descriptors"].items[0]["descriptor_text"] = "Custom supplementary note"
    context = grounding.build_writing_grounding_context(task_type="task_2", task_prompt_text="Question",
        image_summary="", essay_text="Entire essay", descriptors=bundles["descriptors"], benchmarks=bundles["benchmarks"])
    assert grounding.TASK_2_DESCRIPTORS in context
    assert grounding.TASK_1_DESCRIPTORS not in context
    assert "Custom supplementary note" in context and "the official table above controls" in context
    assert all(card["card_id"] in context for card in bundles["benchmarks"].items)


def test_corrupted_official_asset_fails_closed(monkeypatch):
    monkeypatch.setattr(grounding, "TASK_1_DESCRIPTORS", "tampered")
    with pytest.raises(ValueError, match="checksum"):
        grounding.build_writing_grounding_context(task_type="task_1", task_prompt_text="Question", image_summary="", essay_text="Essay")


def test_benchmark_selection_is_not_semantic_substring_matching():
    cards = [{"card_id": str(band), "band": band, "use_when": "grammar" if band == 9 else "coherence"} for band in range(4, 10)]
    before = select_benchmark_cards(cards, initial_score=6, weakness_profile={"weakest_criterion": "grammar"})
    for card in cards:
        card["use_when"] = "anything at all"
    after = select_benchmark_cards(cards, initial_score=6, weakness_profile={"weakest_criterion": "lexical"})
    assert [card["card_id"] for card in before] == [card["card_id"] for card in after]
    assert select_benchmark_cards(cards, initial_score=6, weakness_profile={}, max_cards=0) == []


def test_no_fabricated_pipeline_metadata():
    run = build_pipeline_run_payload(ta=7, cc=5, lr=7, gra=6, overall_pre_penalty=6.5,
        final_band=6.5, word_count_penalty=0, descriptors=None, benchmarks=None)
    assert run["selected_benchmarks"] == []
    assert run["calibration_result"] == run["audit_result"] == {"status": "not_performed"}
    assert run["confidence"] == run["possible_score_range"] == ""


def test_known_default_update_preserves_custom_and_is_idempotent(monkeypatch):
    from app.services import writing_prompt_defaults as defaults
    from app.models.enums import WritingPromptKey

    old = "An exact earlier default"
    monkeypatch.setitem(defaults.PREVIOUS_DEFAULT_HASHES, WritingPromptKey.GRADER_SYSTEM, hashlib.sha256(old.encode()).hexdigest())
    entries = {**DEFAULT_PROMPT_ENTRIES, WritingPromptKey.GRADER_SYSTEM: old,
               WritingPromptKey.GRADER_USER_TEMPLATE: "My custom prompt"}
    merged, changed, custom = plan_default_prompt_update(entries)
    assert changed == ["grader_system"] and custom == ["grader_user_template"]
    assert merged[WritingPromptKey.GRADER_USER_TEMPLATE] == "My custom prompt"
    assert entries[WritingPromptKey.GRADER_SYSTEM] == old
    assert plan_default_prompt_update(merged)[1] == []


def test_annotation_vocabulary_does_not_invent_level_reason_or_example():
    original = "a  useful\nphrase"
    result = checker._augment_vocabulary_suggestions(
        task_type="task_2", essay_text=original, items=[],
        annotations=[{"original": original, "replacements": ["a precise phrase"], "category": "lexical"}],
    )
    assert result == [{
        "current_phrase": original, "improved_phrase": "a precise phrase", "level": "",
        "why_it_works": "", "example_sentence": "",
    }]


@pytest.mark.parametrize("level, expected", [("", ""), ("unknown", ""), ("C2", "C2")])
def test_model_vocabulary_preserves_full_text_without_default_cefr(level, expected):
    original = "  source\n phrase " * 20
    explanation = "A complete model explanation. " * 20
    example = "An entire model-provided example. " * 20
    suggestion = checker._VocabularySuggestionPayload(
        current_phrase=original, improved_phrase="specific wording", level=level,
        why_it_works=explanation, example_sentence=example,
    )
    result = checker._normalize_vocabulary_suggestions([suggestion])[0]
    assert result["current_phrase"] == original
    assert result["level"] == expected
    assert result["why_it_works"] == explanation and result["example_sentence"] == example


def test_sentence_fixes_and_boosters_preserve_verbatim_spans_and_full_reasons():
    original = "This  exact source span includes\na newline and repeated spacing. " * 6
    revised = "This complete corrected sentence is not clipped. " * 8
    reason = "The complete explanation must remain available to the reader. " * 8
    data = grade_json(original)
    data["sentence_fixes"] = [{"original": original, "replacement": revised,
        "corrected_sentence": revised, "why": reason, "band_impact": reason}]
    data["score_boosters"] = [{"original": original, "why_it_scores": reason,
        "keep_doing": reason, "band_value": reason}]
    grader = checker._GraderPayload.model_validate(data)
    checker._assert_grader_payload_integrity(grader, essay_text=original)
    fix = checker._normalize_sentence_fixes(grader=grader, annotations=[])[0]
    assert fix["original"] == original
    assert fix["replacement"] == fix["corrected_sentence"] == revised
    assert fix["why"] == fix["band_impact"] == reason
    booster = checker._normalize_score_boosters(grader)[0]
    assert booster["original"] == original
    assert booster["why_it_scores"] == booster["keep_doing"] == booster["band_value"] == reason


def test_annotation_fixes_and_vocabulary_preserve_full_model_content():
    original = "A  verbatim\nsource fragment. " * 12
    revised = "The full model correction. " * 12
    reason = "A full model explanation. " * 12
    annotation = {"original": original, "replacements": [revised], "improved_sentence": revised,
                  "category": "lexical", "explanation": reason, "band_impact": reason}
    grader = checker._GraderPayload.model_validate(grade_json(original))
    fix = checker._normalize_sentence_fixes(grader=grader, annotations=[annotation])[0]
    assert fix["original"] == original
    assert fix["replacement"] == fix["corrected_sentence"] == revised
    assert fix["why"] == fix["band_impact"] == reason
    vocabulary = checker._augment_vocabulary_suggestions(
        task_type="task_2", essay_text=original, annotations=[annotation], items=[],
    )[0]
    assert vocabulary["current_phrase"] == original and vocabulary["improved_phrase"] == revised
    assert vocabulary["why_it_works"] == reason and vocabulary["example_sentence"] == revised
    assert vocabulary["level"] == ""
