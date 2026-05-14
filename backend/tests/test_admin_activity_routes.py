from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.api.routes import admin as admin_routes
from app.api.routes import admin_writing as admin_writing_routes
from app.core import enums as core_enums
from app.models.enums import WritingSubmissionStatus, WritingTaskType
from app.models.user import User
from app.models.writing import WritingEvaluation, WritingSubmission, WritingTask
from app.schemas.common import AdminPrincipal
from app.services.runtime_store import AttemptRuntime


class _FakeExecuteResult:
    def __init__(self, *, first=None, rows=None) -> None:
        self._first = first
        self._rows = rows or []

    def first(self):
        return self._first

    def all(self):
        return self._rows


class _FakeSession:
    def __init__(self, *, first_row=None, rows=None) -> None:
        self.first_row = first_row
        self.rows = rows or []

    async def execute(self, _statement):
        if self.first_row is not None:
            return _FakeExecuteResult(first=self.first_row)
        return _FakeExecuteResult(rows=self.rows)


def _admin_principal() -> AdminPrincipal:
    return AdminPrincipal(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        username="admin",
        email="admin@example.com",
        role=core_enums.UserRole.admin,
        is_active=True,
    )


def _user(*, premium: bool) -> User:
    return User(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        telegram_id=123456789,
        first_name="Prime",
        last_name="User",
        username="prime_user",
        phone="+998901234567",
        is_premium=premium,
        show_on_leaderboard=True,
    )


def _writing_bundle():
    task = WritingTask(
        id=UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        title="Task title",
        task_type=WritingTaskType.TASK_2,
        prompt_html="<p>Prompt</p>",
        word_minimum=250,
        time_limit_seconds=2400,
    )
    submission = WritingSubmission(
        id=UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
        user_id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        task_id=task.id,
        task_type=WritingTaskType.TASK_2,
        essay_text="This is the essay text.",
        word_count=261,
        essay_hash="essay-hash",
        status=WritingSubmissionStatus.COMPLETED,
        submitted_at=datetime(2026, 5, 14, 8, 0, tzinfo=UTC),
        time_spent_seconds=1800,
    )
    evaluation = WritingEvaluation(
        id=UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
        submission_id=submission.id,
        task_achievement_band=6.0,
        coherence_band=6.5,
        lexical_band=6.0,
        grammar_band=6.0,
        overall_band=6.0,
        potential_band=6.5,
        word_count_penalty=0.0,
        feedback={
            "overall_summary": "Stable summary.",
            "next_steps": ["Keep structure tighter.", "Use more precise examples."],
            "task_achievement": {"band": 6.0, "summary": "Addresses the task."},
            "coherence": {"band": 6.5, "summary": "Mostly clear flow."},
            "lexical": {"band": 6.0, "summary": "Adequate vocabulary."},
            "grammar": {"band": 6.0, "summary": "Some sentence errors."},
            "vocabulary_suggestions": [
                {
                    "current_phrase": "very good",
                    "improved_phrase": "highly effective",
                    "level": "B2",
                    "why_it_works": "More precise",
                    "example_sentence": "It was highly effective.",
                }
            ],
        },
        inline_annotations=[
            {
                "offset": 0,
                "length": 4,
                "original": "This",
                "replacements": ["The essay"],
                "category": "grammar",
                "short_message": "Clearer noun phrase.",
            }
        ],
        improved_version="Improved essay text.",
        roast_feedback={
            "one_liner": "Needs sharper support.",
            "overall_roast": "Mild roast.",
            "savage_tips": ["Add concrete examples."],
        },
        model_version="google/gemini-2.5-flash",
        prompt_version="db-v1",
        grader_profile_version=2,
        rubric_version=1,
        anchor_set_version=1,
        roast_profile_version=2,
        improved_profile_version=2,
        annotation_profile_version=2,
        cache_hit=False,
        graded_at=datetime(2026, 5, 14, 8, 5, tzinfo=UTC),
    )
    return task, submission, evaluation


