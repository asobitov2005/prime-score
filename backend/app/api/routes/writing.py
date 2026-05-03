from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.enums import (
    WritingDifficulty,
    WritingSubmissionStatus,
    WritingTaskStatus,
    WritingTaskType,
)
from app.models.writing import WritingEvaluation, WritingSubmission, WritingTask
from app.schemas.common import DebugPrincipal
from app.schemas.writing import (
    WritingCriterionFeedback,
    WritingDashboardSummary,
    WritingEvaluationRead,
    WritingHistoryItem,
    WritingHistoryResponse,
    WritingInlineAnnotation,
    WritingSubmissionRead,
    WritingSubmitRequest,
    WritingTaskListItem,
    WritingTaskListResponse,
    WritingTaskRead,
)


router = APIRouter()


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
        description=task.description,
        sample_band=task.sample_band,
        created_at=task.created_at,
    )


def _serialize_task_list_item(task: WritingTask) -> WritingTaskListItem:
    return WritingTaskListItem(
        id=task.id,
        title=task.title,
        task_type=task.task_type,
        image_url=task.image_storage_path,
        word_minimum=task.word_minimum,
        time_limit_seconds=task.time_limit_seconds,
        difficulty=task.difficulty,
        source=task.source,
        description=task.description,
    )


def _criterion_from_dict(payload: dict | None) -> WritingCriterionFeedback:
    payload = payload or {}
    return WritingCriterionFeedback(
        band=float(payload.get("band", 0.0) or 0.0),
        summary=str(payload.get("summary", "") or ""),
        strengths=list(payload.get("strengths", []) or []),
        improvements=list(payload.get("improvements", []) or []),
        evidence_quotes=list(payload.get("evidence_quotes", []) or []),
        reasoning=str(payload.get("reasoning", "") or ""),
    )


