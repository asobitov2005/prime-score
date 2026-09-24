from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

from httpx import ASGITransport, AsyncClient
import pytest

from app.api.routes.writing_part_01 import _annotation_patterns
from app.api.routes.writing_part_02 import (
    _build_checklist, _parse_band_boundaries, _parse_checklist, _parse_error_patterns,
    _parse_score_boosters, _parse_target_actions,
)
from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.enums import WritingSubmissionStatus, WritingTaskType
from app.models.user import User
from app.models.writing import WritingEvaluation, WritingEvaluationRun, WritingSubmission, WritingTask
from app.schemas.writing import WritingActionPlan, WritingChecklistItem, WritingCriterionFeedback


CRITERION = WritingCriterionFeedback(band=6, summary="Some agreement errors.",
    improvements=["Correct this agreement error."], evidence_quotes=["I has a car."])
CRITERIA = {key: CRITERION for key in ("task_achievement", "coherence", "lexical", "grammar")}


@pytest.mark.parametrize("feedback", [{}, {key: [] for key in (
    "target_action_plan", "band_boundaries", "score_boosters", "ielts_checklist", "error_taxonomy")},
    {key: "invalid" for key in ("target_action_plan", "band_boundaries", "score_boosters", "ielts_checklist")}])
def test_no_semantic_feedback_is_inferred_from_other_fields(feedback):
    fallback = WritingActionPlan(fixes=["Correct this agreement error."])
    assert _parse_target_actions(feedback, fallback, 6, 8) == []
    assert _parse_band_boundaries(feedback, **CRITERIA) == []
    assert _parse_score_boosters(feedback, **CRITERIA) == []
    assert _parse_checklist(feedback, [WritingChecklistItem(label="Should not appear")]) == []
    assert _build_checklist(task_type=WritingTaskType.TASK_2, subtype=None,
        essay_text="In my opinion, firstly, for example, in conclusion.", feedback=feedback, annotations_raw=[]) == []


def test_partial_supplied_feedback_is_preserved_without_padding_or_truncation():
    original = "An exact  original\nphrase. " * 15
    reason = "A full supplied explanation. " * 20
    feedback = {
        "band_boundaries": [{"criterion": "Grammar", "current_band": 6, "next_band": 7,
                             "why_current": reason, "required_for_next": reason}],
        "score_boosters": [{"criterion": "Coherence", "original": original, "why_it_scores": reason}],
        "target_action_plan": [{"title": "Revise", "how": reason, "why": reason}],
        "ielts_checklist": [{"label": "Coverage", "status": "partial", "detail": reason}],
    }
    boundaries = _parse_band_boundaries(feedback, **CRITERIA)
    assert len(boundaries) == 1 and boundaries[0].why_current == reason
    boosters = _parse_score_boosters(feedback, **CRITERIA)
    assert len(boosters) == 1 and boosters[0].original == original and boosters[0].why_it_scores == reason
    actions = _parse_target_actions(feedback, WritingActionPlan(fixes=["Ignored"]), 6, 9)
    assert len(actions) == 1 and actions[0].how == reason and actions[0].band_impact == ""
    assert _parse_checklist(feedback, [])[0].detail == reason


def test_annotation_aggregation_uses_categories_not_keyword_inference():
    rows = [
        {"category": "lexical", "original": " the  unusual\nexpression", "explanation": "article agreement comma"},
        {"category": "grammar", "original": "in on at", "explanation": "collocation flow lexical"},
        {"category": "lexical", "original": "second phrase"},
        {"original": "No category supplied", "explanation": "grammar"},
    ]
    items = _annotation_patterns(rows)
    assert [(item.category, item.count) for item in items] == [("lexical", 2), ("grammar", 1)]
    assert [item.percentage for item in items] == [66.7, 33.3]
    assert items[0].examples == [rows[0]["original"], "second phrase"]
    assert all(item.subcategory == item.fix == "" for item in items)
    assert _annotation_patterns(rows, limit=0) == []


def test_taxonomy_empty_is_not_missing_and_bad_counts_do_not_crash():
    fallback = _annotation_patterns([{"category": "grammar", "original": "I has"}])
    assert _parse_error_patterns({}, fallback) == fallback
    assert _parse_error_patterns({"error_taxonomy": []}, fallback) == []
    assert _parse_error_patterns({"error_taxonomy": "invalid"}, fallback) == []
    items = _parse_error_patterns({"error_taxonomy": [
        {"category": "grammar", "label": "Agreement", "count": "invalid"},
        {"category": "grammar", "label": "Agreement", "count": -1},
        {"category": "lexical", "label": "Word choice", "count": 2, "fix": "Supplied fix"},
    ]}, fallback)
    assert len(items) == 1 and items[0].count == 2 and items[0].percentage == 100
    assert items[0].fix == "Supplied fix"


