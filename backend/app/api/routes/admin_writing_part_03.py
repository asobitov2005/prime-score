from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.admin_writing_dependencies import *
from app.api.routes.admin_writing_part_01 import AdminWritingSubmissionItem, AdminWritingSubmissionListResponse, AdminWritingSubmissionRead, _resolve_user_display_name, _serialize_submission_read

router = APIRouter()

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
                user_username=user.username if user is not None else None,
                user_phone=user.phone if user is not None else None,
                task_id=task.id,
                task_title=task.title,
                task_type=submission.task_type,
                word_count=submission.word_count,
                status=submission.status,
                overall_band=evaluation.overall_band if evaluation is not None else None,
                submitted_at=submission.submitted_at,
                graded_at=evaluation.graded_at if evaluation is not None else None,
                error_message=submission.error_message,
            )
        )

    return AdminWritingSubmissionListResponse(items=items, total=int(total))

async def get_submission(
    submission_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingSubmissionRead:
    _ = current_admin
    row = (
        await session.execute(
            select(WritingSubmission, WritingTask, WritingEvaluation, User)
            .join(WritingTask, WritingTask.id == WritingSubmission.task_id)
            .outerjoin(
                WritingEvaluation,
                WritingEvaluation.submission_id == WritingSubmission.id,
            )
            .outerjoin(User, User.id == WritingSubmission.user_id)
            .where(WritingSubmission.id == submission_id)
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    submission, task, evaluation, user = row
    return _serialize_submission_read(
        submission=submission,
        task=task,
        evaluation=evaluation,
        user=user,
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
