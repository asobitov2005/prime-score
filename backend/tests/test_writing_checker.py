from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.models.enums import AiProvider, AiUseCase, WritingTaskType
from app.services.ai_config import ResolvedAiUseCaseConfig
from app.services.writing_checker import (
    _AnnotationPayload,
    _CriterionPayload,
    _GraderPayload,
    _ScoreBoosterPayload,
    _augment_vocabulary_suggestions,
    _build_grading_prompt,
    _build_system_instruction,
    _build_payload,
    _call_annotation_recovery,
    _call_grader,
    _dedupe_annotations,
    _normalize_score_boosters,
    _skip_groq_aux_call,
    _validate_annotations,
)
from app.services.writing_config import DEFAULT_PROMPT_ENTRIES


def _groq_resolved_config() -> ResolvedAiUseCaseConfig:
    return ResolvedAiUseCaseConfig(
        use_case=AiUseCase.WRITING_GRADER,
        provider=AiProvider.GROQ,
        provider_config_id=None,
        provider_label="Groq",
        api_key="test-key",
        base_url=None,
        model_id="openai/gpt-oss-120b",
        model_record_id=None,
        settings_json={},
        context_window=None,
    )


def _valid_grader_json() -> str:
    return """
    {
      "task_achievement": {
        "band": 6.0,
        "reasoning": "Addresses the task clearly.",
        "summary": "Main points are present.",
        "strengths": ["Relevant overview"],
        "improvements": ["Add one clearer comparison"],
        "evidence_quotes": ["overall, sales increased"]
      },
      "coherence": {
        "band": 6.0,
        "reasoning": "Paragraphing is mostly logical.",
        "summary": "Flow is generally easy to follow.",
        "strengths": ["Clear grouping"],
        "improvements": ["Use transitions more precisely"],
        "evidence_quotes": ["In contrast"]
      },
      "lexical": {
        "band": 6.0,
        "reasoning": "Vocabulary is adequate with some variety.",
        "summary": "Word choice is serviceable.",
        "strengths": ["Some topic terms"],
        "improvements": ["Avoid repeating common verbs"],
        "evidence_quotes": ["rose gradually"]
      },
      "grammar": {
        "band": 6.0,
        "reasoning": "Sentence control is mixed but understandable.",
        "summary": "Grammar errors do not block meaning.",
        "strengths": ["Some accurate complex clauses"],
        "improvements": ["Tighten article usage"],
        "evidence_quotes": ["the number of"]
      },
      "overall_summary": "A competent response with room for sharper detail.",
      "next_steps": ["Add one precise data comparison", "Vary linkers"],
      "inline_annotations": [],
      "vocabulary_suggestions": [
        {
          "current_phrase": "go up",
          "improved_phrase": "rise markedly",
          "level": "C1",
          "why_it_works": "It sounds more precise and academic than a basic phrasal verb.",
          "example_sentence": "Overall, the proportion of online sales rose markedly over the period."
        }
      ]
    }
    """.strip()


def _criterion_payload() -> _CriterionPayload:
    return _CriterionPayload(
        band=7.0,
        reasoning="Clear response with some limits.",
        summary="Mostly controlled.",
        strengths=["Clear central idea"],
        improvements=["Develop one point more fully"],
        evidence_quotes=["clear central idea"],
    )


def test_default_writing_prompt_contains_target_integrity_rules() -> None:
    user_prompt = DEFAULT_PROMPT_ENTRIES["grader_user_template"]

    assert "TARGET INTEGRITY" in user_prompt
    assert "Desired Score is a coaching target only" in user_prompt
    assert "It must not increase the awarded band" in user_prompt
    assert "choose the lower band" in user_prompt


def test_score_boosters_do_not_overclaim_full_band_support() -> None:
    payload = _GraderPayload(
        task_achievement=_criterion_payload(),
        coherence=_criterion_payload(),
        lexical=_criterion_payload(),
        grammar=_criterion_payload(),
        score_boosters=[
            _ScoreBoosterPayload(
                criterion="Task Achievement",
                original="The essay keeps a clear position throughout.",
                why_it_scores="This helps the response stay focused.",
                keep_doing="Keep a consistent position.",
                band_value="Band 8.0 support",
            )
        ],
    )

    boosters = _normalize_score_boosters(payload)

    assert boosters[0]["band_value"] == "Supports the criterion"


