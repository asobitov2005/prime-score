from __future__ import annotations

import os

from celery import Celery
from celery.signals import worker_process_init

from app.core.config import get_settings
from app.db.session import reset_session_state

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
    # Keep beat state out of the bind-mounted repo tree so the appuser inside
    # the container can always read/write it.
    beat_schedule_filename=os.getenv(
        "CELERY_BEAT_SCHEDULE_FILENAME",
        "/tmp/primescore-celerybeat-schedule",
    ),
    task_routes={
        "primescore.run_admin_ai_job": {"queue": "admin_ai"},
        "primescore.score_attempt": {"queue": "default"},
        "primescore.refresh_leaderboard": {"queue": "default"},
        "primescore.aggregate_analytics_daily": {"queue": "heavy"},
        "primescore.send_telegram_notification": {"queue": "notifications"},
        "primescore.process_audio_upload": {"queue": "heavy"},
        "primescore.cleanup_abandoned_attempts": {"queue": "default"},
        "primescore.expire_stale_invoices": {"queue": "default"},
        "primescore.evaluate_writing_submission": {"queue": "writing"},
        "primescore.generate_writing_task_image_summary": {"queue": "writing"},
        "primescore.generate_test_explanations": {"queue": "heavy"},
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
        "expire-stale-invoices": {
            "task": "primescore.expire_stale_invoices",
            "schedule": 30,
        },
    },
    timezone=settings.timezone,
)


@worker_process_init.connect
def reset_db_state_after_fork(**_: object) -> None:
    reset_session_state()
