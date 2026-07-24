from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.writing_dependencies import *
from app.api.routes.writing_part_01 import _ensure_writing_submission_allowed, _serialize_draft, _serialize_draft_list_item, _serialize_limit_status, _serialize_task_list_item, _serialize_task_read

router = APIRouter()

def _parse_sentence_fixes(feedback: dict, annotations: list[WritingInlineAnnotation]) -> list[WritingSentenceFix]:
    raw_items = feedback.get("sentence_fixes") or []
    fixes: list[WritingSentenceFix] = []
    seen: set[str] = set()
    if isinstance(raw_items, list):
        for raw in raw_items:
            if not isinstance(raw, dict):
                continue
            try:
                item = WritingSentenceFix.model_validate(raw)
            except Exception:
                continue
            if item.original and item.original not in seen:
                seen.add(item.original)
                fixes.append(item)
            if len(fixes) >= 8:
                break
    for annotation in annotations:
        if len(fixes) >= 8 or annotation.original in seen:
            continue
        replacement = annotation.replacements[0] if annotation.replacements else annotation.improved_sentence
        if not replacement:
            continue
        seen.add(annotation.original)
        fixes.append(
            WritingSentenceFix(
                priority=len(fixes) + 1,
                original=annotation.original,
                replacement=replacement,
                corrected_sentence=annotation.improved_sentence or replacement,
                why=annotation.explanation or annotation.short_message,
                band_impact=annotation.band_impact,
                category=annotation.category.value,
            )
        )
    return fixes

def _build_revision_diff(essay_text: str, improved_version: str | None, sentence_fixes: list[WritingSentenceFix]) -> list[WritingRevisionDiff]:
    if not improved_version:
        return []
    diffs: list[WritingRevisionDiff] = []
    for fix in sentence_fixes[:5]:
        revised = fix.corrected_sentence or fix.replacement
        if not fix.original or not revised:
            continue
        diffs.append(
            WritingRevisionDiff(
                original=fix.original,
                revised=revised,
                reason=fix.why,
                criterion=fix.category,
            )
        )
    if diffs:
        return diffs
    if essay_text.strip() != improved_version.strip():
        return [
            WritingRevisionDiff(
                original=essay_text[:220],
                revised=improved_version[:220],
                reason="Improved draft changes wording, grammar, and clarity.",
                criterion="overall",
            )
        ]
    return []

def _default_word_minimum(task_type: WritingTaskType) -> int:
    return 150 if task_type == WritingTaskType.TASK_1 else 250

def _default_time_limit_seconds(task_type: WritingTaskType) -> int:
    return 20 * 60 if task_type == WritingTaskType.TASK_1 else 40 * 60

def _build_custom_task(
    *,
    task_type: WritingTaskType,
    topic: str,
    image_url: str | None = None,
    image_summary: str | None = None,
) -> WritingTask:
    clean_topic = " ".join((topic or "").split())
    title_topic = clean_topic[:120]
    prompt_html = "".join(
        f"<p>{html.escape(line)}</p>"
        for line in clean_topic.splitlines()
        if line.strip()
    ) or f"<p>{html.escape(clean_topic)}</p>"
    return WritingTask(
        title=f"Custom topic: {title_topic}",
        task_type=task_type,
        prompt_html=prompt_html,
        image_storage_path=image_url if task_type == WritingTaskType.TASK_1 else None,
        image_summary=image_summary if task_type == WritingTaskType.TASK_1 else None,
        image_summary_status=(
            "ready"
            if task_type == WritingTaskType.TASK_1 and image_summary
            else "failed"
            if task_type == WritingTaskType.TASK_1 and image_url
            else "not_required"
        ),
        word_minimum=_default_word_minimum(task_type),
        time_limit_seconds=_default_time_limit_seconds(task_type),
        difficulty=WritingDifficulty.MEDIUM,
        status=WritingTaskStatus.DRAFT,
        source="user_custom",
        description=clean_topic,
        sample_band=None,
        sample_answer=None,
        created_by=None,
    )

@router.post("/upload-image", response_model=WritingUploadImageResponse)
async def upload_image(
    file: UploadFile = File(...),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingUploadImageResponse:
    await _ensure_writing_submission_allowed(session=session, current_user=current_user)
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

    return WritingUploadImageResponse(url=url)

@router.get("/limits", response_model=WritingLimitRead)
async def get_writing_limits(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingLimitRead:
    limit_status = await resolve_writing_limit_status(session, principal=current_user)
    return _serialize_limit_status(limit_status)

@router.get("/tasks", response_model=WritingTaskListResponse)
async def list_published_tasks(
    task_type: WritingTaskType | None = Query(default=None),
    question_subtype: WritingQuestionSubtype | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskListResponse:
    filters = [WritingTask.status == WritingTaskStatus.PUBLISHED]
    if task_type is not None:
        filters.append(WritingTask.task_type == task_type)
    if question_subtype is not None:
        filters.append(WritingTask.question_subtype == question_subtype)

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
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskRead:
    task = await session.get(WritingTask, task_id)
    if task is None or task.status != WritingTaskStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    return _serialize_task_read(task)

@router.get("/drafts/{draft_key}", response_model=WritingDraftRead)
async def get_writing_draft(
    draft_key: str,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingDraftRead:
    draft = await session.scalar(
        select(WritingDraft).where(
            WritingDraft.user_id == current_user.id,
            WritingDraft.draft_key == draft_key,
        )
    )
    if draft is None:
        task_id: UUID | None = None
        task_type = WritingTaskType.TASK_1
        if draft_key.startswith("writing-exam-draft:custom:"):
            suffix = draft_key.removeprefix("writing-exam-draft:custom:")
            if suffix == WritingTaskType.TASK_2.value or suffix.startswith(f"{WritingTaskType.TASK_2.value}:"):
                task_type = WritingTaskType.TASK_2
        elif draft_key.startswith("writing-exam-draft:"):
            raw_task_id = draft_key.removeprefix("writing-exam-draft:")
            try:
                task_id = UUID(raw_task_id)
            except ValueError:
                task_id = None
            if task_id is not None:
                task = await session.get(WritingTask, task_id)
                if task is not None:
                    task_type = task.task_type
        return WritingDraftRead(
            draft_key=draft_key,
            task_id=task_id,
            task_type=task_type,
            topic="",
            essay_text="",
            image_data_url=None,
            started=False,
            time_spent_seconds=0,
            updated_at=datetime.now(UTC),
        )
    return _serialize_draft(draft)

@router.get("/drafts", response_model=WritingDraftListResponse)
async def list_writing_drafts(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingDraftListResponse:
    rows = (
        await session.execute(
            select(WritingDraft, WritingTask.title)
            .outerjoin(WritingTask, WritingTask.id == WritingDraft.task_id)
            .where(WritingDraft.user_id == current_user.id)
            .order_by(WritingDraft.updated_at.desc())
        )
    ).all()

    items = [
        _serialize_draft_list_item(draft, task_title)
        for draft, task_title in rows
    ]
    return WritingDraftListResponse(items=items)