def test_call_grader_repairs_invalid_json() -> None:
    broken_response = """
    {
      "task_achievement": {
        "band": 6.0,
        "reasoning": "This quote breaks JSON: "overall",
        "summary": "Main points are present."
      }
    }
    """.strip()
    repaired_response = _valid_grader_json()
    calls: list[str] = []

    class _Models:
        def generate_content(self, *, contents: str, **_: object) -> SimpleNamespace:
            calls.append(contents)
            if len(calls) < 4:
                return SimpleNamespace(text=broken_response)
            return SimpleNamespace(text=repaired_response)

    client = SimpleNamespace(models=_Models())

    payload = _call_grader(
        client=client,
        system_instruction="system",
        prompt="prompt",
        essay_text="This is a complete essay with enough words to count as a real attempt in the checker.",
        seed=123,
    )

    assert payload.task_achievement.band == 6.0
    assert len(calls) == 4


def test_call_grader_omits_thinking_config_for_writing_model() -> None:
    seen_config: object | None = None

    class _Models:
        def generate_content(self, **kwargs: object) -> SimpleNamespace:
            nonlocal seen_config
            seen_config = kwargs.get("config")
            return SimpleNamespace(text=_valid_grader_json())

    client = SimpleNamespace(models=_Models())

    payload = _call_grader(
        client=client,
        system_instruction="system",
        prompt="prompt",
        essay_text="This is a complete essay with enough words to count as a real attempt in the checker.",
        seed=123,
    )

    assert payload.task_achievement.band == 6.0
    assert seen_config is not None
    assert getattr(seen_config, "thinkingConfig", None) is None


def test_call_grader_caps_groq_output_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    def fake_generate_text_sync(**kwargs: object) -> str:
        seen.update(kwargs)
        return _valid_grader_json()

    monkeypatch.setattr("app.services.writing_checker.generate_text_sync", fake_generate_text_sync)

    payload = _call_grader(
        resolved_config=_groq_resolved_config(),
        prompts=None,
        system_instruction="system",
        prompt="prompt",
        essay_text="This is a complete essay with enough words to count as a real attempt in the checker.",
        seed=123,
    )

    assert payload.task_achievement.band == 6.0
    assert seen["max_output_tokens"] == 2048


def test_groq_prompt_path_is_compact() -> None:
    config = _groq_resolved_config()
    rubric = SimpleNamespace(
        body=(
            "1. TASK ACHIEVEMENT\n\nBand 8\n- Task 2: Fully developed ideas.\n\n"
            "Band 7\n- Task 2: Clear position with support.\n\n"
            "Band 6\n- Task 2: Relevant position but some ideas unclear.\n\n"
            "Band 5\n- Task 2: Partial response.\n\n"
            "2. COHERENCE AND COHESION\n\nBand 8\n- Logical sequencing.\n\n"
            "Band 7\n- Clear progression.\n\nBand 6\n- Clear overall progression.\n\n"
            "Band 5\n- Limited progression.\n\n3. LEXICAL RESOURCE\n\nBand 8\n- Precise vocabulary.\n\n"
            "Band 7\n- Some flexibility.\n\nBand 6\n- Adequate range.\n\nBand 5\n- Limited range.\n\n"
            "4. GRAMMATICAL RANGE AND ACCURACY\n\nBand 8\n- Mostly error-free.\n\n"
            "Band 7\n- Frequent error-free sentences.\n\nBand 6\n- Some grammar errors.\n\n"
            "Band 5\n- Frequent grammatical errors.\n\nGRADING INSTRUCTIONS"
        ),
        version=1,
    )
    prompts = SimpleNamespace(entries={})
    anchors = SimpleNamespace(
        items=[
            {
                "band": 5.0,
                "criteria": {
                    "task_achievement": 5.0,
                    "coherence": 5.0,
                    "lexical": 5.0,
                    "grammar": 5.0,
                },
                "rationale": "Limited development with weak control.",
                "essay": "Long anchor essay that should not appear in the compact Groq prompt.",
            }
        ]
    )

    system = _build_system_instruction(
        prompts=prompts,
        rubric=rubric,
        resolved_config=config,
        task_type=WritingTaskType.TASK_2.value,
    )
    prompt = _build_grading_prompt(
        prompts=prompts,
        anchors=anchors,
        resolved_config=config,
        task_type=WritingTaskType.TASK_2.value,
        task_prompt_text="Discuss both views and give your opinion.",
        image_summary="",
        essay_text="This is a candidate essay.",
    )

    assert "strict json response schema" not in prompt.lower()
    assert "Long anchor essay" not in prompt
    assert "inline_annotations: return []" in prompt
    assert "Task Response bands ->" in system


