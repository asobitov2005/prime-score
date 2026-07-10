from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.admin_ai_agent_dependencies import *
from app.services.admin_ai_agent_part_01 import _ADMIN_AI_CELERY_QUEUE, _ADMIN_AI_TASK_NAME, _normalize_message_text, _now, _thread_title_from_text
from app.services.admin_ai_agent_part_03 import _map_message, _map_thread_summary

def _map_job(job: AdminAiJob) -> dict[str, Any]:
    return {
        "id": job.id,
        "thread_id": job.thread_id,
        "status": job.status.value,
        "provider": job.provider,
        "model_name": job.model_name,
        "task_kind": job.task_kind,
        "error_message": job.error_message,
        "is_background": job.is_background,
        "tool_trace": list(job.tool_trace or []),
        "result_payload": dict(job.result_payload or {}),
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
    }

async def list_admin_ai_threads(session: AsyncSession, *, admin_id: UUID) -> list[dict[str, Any]]:
    items = list(
        (
            await session.scalars(
                select(AdminAiThread)
                .where(
                    AdminAiThread.admin_id == admin_id,
                    AdminAiThread.status == AdminAiThreadStatus.ACTIVE,
                )
                .order_by(AdminAiThread.updated_at.desc())
            )
        ).all()
    )
    return [_map_thread_summary(item) for item in items]

async def get_admin_ai_thread_detail(
    session: AsyncSession,
    *,
    admin_id: UUID,
    thread_id: UUID,
) -> dict[str, Any] | None:
    thread = await session.get(AdminAiThread, thread_id)
    if thread is None or thread.admin_id != admin_id:
        return None
    messages = list(
        (
            await session.scalars(
                select(AdminAiMessage)
                .where(AdminAiMessage.thread_id == thread_id)
                .order_by(AdminAiMessage.created_at.asc())
            )
        ).all()
    )
    jobs = list(
        (
            await session.scalars(
                select(AdminAiJob)
                .where(AdminAiJob.thread_id == thread_id)
                .order_by(AdminAiJob.created_at.desc())
            )
        ).all()
    )
    return {
        **_map_thread_summary(thread),
        "messages": [_map_message(item) for item in messages],
        "jobs": [_map_job(item) for item in jobs],
    }

async def create_admin_ai_thread(
    session: AsyncSession,
    *,
    admin: AdminPrincipal,
    title: str | None = None,
) -> AdminAiThread:
    resolved = await resolve_ai_use_case_config(session, AiUseCase.ADMIN_CHAT)
    thread = AdminAiThread(
        admin_id=admin.id,
        title=(title or "New AI task").strip() or "New AI task",
        provider=resolved.provider.value,
        model_name=resolved.model_id,
        task_kind="test_builder",
        status=AdminAiThreadStatus.ACTIVE,
        last_job_status=None,
        context={},
    )
    session.add(thread)
    await session.flush()
    return thread

async def append_admin_ai_message(
    session: AsyncSession,
    *,
    thread: AdminAiThread,
    admin: AdminPrincipal,
    role: AdminAiMessageRole,
    content: str,
    tool_calls: list[dict[str, Any]] | None = None,
    extra_payload: dict[str, Any] | None = None,
    update_thread_summary: bool = True,
    update_thread_title_from_user_message: bool = True,
) -> AdminAiMessage:
    message = AdminAiMessage(
        thread_id=thread.id,
        admin_id=admin.id,
        role=role,
        content=_normalize_message_text(content),
        tool_calls=tool_calls or [],
        extra_payload=extra_payload or {},
        created_at=_now(),
    )
    session.add(message)
    if update_thread_summary and message.content:
        thread.summary = message.content[:240]
    thread.updated_at = _now()
    if (
        update_thread_title_from_user_message
        and role == AdminAiMessageRole.USER
        and (not thread.title or thread.title == "New AI task")
    ):
        thread.title = _thread_title_from_text(message.content)
    await session.flush()
    return message