@router.get("/tasks", response_model=WritingTaskListResponse)
async def list_published_tasks(
    task_type: WritingTaskType | None = Query(default=None),
    difficulty: WritingDifficulty | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskListResponse:
    _ = current_user

    filters = [WritingTask.status == WritingTaskStatus.PUBLISHED]
    if task_type is not None:
        filters.append(WritingTask.task_type == task_type)
    if difficulty is not None:
        filters.append(WritingTask.difficulty == difficulty)

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

    return WritingTaskListResponse(
        items=[_serialize_task_list_item(task) for task in rows],
        total=int(total),
    )


@router.get("/tasks/{task_id}", response_model=WritingTaskRead)
async def get_published_task(
    task_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskRead:
    _ = current_user
    task = await session.get(WritingTask, task_id)
    if task is None or task.status != WritingTaskStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    return _serialize_task_read(task)


@router.post(
    "/submissions",
    response_model=WritingSubmissionRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_writing(
    payload: WritingSubmitRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingSubmissionRead:
    task = await session.get(WritingTask, payload.task_id)
    if task is None or task.status != WritingTaskStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")

    word_count = len(payload.essay_text.split())

    from app.services.writing_checker import compute_essay_hash

    essay_hash = compute_essay_hash(str(task.id), payload.essay_text, task.task_type.value)

    submission = WritingSubmission(
        user_id=current_user.id,
        task_id=task.id,
        task_type=task.task_type,
        essay_text=payload.essay_text,
        word_count=word_count,
        essay_hash=essay_hash,
        status=WritingSubmissionStatus.QUEUED,
        submitted_at=datetime.now(UTC),
        time_spent_seconds=payload.time_spent_seconds,
    )
    session.add(submission)
    await session.commit()
    await session.refresh(submission)

    from app.tasks.tasks import evaluate_writing_submission_task

    result = evaluate_writing_submission_task.delay(str(submission.id))
    submission.celery_task_id = result.id
    await session.commit()
    await session.refresh(submission)

    return WritingSubmissionRead.model_validate(submission)


@router.get("/submissions/{submission_id}", response_model=WritingSubmissionRead)
async def get_submission(
    submission_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingSubmissionRead:
    submission = await session.get(WritingSubmission, submission_id)
    if submission is None or submission.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
    return WritingSubmissionRead.model_validate(submission)


@router.get("/submissions/{submission_id}/result", response_model=WritingEvaluationRead)
async def get_submission_result(
    submission_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingEvaluationRead:
    submission = await session.get(WritingSubmission, submission_id)
    if submission is None or submission.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    if submission.status != WritingSubmissionStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Evaluation not ready")

    evaluation = await session.scalar(
        select(WritingEvaluation).where(WritingEvaluation.submission_id == submission.id)
    )
    if evaluation is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Evaluation not ready")

    task = await session.get(WritingTask, submission.task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")

    feedback = evaluation.feedback or {}
    annotations_raw = evaluation.inline_annotations or []
    annotations: list[WritingInlineAnnotation] = []
    for item in annotations_raw:
        try:
            annotations.append(WritingInlineAnnotation.model_validate(item))
        except Exception:
            continue

    return WritingEvaluationRead(
        submission_id=submission.id,
        task_id=task.id,
        task_type=submission.task_type,
        task_title=task.title,
        word_count=submission.word_count,
        word_minimum=task.word_minimum,
        time_spent_seconds=submission.time_spent_seconds,
        submitted_at=submission.submitted_at,
        graded_at=evaluation.graded_at,
        essay_text=submission.essay_text,
        overall_band=evaluation.overall_band,
        potential_band=evaluation.potential_band,
        word_count_penalty=evaluation.word_count_penalty,
        task_achievement=_criterion_from_dict(feedback.get("task_achievement")),
        coherence=_criterion_from_dict(feedback.get("coherence")),
        lexical=_criterion_from_dict(feedback.get("lexical")),
        grammar=_criterion_from_dict(feedback.get("grammar")),
        inline_annotations=annotations,
        improved_version=evaluation.improved_version,
        overall_summary=str(feedback.get("overall_summary", "") or ""),
        next_steps=list(feedback.get("next_steps", []) or []),
        cache_hit=evaluation.cache_hit,
        model_version=evaluation.model_version,
        prompt_version=evaluation.prompt_version,
    )


@router.get("/history", response_model=WritingHistoryResponse)
async def list_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingHistoryResponse:
    total = await session.scalar(
        select(func.count())
        .select_from(WritingSubmission)
        .where(WritingSubmission.user_id == current_user.id)
    ) or 0

    rows = (
        await session.execute(
            select(WritingSubmission, WritingTask, WritingEvaluation)
            .join(WritingTask, WritingTask.id == WritingSubmission.task_id)
            .outerjoin(
                WritingEvaluation,
                WritingEvaluation.submission_id == WritingSubmission.id,
            )
            .where(WritingSubmission.user_id == current_user.id)
            .order_by(WritingSubmission.submitted_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    items: list[WritingHistoryItem] = []
    for submission, task, evaluation in rows:
        items.append(
            WritingHistoryItem(
                submission_id=submission.id,
                task_id=task.id,
                task_title=task.title,
                task_type=submission.task_type,
                word_count=submission.word_count,
                overall_band=evaluation.overall_band if evaluation is not None else None,
                status=submission.status,
                submitted_at=submission.submitted_at,
                graded_at=evaluation.graded_at if evaluation is not None else None,
            )
        )

    return WritingHistoryResponse(items=items, total=int(total))


@router.get("/dashboard-summary", response_model=WritingDashboardSummary)
async def dashboard_summary(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingDashboardSummary:
    completed_filter = [
        WritingSubmission.user_id == current_user.id,
        WritingSubmission.status == WritingSubmissionStatus.COMPLETED,
    ]

    total = await session.scalar(
        select(func.count())
        .select_from(WritingSubmission)
        .where(*completed_filter)
    ) or 0

    if total == 0:
        return WritingDashboardSummary(total_submissions=0)

    avg_band, best_band = (
        await session.execute(
            select(
                func.avg(WritingEvaluation.overall_band),
                func.max(WritingEvaluation.overall_band),
            )
            .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
            .where(*completed_filter)
        )
    ).one()

    last_row = (
        await session.execute(
            select(WritingEvaluation.overall_band, WritingSubmission.submitted_at)
            .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
            .where(*completed_filter)
            .order_by(WritingSubmission.submitted_at.desc())
            .limit(1)
        )
    ).first()

    last_band = float(last_row[0]) if last_row else None
    last_submitted_at = last_row[1] if last_row else None

    task_1_avg = await session.scalar(
        select(func.avg(WritingEvaluation.overall_band))
        .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
        .where(*completed_filter, WritingSubmission.task_type == WritingTaskType.TASK_1)
    )
    task_2_avg = await session.scalar(
        select(func.avg(WritingEvaluation.overall_band))
        .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
        .where(*completed_filter, WritingSubmission.task_type == WritingTaskType.TASK_2)
    )

    return WritingDashboardSummary(
        total_submissions=int(total),
        average_band=float(avg_band) if avg_band is not None else None,
        best_band=float(best_band) if best_band is not None else None,
        last_band=last_band,
        last_submitted_at=last_submitted_at,
        task_1_average=float(task_1_avg) if task_1_avg is not None else None,
        task_2_average=float(task_2_avg) if task_2_avg is not None else None,
    )
