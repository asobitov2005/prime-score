from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4


@dataclass
class TranscriptJobState:
    id: str
    status: str
    created_at: str
    updated_at: str
    result: dict[str, Any] | None = None
    error: str | None = None
    task: asyncio.Task[None] | None = field(default=None, repr=False)


_TRANSCRIPT_JOBS: dict[str, TranscriptJobState] = {}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def create_transcript_job() -> TranscriptJobState:
    job = TranscriptJobState(
        id=str(uuid4()),
        status="queued",
        created_at=_now_iso(),
        updated_at=_now_iso(),
    )
    _TRANSCRIPT_JOBS[job.id] = job
    return job


def attach_transcript_job_task(job_id: str, task: asyncio.Task[None]) -> None:
    job = _TRANSCRIPT_JOBS[job_id]
    job.task = task
    job.updated_at = _now_iso()


def get_transcript_job(job_id: str) -> TranscriptJobState | None:
    return _TRANSCRIPT_JOBS.get(job_id)


def mark_transcript_job_running(job_id: str) -> None:
    job = _TRANSCRIPT_JOBS[job_id]
    job.status = "running"
    job.updated_at = _now_iso()


def mark_transcript_job_completed(job_id: str, result: dict[str, Any]) -> None:
    job = _TRANSCRIPT_JOBS[job_id]
    job.status = "completed"
    job.result = result
    job.updated_at = _now_iso()


def mark_transcript_job_failed(job_id: str, error: str) -> None:
    job = _TRANSCRIPT_JOBS[job_id]
    job.status = "failed"
    job.error = error
    job.updated_at = _now_iso()


def cancel_transcript_job(job_id: str) -> TranscriptJobState | None:
    job = _TRANSCRIPT_JOBS.get(job_id)
    if job is None:
        return None
    if job.status in {"completed", "failed", "cancelled"}:
        return job
    if job.task and not job.task.done():
        job.task.cancel()
    job.status = "cancelled"
    job.error = "Cancelled by admin."
    job.updated_at = _now_iso()
    return job
