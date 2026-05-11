from __future__ import annotations

from uuid import UUID

import pytest

import app.services.writing_dispatch as writing_dispatch


SUBMISSION_ID = UUID("aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb")


@pytest.mark.asyncio
async def test_dispatch_writing_grading_uses_inline_scheduler(monkeypatch: pytest.MonkeyPatch) -> None:
    scheduled: list[UUID] = []

    async def fake_schedule(submission_id: UUID) -> None:
        scheduled.append(submission_id)

    monkeypatch.setattr(writing_dispatch, "_should_use_celery", lambda: False)
    monkeypatch.setattr(writing_dispatch, "_schedule_background_grading", fake_schedule)

    task_id = await writing_dispatch.dispatch_writing_grading(SUBMISSION_ID)

    assert task_id is None
    assert scheduled == [SUBMISSION_ID]


@pytest.mark.asyncio
async def test_dispatch_writing_grading_uses_celery_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(writing_dispatch, "_should_use_celery", lambda: True)

    class _AsyncResult:
        id = "celery-task-123"

    class _Task:
        def delay(self, submission_id: str) -> _AsyncResult:
            assert submission_id == str(SUBMISSION_ID)
            return _AsyncResult()

    monkeypatch.setattr(writing_dispatch, "evaluate_writing_submission_task", _Task())

    task_id = await writing_dispatch.dispatch_writing_grading(SUBMISSION_ID)

    assert task_id == "celery-task-123"
