from __future__ import annotations

from celery import Task
from typing import Any

from app.services.admin_ai_agent import run_admin_ai_job
from app.tasks.celery_app import celery_app


@celery_app.task(
    bind=True,
    name="primescore.run_admin_ai_job",
    acks_late=True,
)
def run_admin_ai_job_task(self: Task[Any, Any], job_id: str) -> dict[str, Any]:
    run_admin_ai_job(job_id)
    return {"job_id": job_id, "status": "completed"}


@celery_app.task(name="primescore.score_attempt")
def score_attempt(attempt_id: str) -> dict[str, Any]:
    return {"attempt_id": attempt_id, "status": "queued"}


@celery_app.task(name="primescore.refresh_leaderboard")
def refresh_leaderboard() -> dict[str, Any]:
    return {"status": "ok", "refreshed": True}


@celery_app.task(name="primescore.aggregate_analytics_daily")
def aggregate_analytics_daily() -> dict[str, Any]:
    return {"status": "ok", "aggregated": True}


@celery_app.task(name="primescore.check_premium_expiring")
def check_premium_expiring() -> dict[str, Any]:
    return {"status": "ok"}


@celery_app.task(name="primescore.send_telegram_notification")
def send_telegram_notification(user_id: str, notification_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {"user_id": user_id, "notification_type": notification_type, "payload": payload}


@celery_app.task(name="primescore.process_audio_upload")
def process_audio_upload(audio_id: str) -> dict[str, Any]:
    return {"audio_id": audio_id, "status": "queued"}


@celery_app.task(name="primescore.cleanup_abandoned_attempts")
def cleanup_abandoned_attempts() -> dict[str, Any]:
    return {"status": "ok", "cleaned": True}


@celery_app.task(
    name="primescore.evaluate_writing_submission",
    bind=True,
    acks_late=True,
    max_retries=2,
    default_retry_delay=15,
)
def evaluate_writing_submission_task(self: Task[Any, Any], submission_id: str) -> dict[str, Any]:
    import asyncio
    from uuid import UUID

    from app.services.writing_checker import grade_submission

    asyncio.run(grade_submission(UUID(submission_id)))
    return {"submission_id": submission_id, "status": "completed"}


@celery_app.task(
    name="primescore.generate_writing_task_image_summary",
    bind=True,
    acks_late=True,
    max_retries=2,
)
def generate_writing_task_image_summary_task(self: Task[Any, Any], task_id: str) -> dict[str, Any]:
    import asyncio
    from uuid import UUID

    from app.services.writing_image_summary import refresh_task_image_summary

    asyncio.run(refresh_task_image_summary(UUID(task_id)))
    return {"task_id": task_id, "status": "completed"}


@celery_app.task(name="primescore.expire_stale_invoices")
def expire_stale_invoices() -> dict[str, Any]:
    """Expire pending payment invoices past their 10-minute TTL."""
    import asyncio
    from app.db.session import get_session_maker, reset_session_state
    from app.services.payment_service import expire_stale_payments

    async def _run() -> int:
        session_maker = get_session_maker()
        async with session_maker() as session:
            count = await expire_stale_payments(session)
            if count:
                await session.commit()
            return count

    reset_session_state()
    try:
        expired_count = asyncio.run(_run())
    finally:
        reset_session_state()
    return {"status": "ok", "expired": expired_count}
