from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from app.core.config import get_settings
from app.services.writing_checker import grade_submission
from app.tasks.tasks import evaluate_writing_submission_task


logger = logging.getLogger(__name__)


def _should_use_celery() -> bool:
    return (get_settings().environment or "").strip().lower() == "production"


async def _run_inline_grading(submission_id: UUID) -> None:
    try:
        await grade_submission(submission_id)
    except Exception:  # noqa: BLE001
        logger.exception("Inline writing grading failed for %s", submission_id)


async def _schedule_background_grading(submission_id: UUID) -> None:
    asyncio.create_task(_run_inline_grading(submission_id))


async def dispatch_writing_grading(submission_id: UUID) -> str | None:
    if _should_use_celery():
        result = evaluate_writing_submission_task.delay(str(submission_id))
        return result.id

    await _schedule_background_grading(submission_id)
    return None
