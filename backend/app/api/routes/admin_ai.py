from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.ai import AdminAiJob, AdminAiMessage, AdminAiThread
from app.models.enums import AdminAiJobStatus, AdminAiThreadStatus
from app.schemas.admin_ai import (
    AdminAiConfigRead,
    AdminAiJobProgressRead,
    AdminAiJobRead,
    AdminAiMessageCreateRequest,
    AdminAiMessageRead,
    AdminAiThreadCreateRequest,
    AdminAiThreadDetailRead,
    AdminAiThreadSummaryRead,
    AdminAiThreadUpdateRequest,
    AdminAiToolTraceRead,
    AdminAiWorkspaceScopeRead,
)
from app.schemas.common import AdminPrincipal, MessageResponse
from app.services.admin_ai_agent import (
    archive_admin_ai_thread,
    cancel_active_admin_ai_job,
    create_admin_ai_thread,
    enqueue_admin_ai_message,
    get_admin_ai_config,
    resume_pending_admin_ai_jobs,
)

router = APIRouter()


def _now() -> datetime:
    return datetime.now(UTC)


def _scope_from_context(context: dict[str, Any] | None) -> AdminAiWorkspaceScopeRead:
    raw_scope = context.get("scope") if isinstance(context, dict) else None
    if not isinstance(raw_scope, dict):
        return AdminAiWorkspaceScopeRead()
    return AdminAiWorkspaceScopeRead(
        type=raw_scope.get("type") or "general",
        id=raw_scope.get("id") or None,
        label=(raw_scope.get("label") or "General workspace").strip() or "General workspace",
        description=(raw_scope.get("description") or "").strip() or None,
    )


def _job_status_label(status_value: AdminAiJobStatus) -> str:
    if status_value == AdminAiJobStatus.CANCELED:
        return "cancelled"
    return status_value.value


def _thread_status_label(thread: AdminAiThread, jobs: list[AdminAiJob]) -> str:
    if thread.status == AdminAiThreadStatus.ARCHIVED:
        return "archived"

    active_job = next((job for job in jobs if job.status in {AdminAiJobStatus.RUNNING, AdminAiJobStatus.QUEUED}), None)
    if active_job is not None:
        return _job_status_label(active_job.status)

    if jobs:
        latest = jobs[0]
        if latest.status == AdminAiJobStatus.COMPLETED:
            return "completed"
        if latest.status == AdminAiJobStatus.FAILED:
            return "failed"

    return "idle"


def _job_title(job: AdminAiJob, messages_by_id: dict[UUID, AdminAiMessage]) -> str:
    user_message = messages_by_id.get(job.user_message_id) if job.user_message_id else None
    if user_message and user_message.content.strip():
        text = " ".join(user_message.content.split())
        return text[:77] + "..." if len(text) > 80 else text
    return "AI workspace job"


def _job_summary(job: AdminAiJob) -> str:
    if job.error_message:
        return job.error_message
    result_preview = str((job.result_payload or {}).get("assistant_preview") or "").strip()
    if result_preview:
        return result_preview
    if job.status == AdminAiJobStatus.RUNNING:
        return "The model is working through the latest admin request."
    if job.status == AdminAiJobStatus.QUEUED:
        return "Queued and waiting to start."
    if job.status == AdminAiJobStatus.CANCELED:
        return "Cancelled before completion."
    return "Waiting for model output."


def _duration_ms(started_at: str | None, finished_at: str | None) -> int | None:
    if not started_at or not finished_at:
        return None
    try:
        started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        finished = datetime.fromisoformat(finished_at.replace("Z", "+00:00"))
    except ValueError:
        return None
    return max(0, int((finished - started).total_seconds() * 1000))


def _serialize_trace(trace: dict[str, Any]) -> AdminAiToolTraceRead:
    started_at = trace.get("started_at") or trace.get("created_at")
    finished_at = trace.get("finished_at") or trace.get("completed_at")
    raw_status = str(trace.get("status") or "pending")
    return AdminAiToolTraceRead(
        id=str(trace.get("id") or ""),
        label=str(trace.get("label") or trace.get("name") or trace.get("tool_name") or "Tool step"),
        tool_name=str(trace.get("tool_name") or trace.get("name") or "tool"),
        status="cancelled" if raw_status == "canceled" else raw_status,
        started_at=started_at,
        finished_at=finished_at,
        duration_ms=_duration_ms(started_at, finished_at),
        input_summary=(trace.get("input_summary") or trace.get("arguments") and str(trace.get("arguments")) or None),
        output_summary=(trace.get("output_summary") or trace.get("result_preview") or trace.get("error") or None),
    )


