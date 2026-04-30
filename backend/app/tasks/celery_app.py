from __future__ import annotations

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "primescore",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.tasks"],
)

celery_app.conf.update(
    task_default_queue="default",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "primescore.run_admin_ai_job": {"queue": "admin_ai"},
        "primescore.score_attempt": {"queue": "default"},
        "primescore.refresh_leaderboard": {"queue": "default"},
        "primescore.aggregate_analytics_daily": {"queue": "heavy"},
        "primescore.send_telegram_notification": {"queue": "notifications"},
        "primescore.process_audio_upload": {"queue": "heavy"},
        "primescore.cleanup_abandoned_attempts": {"queue": "default"},
    },
    beat_schedule={
        "refresh-leaderboard-hourly": {
            "task": "primescore.refresh_leaderboard",
            "schedule": 60 * 60,
        },
        "aggregate-analytics-nightly": {
            "task": "primescore.aggregate_analytics_daily",
            "schedule": 60 * 60 * 24,
        },
        "cleanup-abandoned-attempts-nightly": {
            "task": "primescore.cleanup_abandoned_attempts",
            "schedule": 60 * 60 * 24,
        },
    },
    timezone=settings.timezone,
)