class Records:
    def __init__(self, feedback):
        self.user_id, self.submission_id, self.task_id = uuid4(), uuid4(), uuid4()
        self.annotation = {"offset": 0, "length": 5, "original": "I has", "replacements": ["I have"],
                           "category": "grammar", "explanation": "Agreement", "improved_sentence": "I have a car."}
        self.submission = SimpleNamespace(id=self.submission_id, user_id=self.user_id, task_id=self.task_id,
            task_type=WritingTaskType.TASK_2, status=WritingSubmissionStatus.COMPLETED, error_message=None,
            essay_text="I has a car.", word_count=4, time_spent_seconds=30, desired_score=None,
            submitted_at=datetime.now(UTC))
        self.task = SimpleNamespace(id=self.task_id, title="Assigned task", word_minimum=250, question_subtype=None)
        self.evaluation = SimpleNamespace(feedback={**{key: value.model_dump() for key, value in CRITERIA.items()}, **feedback},
            roast_feedback={}, inline_annotations=[self.annotation], overall_band=6, potential_band=None,
            improved_version="I have a car.", word_count_penalty=0, graded_at=datetime.now(UTC), cache_hit=False,
            model_version="test", prompt_version="test", grader_profile_version=1, rubric_version=1,
            anchor_set_version=1, roast_profile_version=1, improved_profile_version=1, annotation_profile_version=1)
        self.run = SimpleNamespace(confidence="", possible_score_range="", selected_benchmarks=[],
            calibration_result={"status": "not_performed"}, audit_result={"task_fit": {
                "verdict": "wrong_task", "explanation": "The response addresses another assignment.",
                "evidence_quotes": ["I has a car."]}}, meta_learning_note="")

    async def get(self, model, identity):
        return {WritingSubmission: self.submission, WritingTask: self.task, User: None}[model]

    async def scalar(self, statement):
        model = statement.column_descriptions[0]["entity"]
        return {WritingEvaluation: self.evaluation, WritingEvaluationRun: self.run}[model]

    async def scalars(self, statement):
        return SimpleNamespace(all=lambda: [])

    async def execute(self, statement):
        return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [[self.annotation]]))


@pytest.mark.parametrize("explicit_empty", [True, False])
async def test_result_http_preserves_task_fit_and_does_not_fabricate_feedback(app, explicit_empty):
    feedback = {key: [] for key in ("target_action_plan", "band_boundaries", "score_boosters", "ielts_checklist", "error_taxonomy", "sentence_fixes")} if explicit_empty else {}
    records = Records(feedback)

    async def database():
        yield records

    app.dependency_overrides[get_db_session] = database
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=records.user_id)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/api/writing/submissions/{records.submission_id}/result")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["audit_result"]["task_fit"] == records.run.audit_result["task_fit"]
    assert all(data[key] == [] for key in ("target_action_plan", "band_boundaries", "score_boosters", "checklist"))
    assert data["history_error_trends"][0]["category"] == "grammar"
    assert data["history_error_trends"][0]["fix"] == ""
    if explicit_empty:
        assert data["error_patterns"] == data["sentence_fixes"] == data["revision_diff"] == []
    else:
        assert data["error_patterns"][0]["count"] == 1
        assert data["sentence_fixes"][0]["original"] == "I has"


async def test_failed_rejection_is_visible_but_has_no_result_or_retry(app):
    records = Records({})
    records.submission.status = WritingSubmissionStatus.FAILED
    records.submission.error_message = "WRITING_INPUT_REJECTED: Submit an answer, not a question."

    async def database():
        yield records

    app.dependency_overrides[get_db_session] = database
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=records.user_id)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            prefix = f"/api/writing/submissions/{records.submission_id}"
            state = await client.get(prefix)
            result = await client.get(prefix + "/result")
            retry = await client.post(prefix + "/retry")
    finally:
        app.dependency_overrides.clear()
    assert state.status_code == 200 and state.json()["error_message"].startswith("WRITING_INPUT_REJECTED:")
    assert result.status_code == 409 and retry.status_code == 422