def _serialize_message(message: AdminAiMessage) -> AdminAiMessageRead:
    return AdminAiMessageRead(
        id=str(message.id),
        role=message.role.value,
        content=message.content or "",
        created_at=message.created_at,
        status="completed",
        author_label="You" if message.role.value == "user" else "PrimeScore AI",
        job_id=None,
        tool_name=None,
        error_message=None,
    )


def _serialize_job(job: AdminAiJob, messages_by_id: dict[UUID, AdminAiMessage]) -> AdminAiJobRead:
    traces = [_serialize_trace(trace) for trace in list(job.tool_trace or [])]
    completed_steps = len([trace for trace in traces if trace.status == "completed"])
    total_steps = len(traces)
    progress = None
    if total_steps > 0 or job.status in {AdminAiJobStatus.RUNNING, AdminAiJobStatus.QUEUED}:
        progress = AdminAiJobProgressRead(
            completed_steps=completed_steps,
            total_steps=max(total_steps, completed_steps),
            label="Tool progress" if total_steps else "Queued",
        )
    return AdminAiJobRead(
        id=job.id,
        title=_job_title(job, messages_by_id),
        status=_job_status_label(job.status),
        kind="generation" if job.task_kind == "test_builder" else "chat",
        summary=_job_summary(job),
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
        model=job.model_name,
        error_message=job.error_message,
        progress=progress,
        traces=traces,
    )


def _sort_messages(messages: list[AdminAiMessageRead]) -> list[AdminAiMessageRead]:
    return sorted(messages, key=lambda message: message.created_at)


async def _load_thread_owned(
    session: AsyncSession,
    *,
    admin_id: UUID,
    thread_id: UUID,
) -> tuple[AdminAiThread, list[AdminAiMessage], list[AdminAiJob]]:
    thread = await session.scalar(
        select(AdminAiThread)
        .where(AdminAiThread.id == thread_id)
        .execution_options(populate_existing=True)
    )
    if thread is None or thread.admin_id != admin_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI thread not found.")

    messages = list(
        (
            await session.scalars(
                select(AdminAiMessage)
                .where(AdminAiMessage.thread_id == thread.id)
                .order_by(AdminAiMessage.created_at.asc())
            )
        ).all()
    )
    jobs = list(
        (
            await session.scalars(
                select(AdminAiJob)
                .where(AdminAiJob.thread_id == thread.id)
                .order_by(AdminAiJob.created_at.desc())
            )
        ).all()
    )
    return thread, messages, jobs


async def _serialize_thread_detail(
    session: AsyncSession,
    *,
    admin_id: UUID,
    thread_id: UUID,
) -> AdminAiThreadDetailRead:
    thread, messages, jobs = await _load_thread_owned(session, admin_id=admin_id, thread_id=thread_id)
    scope = _scope_from_context(thread.context)
    messages_by_id = {message.id: message for message in messages}
    serialized_jobs = [_serialize_job(job, messages_by_id) for job in jobs]
    active_job = next((job for job in jobs if job.status in {AdminAiJobStatus.RUNNING, AdminAiJobStatus.QUEUED}), None)
    active_job_id = str(active_job.id) if active_job else None

    serialized_messages = [_serialize_message(message) for message in messages]
    if active_job and active_job.assistant_message_id is None:
      serialized_messages.append(
          AdminAiMessageRead(
              id=f"pending-{active_job.id}",
              role="assistant",
              content="",
              created_at=active_job.updated_at,
              status="pending",
              author_label="PrimeScore AI",
              job_id=str(active_job.id),
              tool_name=None,
              error_message=None,
          )
      )

    last_message = next((message for message in reversed(messages) if message.content.strip()), None)
    summary = (thread.summary or "").strip() or (last_message.content.strip() if last_message else "") or "No summary yet."
    last_preview = (last_message.content.strip() if last_message else "") or summary or "No messages yet."

    return AdminAiThreadDetailRead(
        id=thread.id,
        title=thread.title,
        summary=summary,
        status=_thread_status_label(thread, jobs),
        updated_at=thread.updated_at,
        created_at=thread.created_at,
        message_count=len(messages),
        last_message_preview=last_preview[:240],
        active_job_id=active_job_id,
        scope=scope,
        messages=_sort_messages(serialized_messages),
        jobs=serialized_jobs,
    )


async def _serialize_thread_summary(
    session: AsyncSession,
    *,
    admin_id: UUID,
    thread_id: UUID,
) -> AdminAiThreadSummaryRead:
    detail = await _serialize_thread_detail(session, admin_id=admin_id, thread_id=thread_id)
    return AdminAiThreadSummaryRead.model_validate(detail.model_dump())


@router.get("/ai/config", response_model=AdminAiConfigRead)
async def read_admin_ai_config(current_admin: AdminPrincipal = Depends(get_current_admin)) -> AdminAiConfigRead:
    _ = current_admin
    return AdminAiConfigRead.model_validate(get_admin_ai_config())


