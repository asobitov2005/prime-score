from __future__ import annotations

from uuid import UUID

from app.tasks.tasks import evaluate_writing_submission_task


async def dispatch_writing_grading(submission_id: UUID) -> str | None:
    result = evaluate_writing_submission_task.delay(str(submission_id))
    return result.id