def test_skip_groq_aux_calls() -> None:
    assert _skip_groq_aux_call(_groq_resolved_config()) is True


def test_validate_annotations_realigns_nearby_original_text() -> None:
    essay = "The table show the averge band scores."
    annotations = [
        _AnnotationPayload(
            offset=0,
            length=4,
            original="show",
            replacements=["shows"],
            category="grammar",
            severity="error",
            short_message="Use singular verb.",
            explanation="Singular subject takes singular verb.",
            band_impact="This lowers Grammatical Range & Accuracy.",
            examiner_tip="Use singular verbs after singular nouns in introductions.",
            improved_sentence="The table shows the averge band scores.",
        ),
        _AnnotationPayload(
            offset=20,
            length=6,
            original="averge",
            replacements=["average"],
            category="spelling",
            severity="error",
            short_message="Correct spelling.",
            explanation="The word is misspelled.",
            band_impact="This lowers Lexical Resource because core academic words are misspelled.",
            examiner_tip="Spell common task vocabulary accurately.",
            improved_sentence="The table show the average band scores.",
        ),
    ]

    cleaned = _validate_annotations(annotations, essay)

    assert [item["original"] for item in cleaned] == ["show", "averge"]
    assert [item["offset"] for item in cleaned] == [10, 19]
    assert cleaned[0]["band_impact"] == "This lowers Grammatical Range & Accuracy."
    assert cleaned[1]["improved_sentence"] == "The table show the average band scores."


def test_call_annotation_recovery_parses_annotation_array() -> None:
    annotation_response = """
    [
      {
        "offset": 10,
        "length": 4,
        "original": "show",
        "replacements": ["shows"],
        "category": "grammar",
        "severity": "error",
        "short_message": "Use singular verb.",
        "explanation": "Singular subject takes singular verb.",
        "band_impact": "This hurts Grammatical Range & Accuracy.",
        "examiner_tip": "Use the singular verb form after 'table'.",
        "improved_sentence": "The table shows the average band scores."
      }
    ]
    """.strip()

    class _Models:
        def generate_content(self, **_: object) -> SimpleNamespace:
            return SimpleNamespace(text=annotation_response)

    client = SimpleNamespace(models=_Models())

    payload = _call_annotation_recovery(
        client=client,
        essay_text="The table show the average band scores.",
        hints=["Use singular verb."],
        seed=123,
    )

    assert len(payload) == 1
    assert payload[0].original == "show"
    assert payload[0].band_impact == "This hurts Grammatical Range & Accuracy."


def test_call_annotation_recovery_omits_thinking_config_for_writing_model() -> None:
    seen_config: object | None = None

    class _Models:
        def generate_content(self, **kwargs: object) -> SimpleNamespace:
            nonlocal seen_config
            seen_config = kwargs.get("config")
            return SimpleNamespace(
                text="""
                [
                  {
                    "offset": 10,
                    "length": 4,
                    "original": "show",
                    "replacements": ["shows"],
                    "category": "grammar",
                    "severity": "error",
                    "short_message": "Use singular verb.",
                    "explanation": "Singular subject takes singular verb.",
                    "band_impact": "This hurts Grammatical Range & Accuracy.",
                    "examiner_tip": "Use the singular verb form after 'table'.",
                    "improved_sentence": "The table shows the average band scores."
                  }
                ]
                """.strip()
            )

    client = SimpleNamespace(models=_Models())

    payload = _call_annotation_recovery(
        client=client,
        essay_text="The table show the average band scores.",
        hints=["Use singular verb."],
        seed=123,
    )

    assert len(payload) == 1
    assert seen_config is not None
    assert getattr(seen_config, "thinkingConfig", None) is None