@router.get("/ai/threads", response_model=list[AdminAiThreadSummaryRead])
async def list_ai_threads(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminAiThreadSummaryRead]:
    await resume_pending_admin_ai_jobs()
    thread_ids = list(
        (
            await session.scalars(
                select(AdminAiThread.id)
                .where(
                    AdminAiThread.admin_id == current_admin.id,
                    AdminAiThread.status == AdminAiThreadStatus.ACTIVE,
                )
                .order_by(AdminAiThread.updated_at.desc())
            )
        ).all()
    )
    return [
        await _serialize_thread_summary(session, admin_id=current_admin.id, thread_id=thread_id)
        for thread_id in thread_ids
    ]


@router.post("/ai/threads", response_model=AdminAiThreadDetailRead, status_code=status.HTTP_201_CREATED)
async def create_ai_thread(
    payload: AdminAiThreadCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiThreadDetailRead:
    thread = await create_admin_ai_thread(session, admin=current_admin, title=payload.title)
    if payload.scope is not None:
        thread.context = {"scope": payload.scope.model_dump(exclude_none=True)}
    thread_id = thread.id
    await session.commit()
    return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)


@router.get("/ai/threads/{thread_id}", response_model=AdminAiThreadDetailRead)
async def get_ai_thread(
    thread_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiThreadDetailRead:
    await resume_pending_admin_ai_jobs()
    return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)


@router.patch("/ai/threads/{thread_id}", response_model=AdminAiThreadDetailRead)
async def update_ai_thread(
    thread_id: UUID,
    payload: AdminAiThreadUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiThreadDetailRead:
    thread = await session.get(AdminAiThread, thread_id)
    if thread is None or thread.admin_id != current_admin.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI thread not found.")

    if payload.title is not None:
        thread.title = payload.title.strip() or thread.title
    if payload.status == "archived":
        thread.status = AdminAiThreadStatus.ARCHIVED
    thread.updated_at = _now()
    await session.commit()
    return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)


@router.delete("/ai/threads/{thread_id}", response_model=MessageResponse)
async def delete_ai_thread(
    thread_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    archived = await archive_admin_ai_thread(session, admin_id=current_admin.id, thread_id=thread_id)
    if not archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI thread not found.")
    return MessageResponse(message="Thread archived.")


@router.post("/ai/threads/{thread_id}/messages", response_model=AdminAiThreadDetailRead)
async def send_ai_message(
    thread_id: UUID,
    payload: AdminAiMessageCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiThreadDetailRead:
    thread = await session.get(AdminAiThread, thread_id)
    if thread is None or thread.admin_id != current_admin.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI thread not found.")

    if payload.scope is not None:
        context = dict(thread.context or {})
        context["scope"] = payload.scope.model_dump(exclude_none=True)
        thread.context = context
        thread.updated_at = _now()
        await session.flush()

    try:
        await enqueue_admin_ai_message(
            session,
            admin=current_admin,
            thread_id=thread_id,
            content=payload.content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI thread not found.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)


@router.post("/ai/threads/{thread_id}/jobs/{job_id}/retry", response_model=AdminAiThreadDetailRead)
async def retry_ai_job(
    thread_id: UUID,
    job_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiThreadDetailRead:
    thread, _, jobs = await _load_thread_owned(session, admin_id=current_admin.id, thread_id=thread_id)
    job = next((item for item in jobs if item.id == job_id), None)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI job not found.")
    if any(item.status in {AdminAiJobStatus.QUEUED, AdminAiJobStatus.RUNNING} for item in jobs if item.id != job_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Another AI job is already running.")
    if job.user_message_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This AI job cannot be retried.")

    original_user_message = await session.get(AdminAiMessage, job.user_message_id)
    if original_user_message is None or not original_user_message.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This AI job cannot be retried.")

    context = dict(thread.context or {})
    thread.context = context
    await session.flush()
    await enqueue_admin_ai_message(
        session,
        admin=current_admin,
        thread_id=thread_id,
        content=original_user_message.content,
    )
    return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)


@router.post("/ai/threads/{thread_id}/jobs/{job_id}/cancel", response_model=AdminAiThreadDetailRead)
async def cancel_ai_job(
    thread_id: UUID,
    job_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiThreadDetailRead:
    thread, _, jobs = await _load_thread_owned(session, admin_id=current_admin.id, thread_id=thread_id)
    job = next((item for item in jobs if item.id == job_id), None)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI job not found.")

    if job.status not in {AdminAiJobStatus.QUEUED, AdminAiJobStatus.RUNNING}:
        return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)

    cancel_active_admin_ai_job(job)
    job.status = AdminAiJobStatus.CANCELED
    job.error_message = "Cancelled by admin."
    job.finished_at = _now()
    thread.last_job_status = AdminAiJobStatus.CANCELED
    thread.updated_at = _now()
    await session.commit()
    return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)
