from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.admin_ai_dependencies import *
from app.api.routes.admin_ai_part_01 import _load_thread_owned, _now, _serialize_thread_detail

router = APIRouter()

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