@pytest.mark.asyncio
async def test_admin_writing_get_submission_returns_full_result_payload() -> None:
    user = _user(premium=True)
    task, submission, evaluation = _writing_bundle()
    session = _FakeSession(first_row=(submission, task, evaluation, user))

    payload = await admin_writing_routes.get_submission(
        submission_id=submission.id,
        current_admin=_admin_principal(),
        session=session,
    )

    assert payload.user_display_name == "Prime User"
    assert payload.overall_band == 6.0
    assert payload.evaluation is not None
    assert payload.evaluation.overall_summary == "Stable summary."
    assert payload.evaluation.next_steps == ["Keep structure tighter.", "Use more precise examples."]
    assert payload.evaluation.vocabulary_suggestions[0].improved_phrase == "highly effective"
    assert payload.evaluation.grader_profile_version == 2


@pytest.mark.asyncio
async def test_admin_user_activity_includes_attempts_and_writing_with_user_visibility(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _user(premium=False)
    task, submission, evaluation = _writing_bundle()
    session = _FakeSession(rows=[(submission, task, evaluation)])

    attempt = AttemptRuntime(
        attempt_id=UUID("ffffffff-ffff-ffff-ffff-ffffffffffff"),
        user_id=user.id,
        test_id=UUID("11111111-2222-3333-4444-555555555555"),
        test_version=1,
        scope=core_enums.TestScope.full,
        section_id=None,
        mode=core_enums.TestMode.practice,
        status=core_enums.AttemptStatus.completed,
    )
    attempt.started_at = datetime(2026, 5, 14, 7, 0, tzinfo=UTC)
    attempt.completed_at = datetime(2026, 5, 14, 7, 30, tzinfo=UTC)
    attempt.time_spent_sec = 1800
    attempt.raw_score = 31
    attempt.total_questions = 40
    attempt.band_score = Decimal("7.0")
    attempt.test_snapshot = {
        "title": "Cambridge Reading",
        "test_type": core_enums.TestType.reading,
        "format": "full",
        "sections": [],
    }
    attempt.metadata = {"score_status": "ready"}
    attempt.answers = {"q1": "A"}
    attempt.scoring_items = [
        {
            "question_id": UUID("99999999-9999-9999-9999-999999999999"),
            "question_number": 1,
            "prompt": "Question prompt",
            "section_title": "Passage 1",
            "group_title": "Questions 1-10",
            "question_type": "reading_mc_single",
            "options": ["A", "B", "C"],
            "answer_value": "A",
            "is_correct": True,
            "correct_answers": ["A"],
            "explanation": "Because A matches the text.",
        }
    ]
    attempt.section_breakdown = [{"title": "Passage 1", "correct": 1, "total": 10}]
    attempt.question_type_breakdown = [{"question_type": "reading_mc_single", "correct": 1, "total": 1}]

    async def fake_get_user_or_404(_session, _user_id):
        return user

    async def fake_iter_user_attempts(_session, *, user_id):
        assert user_id == user.id
        return [attempt]

    monkeypatch.setattr(admin_routes, "_get_active_user_or_404", fake_get_user_or_404)
    monkeypatch.setattr(admin_routes, "iter_user_attempts_from_db", fake_iter_user_attempts)

    payload = await admin_routes.get_user_activity(
        user_id=user.id,
        current_admin=_admin_principal(),
        session=session,
    )

    assert len(payload.attempts) == 1
    assert payload.attempts[0].test_title == "Cambridge Reading"
    assert payload.attempts[0].band_score == Decimal("7.0")
    assert payload.attempts[0].review is not None
    assert payload.attempts[0].review.can_show_explanations is False
    assert payload.attempts[0].review.items[0].explanation is None
    assert len(payload.writing_submissions) == 1
    assert payload.writing_submissions[0].evaluation is not None
