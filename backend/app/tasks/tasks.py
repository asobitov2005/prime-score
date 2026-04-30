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
