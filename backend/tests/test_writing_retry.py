from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import pytest

from app.api.routes import writing as writing_routes
from app.models.enums import WritingSubmissionStatus, WritingTaskType
from app.models.writing import WritingSubmission
from app.schemas.common import DebugPrincipal


class _FakeSession:
    def __init__(self, submission: WritingSubmission | None) -> None:
        self.submission = submission
        self.commits = 0

    async def get(self, _model: object, identity: object) -> WritingSubmission | None:
        if self.submission is None:
            return None
        return self.submission if self.submission.id == identity else None

    async def commit(self) -> None:
        self.commits += 1


@pytest.mark.asyncio
async def test_retry_failed_writing_submission_requeues_and_dispatches(monkeypatch: pytest.MonkeyPatch) -> None:
    user = DebugPrincipal(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        first_name="Prime",
        last_name="User",
        username="prime_user",
        phone="+998901234567",
        role="user",
        is_premium=True,
        show_on_leaderboard=True,
    )
    submission = WritingSubmission(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        user_id=user.id,
        task_id=UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        task_type=WritingTaskType.TASK_2,
        essay_text="Retry me",
        word_count=120,
        essay_hash="hash",
        status=WritingSubmissionStatus.FAILED,
        submitted_at=datetime(2026, 5, 10, tzinfo=UTC),
        time_spent_seconds=123,
        error_message="grader exploded",
    )
    session = _FakeSession(submission)
    dispatched: list[UUID] = []

    async def fake_dispatch(submission_id: UUID) -> str:
        dispatched.append(submission_id)
        return "task-123"

    monkeypatch.setattr(writing_routes, "_dispatch_writing_retry", fake_dispatch)

    response = await writing_routes.retry_submission(
        submission_id=submission.id,
        current_user=user,
        session=session,
    )

    assert response.id == submission.id
    assert response.status == WritingSubmissionStatus.QUEUED
    assert submission.status == WritingSubmissionStatus.QUEUED
    assert submission.error_message is None
    assert submission.celery_task_id == "task-123"
    assert session.commits == 2
    assert dispatched == [submission.id]