async def append_admin_ai_status_message(
    session: AsyncSession,
    *,
    thread: AdminAiThread,
    admin: AdminPrincipal,
    content: str,
) -> AdminAiMessage:
    return await append_admin_ai_message(
        session,
        thread=thread,
        admin=admin,
        role=AdminAiMessageRole.ASSISTANT,
        content=content,
        extra_payload={"kind": "status_update"},
        update_thread_summary=False,
        update_thread_title_from_user_message=False,
    )

async def create_admin_ai_job(
    session: AsyncSession,
    *,
    thread: AdminAiThread,
    admin: AdminPrincipal,
    user_message: AdminAiMessage,
) -> AdminAiJob:
    resolved = await resolve_ai_use_case_config(session, AiUseCase.ADMIN_CHAT)
    job = AdminAiJob(
        thread_id=thread.id,
        admin_id=admin.id,
        user_message_id=user_message.id,
        provider=resolved.provider.value,
        model_name=resolved.model_id,
        broker_task_id=None,
        task_kind="test_builder",
        status=AdminAiJobStatus.QUEUED,
        is_background=True,
        tool_trace=[],
        result_payload={},
    )
    session.add(job)
    thread.last_job_status = AdminAiJobStatus.QUEUED
    thread.summary = "Queued and waiting for a worker."
    thread.updated_at = _now()
    await session.flush()
    return job

async def schedule_admin_ai_job(session: AsyncSession, *, job_id: UUID) -> str:
    from app.tasks.celery_app import celery_app

    job = await session.get(AdminAiJob, job_id)
    if job is None:
        raise KeyError("job_not_found")

    async_result = await asyncio.to_thread(
        celery_app.send_task,
        _ADMIN_AI_TASK_NAME,
        kwargs={"job_id": str(job_id)},
        queue=_ADMIN_AI_CELERY_QUEUE,
    )
    job.broker_task_id = async_result.id
    payload = dict(job.result_payload or {})
    payload.update(
        {
            "broker": "celery",
            "broker_queue": _ADMIN_AI_CELERY_QUEUE,
            "broker_task_id": async_result.id,
        }
    )
    job.result_payload = payload
    job.updated_at = _now()
    await session.commit()
    return async_result.id

def cancel_active_admin_ai_job(job: AdminAiJob) -> bool:
    from app.tasks.celery_app import celery_app

    if not (job.broker_task_id or "").strip():
        return False
    celery_app.control.revoke(job.broker_task_id, terminate=True, signal="SIGTERM")
    return True

async def enqueue_admin_ai_message(
    session: AsyncSession,
    *,
    admin: AdminPrincipal,
    thread_id: UUID,
    content: str,
) -> dict[str, Any]:
    thread = await session.get(AdminAiThread, thread_id)
    if thread is None or thread.admin_id != admin.id:
        raise KeyError("thread_not_found")

    active_job = await session.scalar(
        select(AdminAiJob.id).where(
            AdminAiJob.thread_id == thread.id,
            AdminAiJob.status.in_([AdminAiJobStatus.QUEUED, AdminAiJobStatus.RUNNING]),
        )
    )
    if active_job is not None:
        raise ValueError("thread_job_already_running")

    message = await append_admin_ai_message(
        session,
        thread=thread,
        admin=admin,
        role=AdminAiMessageRole.USER,
        content=content,
    )
    job = await create_admin_ai_job(session, thread=thread, admin=admin, user_message=message)
    await session.commit()
    try:
        await schedule_admin_ai_job(session, job_id=job.id)
    except Exception as exc:
        await session.rollback()
        failed_job = await session.get(AdminAiJob, job.id)
        failed_thread = await session.get(AdminAiThread, thread.id)
        if failed_job is not None:
            failed_job.status = AdminAiJobStatus.FAILED
            failed_job.error_message = f"Failed to dispatch Celery job: {exc}"
            failed_job.finished_at = _now()
        if failed_thread is not None:
            failed_thread.last_job_status = AdminAiJobStatus.FAILED
            failed_thread.summary = "Failed to dispatch Celery job."
            failed_thread.updated_at = _now()
        await session.commit()
        raise RuntimeError("admin_ai_job_dispatch_failed") from exc
    return {
        "thread": _map_thread_summary(thread),
        "message": _map_message(message),
        "job": _map_job(job),
    }
