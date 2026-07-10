from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_ai_agent_dependencies import *
from app.services.admin_ai_agent_part_01 import _STALE_LEGACY_JOB_SECONDS, _now
from app.services.admin_ai_agent_part_08 import _mark_admin_ai_job_failed, _run_admin_ai_job_once

def run_admin_ai_job(job_id: str | UUID) -> None:
    job_uuid = UUID(str(job_id))
    reset_session_state()
    try:
        asyncio.run(_run_admin_ai_job_once(job_uuid))
    except Exception as exc:
        reset_session_state()
        message = "Model request timed out." if isinstance(exc, asyncio.TimeoutError) else str(exc)
        asyncio.run(_mark_admin_ai_job_failed(job_uuid, message))
        raise

async def resume_pending_admin_ai_jobs() -> None:
    from app.tasks.celery_app import celery_app

    session_maker = get_session_maker()
    async with session_maker() as session:
        pending_jobs = list(
            (
                await session.scalars(
                    select(AdminAiJob).where(
                        AdminAiJob.status.in_([AdminAiJobStatus.QUEUED, AdminAiJobStatus.RUNNING])
                    )
                )
            ).all()
        )
        for job in pending_jobs:
            thread = await session.get(AdminAiThread, job.thread_id)
            if thread is None:
                continue

            next_status: AdminAiJobStatus | None = None
            next_error: str | None = None
            if (job.broker_task_id or "").strip():
                state = await asyncio.to_thread(lambda: celery_app.AsyncResult(job.broker_task_id or "").state)
                if state == "REVOKED":
                    next_status = AdminAiJobStatus.CANCELED
                    next_error = "Cancelled by admin."
                elif state == "FAILURE":
                    next_status = AdminAiJobStatus.FAILED
                    next_error = "Celery worker failed before the admin AI job could finish."
            else:
                age_seconds = (_now() - (job.updated_at or job.created_at)).total_seconds()
                if age_seconds >= _STALE_LEGACY_JOB_SECONDS:
                    next_status = AdminAiJobStatus.FAILED
                    next_error = "Legacy in-process admin AI job lost its worker. Retry the job."

            if next_status is None:
                continue

            job.status = next_status
            job.error_message = next_error
            job.finished_at = _now()
            thread.last_job_status = next_status
            thread.summary = (next_error or thread.summary or "")[:240]
            thread.updated_at = _now()

        await session.commit()
