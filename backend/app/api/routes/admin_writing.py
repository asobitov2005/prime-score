from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.enums import WritingQuestionSubtype, WritingSubmissionStatus, WritingTaskStatus, WritingTaskType
from app.models.user import User
from app.models.writing import WritingEvaluation, WritingSubmission, WritingTask
from app.schemas.common import AdminPrincipal
from app.schemas.writing import (
    AdminWritingTaskCreateRequest,
    AdminWritingTaskUpdateRequest,
    WritingTaskRead,
)
from app.services.object_storage import upload_test_diagram_image


router = APIRouter()


class AdminWritingTaskListResponse(BaseModel):
    items: list[WritingTaskRead]
    total: int


class AdminWritingUploadImageResponse(BaseModel):
    url: str


class AdminWritingSubmissionItem(BaseModel):
    id: UUID
    user_id: UUID
    user_display_name: str | None = None
    task_id: UUID
    task_title: str
    task_type: WritingTaskType
    word_count: int
    status: WritingSubmissionStatus
    overall_band: float | None = None
    submitted_at: datetime
    graded_at: datetime | None = None


class AdminWritingSubmissionListResponse(BaseModel):
    items: list[AdminWritingSubmissionItem]
    total: int


def _serialize_task_read(task: WritingTask) -> WritingTaskRead:
    return WritingTaskRead(
        id=task.id,
        title=task.title,
        task_type=task.task_type,
        prompt_html=task.prompt_html,
        image_url=task.image_storage_path,
        image_summary=task.image_summary,
        image_summary_status=task.image_summary_status,
        word_minimum=task.word_minimum,
        time_limit_seconds=task.time_limit_seconds,
        difficulty=task.difficulty,
        status=task.status,
        source=task.source,
        question_subtype=task.question_subtype.value if task.question_subtype else None,
        description=task.description,
        sample_band=task.sample_band,
        created_at=task.created_at,
    )


def _resolve_user_display_name(user: User | None) -> str | None:
    if user is None:
        return None
    parts = [part.strip() for part in [user.first_name, user.last_name] if part and part.strip()]
    name = " ".join(parts) if parts else None
    if name:
        return name
    return user.username


def _enqueue_image_summary(task_id: UUID) -> None:
    from app.tasks.tasks import generate_writing_task_image_summary_task

    generate_writing_task_image_summary_task.delay(str(task_id))


@router.get("/tasks", response_model=AdminWritingTaskListResponse)
async def list_tasks(
    status_filter: WritingTaskStatus | None = Query(default=None, alias="status"),
    task_type: WritingTaskType | None = Query(default=None),
    question_subtype: WritingQuestionSubtype | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingTaskListResponse:
    _ = current_admin
    filters = []
    if status_filter is not None:
        filters.append(WritingTask.status == status_filter)
    if task_type is not None:
        filters.append(WritingTask.task_type == task_type)
    if question_subtype is not None:
        filters.append(WritingTask.question_subtype == question_subtype)
    if search:
        like = f"%{search.strip()}%"
        filters.append(WritingTask.title.ilike(like))

    total = await session.scalar(
        select(func.count()).select_from(WritingTask).where(*filters)
    ) or 0

    rows = (
        await session.scalars(
            select(WritingTask)
            .where(*filters)
            .order_by(WritingTask.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    return AdminWritingTaskListResponse(
        items=[_serialize_task_read(t) for t in rows],
        total=int(total),
    )


@router.get("/tasks/{task_id}", response_model=WritingTaskRead)
async def get_task(
    task_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskRead:
    _ = current_admin
    task = await session.get(WritingTask, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    return _serialize_task_read(task)


@router.post(
    "/tasks",
    response_model=WritingTaskRead,
    status_code=status.HTTP_201_CREATED,
)
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


@router.patch("/tasks/{task_id}", response_model=WritingTaskRead)
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


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
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


@router.post("/tasks/{task_id}/publish", response_model=WritingTaskRead)
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


@router.post("/tasks/{task_id}/archive", response_model=WritingTaskRead)
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


@router.post(
    "/tasks/{task_id}/regenerate-image-summary",
    status_code=status.HTTP_204_NO_CONTENT,
)
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


@router.post("/tasks/upload-image", response_model=AdminWritingUploadImageResponse)
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


@router.get("/submissions", response_model=AdminWritingSubmissionListResponse)
async def list_submissions(
    status_filter: WritingSubmissionStatus | None = Query(default=None, alias="status"),
    task_id: UUID | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingSubmissionListResponse:
    _ = current_admin
    filters = []
    if status_filter is not None:
        filters.append(WritingSubmission.status == status_filter)
    if task_id is not None:
        filters.append(WritingSubmission.task_id == task_id)
    if user_id is not None:
        filters.append(WritingSubmission.user_id == user_id)

    total = await session.scalar(
        select(func.count()).select_from(WritingSubmission).where(*filters)
    ) or 0

    rows = (
        await session.execute(
            select(WritingSubmission, WritingTask, WritingEvaluation, User)
            .join(WritingTask, WritingTask.id == WritingSubmission.task_id)
            .outerjoin(
                WritingEvaluation,
                WritingEvaluation.submission_id == WritingSubmission.id,
            )
            .outerjoin(User, User.id == WritingSubmission.user_id)
            .where(*filters)
            .order_by(WritingSubmission.submitted_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    items: list[AdminWritingSubmissionItem] = []
    for submission, task, evaluation, user in rows:
        items.append(
            AdminWritingSubmissionItem(
                id=submission.id,
                user_id=submission.user_id,
                user_display_name=_resolve_user_display_name(user),
                task_id=task.id,
                task_title=task.title,
                task_type=submission.task_type,
                word_count=submission.word_count,
                status=submission.status,
                overall_band=evaluation.overall_band if evaluation is not None else None,
                submitted_at=submission.submitted_at,
                graded_at=evaluation.graded_at if evaluation is not None else None,
            )
        )

    return AdminWritingSubmissionListResponse(items=items, total=int(total))


@router.post(
    "/submissions/{submission_id}/regrade",
    status_code=status.HTTP_202_ACCEPTED,
)
async def regrade_submission(
    submission_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    _ = current_admin
    submission = await session.get(WritingSubmission, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    submission.status = WritingSubmissionStatus.QUEUED
    submission.error_message = None
    await session.commit()

    from app.services.writing_dispatch import dispatch_writing_grading

    submission.celery_task_id = await dispatch_writing_grading(submission.id)
    await session.commit()

    return Response(status_code=status.HTTP_202_ACCEPTED)