def test_call_annotation_recovery_caps_groq_output_tokens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen: dict[str, object] = {}

    def fake_generate_text_sync(**kwargs: object) -> str:
        seen.update(kwargs)
        return """
        [
          {
            "offset": 10,
            "length": 4,
            "original": "show",
            "replacements": ["shows"],
            "category": "grammar",
            "severity": "error",
            "short_message": "Use singular verb.",
            "explanation": "Singular subject takes singular verb.",
            "band_impact": "This hurts Grammatical Range & Accuracy.",
            "examiner_tip": "Use the singular verb form after 'table'.",
            "improved_sentence": "The table shows the average band scores."
          }
        ]
        """.strip()

    monkeypatch.setattr("app.services.writing_checker.generate_text_sync", fake_generate_text_sync)

    payload = _call_annotation_recovery(
        resolved_config=_groq_resolved_config(),
        prompts=None,
        essay_text="The table show the average band scores.",
        hints=["Use singular verb."],
        seed=123,
    )

    assert len(payload) == 1
    assert seen["max_output_tokens"] == 1024


def test_augment_vocabulary_suggestions_does_not_invent_missing_phrases() -> None:
    items = _augment_vocabulary_suggestions(
        task_type=WritingTaskType.TASK_2.value,
        essay_text="This essay is already concise and does not repeat any of the canned weak phrases.",
        annotations=[],
        items=[],
    )

    assert items == []


def test_dedupe_annotations_prefers_richer_detail() -> None:
    deduped = _dedupe_annotations(
        [
            {
                "offset": 10,
                "length": 4,
                "original": "show",
                "replacements": ["shows"],
                "category": "grammar",
                "severity": "error",
                "short_message": "Verb form",
                "explanation": "Short.",
                "band_impact": "",
                "examiner_tip": "",
                "improved_sentence": "",
            },
            {
                "offset": 10,
                "length": 4,
                "original": "show",
                "replacements": ["shows"],
                "category": "grammar",
                "severity": "error",
                "short_message": "Subject-verb agreement",
                "explanation": "The singular noun 'table' requires the verb 'shows' in present simple.",
                "band_impact": "This affects Grammatical Range & Accuracy.",
                "examiner_tip": "Keep singular subjects with singular verbs.",
                "improved_sentence": "The table shows the average band scores.",
            },
        ]
    )

    assert len(deduped) == 1
    assert deduped[0]["short_message"] == "Subject-verb agreement"


def test_call_grader_rejects_partial_zero_band_payload_for_real_essay() -> None:
    broken_but_valid = """
    {
      "task_achievement": {
        "band": 7.0,
        "reasoning": "Addresses the question.",
        "summary": "Clear position.",
        "strengths": ["Clear opinion"],
        "improvements": ["Develop one point more fully"],
        "evidence_quotes": ["In my opinion"]
      },
      "coherence": {
        "band": 0.0,
        "reasoning": "",
        "summary": "",
        "strengths": [],
        "improvements": [],
        "evidence_quotes": []
      },
      "lexical": {
        "band": 0.0,
        "reasoning": "",
        "summary": "",
        "strengths": [],
        "improvements": [],
        "evidence_quotes": []
      },
      "grammar": {
        "band": 0.0,
        "reasoning": "",
        "summary": "",
        "strengths": [],
        "improvements": [],
        "evidence_quotes": []
      },
      "overall_summary": "Clear response with room for improvement.",
      "next_steps": ["Improve grammar.", "Use better vocabulary.", "Be more specific."],
      "inline_annotations": [],
      "vocabulary_suggestions": []
    }
    """.strip()

    class _Models:
        def generate_content(self, **_: object) -> SimpleNamespace:
            return SimpleNamespace(text=broken_but_valid)

    client = SimpleNamespace(models=_Models())

    try:
        _call_grader(
            client=client,
            system_instruction="system",
            prompt="prompt",
            essay_text=(
                "This essay contains enough content to count as a real IELTS attempt and should "
                "not receive zero bands in three criteria."
            ),
            seed=123,
        )
    except RuntimeError as exc:
        assert "invalid or incomplete payload" in str(exc)
    else:
        raise AssertionError("Expected partial zero-band payload to be rejected")


