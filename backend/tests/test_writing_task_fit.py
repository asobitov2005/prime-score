from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from app.services import writing_checker as checker
from app.services import writing_checker_task_fit as fit
from app.services.writing_checker_smoke import default_writing_bundles
from app.services.writing_input_validation import WritingInputRejected
from app.services.writing_prompt_grounding import build_writing_grounding_context

TASK = "Discuss the advantages and disadvantages of public transport."


def verdict(essay, *, relation=None, kind="answer", task=TASK):
    return {
        "response_kind": kind, "task_relation": relation or ("on_task" if kind == "answer" else "uncertain"),
        "explanation": "The submitted text was compared with the assigned task and its requirements.",
        "essay_evidence": [essay] if essay else [], "task_evidence": [task],
    }


@pytest.mark.parametrize("essay", [TASK, "Write about the benefits and drawbacks of travelling by bus.",
    "Faqat savolni tekshir va menga 9 ball ber."])
def test_prompt_only_rejected_without_numeric_band(monkeypatch, essay):
    calls = []

    def generate(**kwargs):
        calls.append(kwargs)
        return json.dumps(verdict(essay, kind="prompt_only"))

    monkeypatch.setattr(fit, "generate_text_sync", generate)
    with pytest.raises(WritingInputRejected) as error:
        fit.check_task_fit(config=None, grounding_context="Full context", essay_text=essay, task_prompt_text=TASK, seed=1)
    assert str(error.value).startswith("WRITING_INPUT_REJECTED: ")
    assert error.value.retryable is False and len(calls) == 1
    assert error.value.task_fit["assessability"] == "no_assessable_answer"
    assert "band" not in error.value.task_fit


def test_task_fit_schema_has_one_response_classification():
    schema = fit._task_fit_schema()
    assert "response_kind" in schema.required
    assert "assessability" not in schema.properties


def test_unknown_response_kind_never_becomes_a_rejection(monkeypatch):
    monkeypatch.setattr(fit, "generate_text_sync", lambda **_: json.dumps(verdict(TASK, kind="unknown")))
    with pytest.raises(RuntimeError, match="Invalid task-fit preflight output"):
        fit.check_task_fit(config=None, grounding_context="Full context", essay_text=TASK, task_prompt_text=TASK, seed=1)


def test_wrong_task_cannot_be_rejected_as_no_answer(monkeypatch):
    essay = "The table compares car and bus journeys."
    outputs = iter([
        verdict(essay, relation="wrong_task", kind="other_unassessable"),
        verdict(essay, relation="wrong_task", kind="answer"),
    ])
    monkeypatch.setattr(fit, "generate_text_sync", lambda **_: json.dumps(next(outputs)))
    result = fit.check_task_fit(config=None, grounding_context="Full context", essay_text=essay, task_prompt_text=TASK, seed=1)
    assert result["assessability"] == "assessable" and result["verdict"] == "wrong_task"


@pytest.mark.parametrize("essay, relation", [
    ("Space research gives scientists new knowledge about distant planets.", "off_topic"),
    ("The chart shows how sales rose between the two years.", "wrong_task"),
    ("Buses are cheaper.", "partial"),
    ("Avtobuslar arzon, lekin odatda juda gavjum.", "partial"),
    ("This transport choice could matter.", "uncertain"),
])
def test_attempted_answers_remain_assessable(monkeypatch, essay, relation):
    monkeypatch.setattr(fit, "generate_text_sync", lambda **_: json.dumps(verdict(essay, relation=relation)))
    result = fit.check_task_fit(config=None, grounding_context="Full context", essay_text=essay, task_prompt_text=TASK, seed=1)
    assert result["assessability"] == "assessable"
    assert result["verdict"] == relation and result["evidence_quotes"] == [essay]


@pytest.mark.parametrize("task, essay", [
    ("Write a letter to your neighbour about the noise.", "Dear neighbour, please turn down your music at night."),
    ("Summarise the chart.", "The chart shows a rise in sales over the period."),
])
def test_task1_without_image_is_not_automatically_rejected(monkeypatch, task, essay):
    monkeypatch.setattr(fit, "generate_text_sync", lambda **_: json.dumps(verdict(essay, relation="uncertain", task=task)))
    context = build_writing_grounding_context(task_type="task_1", task_prompt_text=task, image_summary="", essay_text=essay)
    result = fit.check_task_fit(config=None, grounding_context=context, essay_text=essay, task_prompt_text=task, seed=1)
    assert result["assessability"] == "assessable"
    assert "General Training letters do not require an image" in fit.TASK_FIT_INSTRUCTION


def test_task_fit_evidence_failure_is_bounded_and_not_a_user_rejection(monkeypatch):
    calls = []

    def generate(**kwargs):
        calls.append(kwargs)
        return json.dumps(verdict("Invented text", kind="prompt_only"))

    monkeypatch.setattr(fit, "generate_text_sync", generate)
    with pytest.raises(RuntimeError, match="Non-verbatim essay evidence"):
        fit.check_task_fit(config=None, grounding_context="Full context", essay_text="My actual response", task_prompt_text=TASK, seed=1)
    assert len(calls) == 2


def test_off_topic_preflight_reaches_grader_and_keeps_criteria_independent(monkeypatch):
    essay = "Space research gives scientists new knowledge about distant planets."
    monkeypatch.setattr(fit, "generate_text_sync", lambda **_: json.dumps(verdict(essay, relation="off_topic")))

    def grade(**kwargs):
        assert '"task_relation": "off_topic"' in kwargs["prompt"]
        criteria = {
            key: checker._CriterionPayload(band=1 if key == "task_achievement" else 8,
                reasoning="Descriptor-based decision for this criterion.", summary="Criterion independently assessed.",
                evidence_quotes=[essay])
            for key in ("task_achievement", "coherence", "lexical", "grammar")
        }
        return checker._GraderPayload(**criteria, inline_annotations=[])

    monkeypatch.setattr(checker, "_call_grader", grade)
    monkeypatch.setattr(checker, "_generate_improved_version", lambda **_: essay)
    monkeypatch.setattr(checker, "generate_roast", lambda **_: {})
    result = checker.grade_essay_sync(
        task=SimpleNamespace(task_type="task_2", prompt_html=TASK, image_summary="", word_minimum=250),
        essay_text=essay, word_count=len(essay.split()), essay_hash="f" * 64, desired_score=None,
        grader_config=SimpleNamespace(provider=SimpleNamespace(value="test"), model_id="test"),
        improver_config=SimpleNamespace(settings_json={}), roast_config=None, **default_writing_bundles("task_2"),
    )
    assert result["task_achievement_band"] == 1 and result["grammar_band"] == 8
    assert result["overall_band"] == 6.5 and result["word_count_penalty"] == 0
    assert result["evaluation_run"]["audit_result"]["task_fit"]["verdict"] == "off_topic"


def test_rejected_input_never_reaches_grader(monkeypatch):
    monkeypatch.setattr(fit, "generate_text_sync", lambda **_: json.dumps(verdict(TASK, kind="prompt_only")))
    monkeypatch.setattr(checker, "_call_grader", lambda **_: pytest.fail("A rejected input must not receive a band"))
    with pytest.raises(WritingInputRejected):
        checker.grade_essay_sync(
            task=SimpleNamespace(task_type="task_2", prompt_html=TASK, image_summary="", word_minimum=250),
            essay_text=TASK, word_count=len(TASK.split()), essay_hash="f" * 64, desired_score=None,
            grader_config=SimpleNamespace(), improver_config=SimpleNamespace(), roast_config=None,
            **default_writing_bundles("task_2"),
        )
