from __future__ import annotations

from uuid import UUID

import pytest

import app.services.writing_dispatch as writing_dispatch


SUBMISSION_ID = UUID("aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb")


@pytest.mark.asyncio
async def test_dispatch_writing_grading_enqueues_celery_task(monkeypatch: pytest.MonkeyPatch) -> None:
    class _AsyncResult:
        id = "celery-task-123"

    class _Task:
        def delay(self, submission_id: str) -> _AsyncResult:
            assert submission_id == str(SUBMISSION_ID)
            return _AsyncResult()

    monkeypatch.setattr(writing_dispatch, "evaluate_writing_submission_task", _Task())

    task_id = await writing_dispatch.dispatch_writing_grading(SUBMISSION_ID)

    assert task_id == "celery-task-123"
