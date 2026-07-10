from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.admin_writing_dependencies import *

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
    user_username: str | None = None
    user_phone: str | None = None
    task_id: UUID
    task_title: str
    task_type: WritingTaskType
    word_count: int
    status: WritingSubmissionStatus
    overall_band: float | None = None
    submitted_at: datetime
    graded_at: datetime | None = None
    error_message: str | None = None

class AdminWritingSubmissionListResponse(BaseModel):
    items: list[AdminWritingSubmissionItem]
    total: int

class AdminWritingSubmissionRead(BaseModel):
    id: UUID
    user_id: UUID
    user_display_name: str | None = None
    user_username: str | None = None
    user_phone: str | None = None
    task_id: UUID
    task_title: str
    task_type: WritingTaskType
    essay_text: str
    word_count: int
    status: WritingSubmissionStatus
    submitted_at: datetime
    time_spent_seconds: int
    error_message: str | None = None
    graded_at: datetime | None = None
    overall_band: float | None = None
    evaluation: WritingEvaluationRead | None = None

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

def _serialize_evaluation_read(
    *,
    submission: WritingSubmission,
    task: WritingTask,
    evaluation: WritingEvaluation,
) -> WritingEvaluationRead:
    feedback = evaluation.feedback or {}
    roast_raw = evaluation.roast_feedback or {}
    roast: WritingRoastFeedback | None = None
    if isinstance(roast_raw, dict) and roast_raw:
        try:
            roast = WritingRoastFeedback.model_validate(roast_raw)
        except Exception:
            roast = None

    annotations_raw = evaluation.inline_annotations or []
    annotations: list[WritingInlineAnnotation] = []
    for item in annotations_raw:
        try:
            annotations.append(WritingInlineAnnotation.model_validate(item))
        except Exception:
            continue

    vocabulary_raw = feedback.get("vocabulary_suggestions") or []
    vocabulary_suggestions: list[WritingVocabularySuggestion] = []
    for item in vocabulary_raw:
        try:
            vocabulary_suggestions.append(WritingVocabularySuggestion.model_validate(item))
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
        vocabulary_suggestions=vocabulary_suggestions,
        improved_version=evaluation.improved_version,
        overall_summary=str(feedback.get("overall_summary", "") or ""),
        next_steps=list(feedback.get("next_steps", []) or []),
        cache_hit=evaluation.cache_hit,
        model_version=evaluation.model_version,
        prompt_version=evaluation.prompt_version,
        grader_profile_version=evaluation.grader_profile_version,
        rubric_version=evaluation.rubric_version,
        anchor_set_version=evaluation.anchor_set_version,
        roast_profile_version=evaluation.roast_profile_version,
        improved_profile_version=evaluation.improved_profile_version,
        annotation_profile_version=evaluation.annotation_profile_version,
        roast=roast,
    )

def _serialize_submission_read(
    *,
    submission: WritingSubmission,
    task: WritingTask,
    evaluation: WritingEvaluation | None,
    user: User | None,
) -> AdminWritingSubmissionRead:
    return AdminWritingSubmissionRead(
        id=submission.id,
        user_id=submission.user_id,
        user_display_name=_resolve_user_display_name(user),
        user_username=user.username if user is not None else None,
        user_phone=user.phone if user is not None else None,
        task_id=task.id,
        task_title=task.title,
        task_type=submission.task_type,
        essay_text=submission.essay_text,
        word_count=submission.word_count,
        status=submission.status,
        submitted_at=submission.submitted_at,
        time_spent_seconds=int(submission.time_spent_seconds or 0),
        error_message=submission.error_message,
        graded_at=evaluation.graded_at if evaluation is not None else None,
        overall_band=evaluation.overall_band if evaluation is not None else None,
        evaluation=(
            _serialize_evaluation_read(
                submission=submission,
                task=task,
                evaluation=evaluation,
            )
            if evaluation is not None
            else None
        ),
    )

def _enqueue_image_summary(task_id: UUID) -> None:
    from app.tasks.tasks import generate_writing_task_image_summary_task

    generate_writing_task_image_summary_task.delay(str(task_id))

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
