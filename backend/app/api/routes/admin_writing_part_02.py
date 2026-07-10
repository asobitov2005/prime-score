from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.admin_writing_dependencies import *
from app.api.routes.admin_writing_part_01 import AdminWritingUploadImageResponse, _enqueue_image_summary, _serialize_task_read

router = APIRouter()

async def create_task(
    payload: AdminWritingTaskCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskRead:
    has_image = bool(payload.image_url) and payload.task_type == WritingTaskType.TASK_1
    image_summary_status = "pending" if has_image else "not_required"

    task = WritingTask(
        title=payload.title,
        task_type=payload.task_type,
        prompt_html=payload.prompt_html,
        image_storage_path=payload.image_url if has_image else None,
        image_summary=None,
        image_summary_status=image_summary_status,
        word_minimum=payload.word_minimum,
        time_limit_seconds=payload.time_limit_seconds,
        difficulty=payload.difficulty,
        status=payload.status,
        source=payload.source,
        question_subtype=payload.question_subtype,
        description=payload.description,
        sample_band=payload.sample_band,
        sample_answer=payload.sample_answer,
        created_by=current_admin.id,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)

    if has_image:
        _enqueue_image_summary(task.id)

    return _serialize_task_read(task)

async def update_task(
    task_id: UUID,
    payload: AdminWritingTaskUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskRead:
    _ = current_admin
    task = await session.get(WritingTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")

    data = payload.model_dump(exclude_unset=True)
    if "question_subtype" in payload.model_fields_set and payload.question_subtype is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question subtype is required.",
        )

    image_changed = False
    new_image_url = data.pop("image_url", None) if "image_url" in data else None
    if "image_url" in payload.model_fields_set:
        new_image_url = payload.image_url
        if (new_image_url or None) != (task.image_storage_path or None):
            task.image_storage_path = new_image_url or None
            image_changed = True

    for field, value in data.items():
        if hasattr(task, field):
            setattr(task, field, value)

    if task.question_subtype is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question subtype is required.",
        )

    should_regen = (
        image_changed
        and bool(task.image_storage_path)
        and task.task_type == WritingTaskType.TASK_1
    )
    if should_regen:
        task.image_summary_status = "pending"
        task.image_summary = None
    elif image_changed and not task.image_storage_path:
        task.image_summary_status = "not_required"
        task.image_summary = None

    await session.commit()
    await session.refresh(task)

    if should_regen:
        _enqueue_image_summary(task.id)

    return _serialize_task_read(task)

async def delete_task(
    task_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    _ = current_admin
    task = await session.get(WritingTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")

    submission_count = await session.scalar(
        select(func.count())
        .select_from(WritingSubmission)
        .where(WritingSubmission.task_id == task_id)
    ) or 0
    if submission_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete task with existing submissions; archive instead.",
        )

    await session.delete(task)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

async def publish_task(
    task_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskRead:
    _ = current_admin
    task = await session.get(WritingTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    if task.question_subtype is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question subtype is required before publishing.",
        )
    task.status = WritingTaskStatus.PUBLISHED
    await session.commit()
    await session.refresh(task)
    return _serialize_task_read(task)

async def archive_task(
    task_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskRead:
    _ = current_admin
    task = await session.get(WritingTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    task.status = WritingTaskStatus.ARCHIVED
    await session.commit()
    await session.refresh(task)
    return _serialize_task_read(task)

async def regenerate_image_summary(
    task_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    _ = current_admin
    task = await session.get(WritingTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    if not task.image_storage_path:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task does not have an image to summarize.",
        )
    task.image_summary_status = "pending"
    await session.commit()
    _enqueue_image_summary(task.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

async def upload_image(
    file: UploadFile = File(...),
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminWritingUploadImageResponse:
    _ = current_admin
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed.",
        )

    payload = await file.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty.",
        )
    if len(payload) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size must be under 10 MB.",
        )

    try:
        url = upload_test_diagram_image(
            content=payload,
            filename=file.filename or "writing-image",
            content_type=file.content_type or "application/octet-stream",
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return AdminWritingUploadImageResponse(url=url)