def test_build_payload_rewrites_generic_summary_and_backfills_vocab() -> None:
    grader = _GraderPayload(
        task_achievement=_CriterionPayload(
            band=6.5,
            summary="The response addresses both parts of the question but develops one idea more fully than the other.",
            strengths=["Clear position throughout the essay."],
            improvements=["extend the second body paragraph with one more specific consequence"],
            evidence_quotes=["I believe government should invest more in public transport"],
            reasoning="The response stays on task but one supporting point is thinner than the others.",
        ),
        coherence=_CriterionPayload(
            band=6.0,
            summary="The essay is easy to follow overall, but some paragraph links feel mechanical.",
            strengths=["Body paragraphs follow a logical order."],
            improvements=["replace repetitive linkers such as 'Firstly' and 'Secondly' with more natural transitions"],
            evidence_quotes=["Firstly", "Secondly"],
            reasoning="Organisation is clear, but cohesive devices are somewhat repetitive.",
        ),
        lexical=_CriterionPayload(
            band=6.0,
            summary="Vocabulary is adequate, but several phrases sound too basic for a higher band.",
            strengths=["Some accurate topic vocabulary about transport and pollution."],
            improvements=["upgrade repetitive wording like 'very big problem' to more precise academic phrasing"],
            evidence_quotes=["very big problem"],
            reasoning="Word choice is understandable but occasionally basic and repetitive.",
        ),
        grammar=_CriterionPayload(
            band=5.5,
            summary="Grammar errors are noticeable in complex sentences.",
            strengths=["Simple sentences are mostly accurate."],
            improvements=["fix article and subject-verb agreement errors in the second paragraph"],
            evidence_quotes=["the traffic are increasing"],
            reasoning="Error frequency increases when the writer attempts more complex clauses.",
        ),
        overall_summary="A clear response with room for improvement.",
        next_steps=["Improve grammar.", "Use better vocabulary.", "Be more specific."],
        inline_annotations=[],
        vocabulary_suggestions=[],
    )

    payload = _build_payload(
        grader=grader,
        annotations=[
            {
                "offset": 48,
                "length": 16,
                "original": "very big problem",
                "replacements": ["pressing concern"],
                "category": "lexical",
                "severity": "suggestion",
                "short_message": "Basic wording",
                "explanation": "The phrase is understandable but too plain for a stronger IELTS lexical profile.",
                "band_impact": "This holds Lexical Resource at a mid-band level.",
                "examiner_tip": "Use a more precise noun phrase when describing social issues.",
                "improved_sentence": "Traffic congestion has become a pressing concern in many large cities.",
            },
        ],
        essay_text="Traffic congestion is a very big problem in many cities.",
        task_type="task_2",
        word_count=210,
        word_minimum=250,
        desired_score=None,
        model_version="test-model",
        latency_ms=12,
    )

    assert "strongest area" in payload["feedback"]["overall_summary"].lower()
    assert "weakest" in payload["feedback"]["overall_summary"].lower() or "score limit" in payload["feedback"]["overall_summary"].lower()
    assert len(payload["feedback"]["next_steps"]) == 3
    assert payload["feedback"]["next_steps"][0].startswith("Replace 'very big problem'")
    assert payload["feedback"]["vocabulary_suggestions"] == [
        {
            "current_phrase": "very big problem",
            "improved_phrase": "pressing concern",
            "level": "C1",
            "why_it_works": "The phrase is understandable but too plain for a stronger IELTS lexical profile.",
            "example_sentence": "Traffic congestion has become a pressing concern in many large cities.",
        }
    ]
