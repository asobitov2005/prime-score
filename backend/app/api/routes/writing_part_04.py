from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.writing_dependencies import *
from app.api.routes.writing_part_01 import _dispatch_writing_retry, _ensure_writing_submission_allowed, _serialize_draft
from app.api.routes.writing_part_03 import _build_custom_task

router = APIRouter()

async def save_writing_draft(
    draft_key: str,
    payload: WritingDraftUpsertRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingDraftRead:
    if payload.task_id is not None:
        task = await session.get(WritingTask, payload.task_id)
        if task is None or task.status != WritingTaskStatus.PUBLISHED:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")

    draft = await session.scalar(
        select(WritingDraft).where(
            WritingDraft.user_id == current_user.id,
            WritingDraft.draft_key == draft_key,
        )
    )
    if draft is None:
        draft = WritingDraft(
            user_id=current_user.id,
            draft_key=draft_key,
            task_id=payload.task_id,
            task_type=payload.task_type,
            payload={},
            time_spent_seconds=payload.time_spent_seconds,
        )
        session.add(draft)

    draft.task_id = payload.task_id
    draft.task_type = payload.task_type
    draft.time_spent_seconds = payload.time_spent_seconds
    draft.payload = {
        "topic": (payload.topic or "").strip(),
        "essay": payload.essay_text,
        "imageDataUrl": payload.image_data_url,
        "started": payload.started,
    }

    await session.commit()
    await session.refresh(draft)
    return _serialize_draft(draft)

async def delete_writing_draft(
    draft_key: str,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    draft = await session.scalar(
        select(WritingDraft).where(
            WritingDraft.user_id == current_user.id,
            WritingDraft.draft_key == draft_key,
        )
    )
    if draft is None:
        return None
    await session.delete(draft)
    await session.commit()
    return None

async def submit_writing(
    payload: WritingSubmitRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingSubmissionRead:
    await _ensure_writing_submission_allowed(session=session, current_user=current_user)

    task: WritingTask | None
    if payload.task_id is not None:
        task = await session.get(WritingTask, payload.task_id)
        if task is None or task.status != WritingTaskStatus.PUBLISHED:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    else:
        task_type = payload.task_type or WritingTaskType.TASK_2
        image_url = (payload.image_url or "").strip() if task_type == WritingTaskType.TASK_1 else ""
        image_summary = ""
        if image_url:
            from app.services.writing_image_summary import generate_image_summary

            resolved_config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_IMAGE_SUMMARY)
            image_summary = await asyncio.to_thread(
                generate_image_summary,
                image_url,
                resolved_config=resolved_config,
            )
        task = _build_custom_task(
            task_type=task_type,
            topic=(payload.topic or "").strip(),
            image_url=image_url or None,
            image_summary=image_summary or None,
        )
        session.add(task)
        await session.flush()

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
        desired_score=payload.desired_score,
    )
    session.add(submission)
    await session.commit()
    await session.refresh(submission)

    from app.services.writing_dispatch import dispatch_writing_grading

    submission.celery_task_id = await dispatch_writing_grading(submission.id)
    await session.commit()
    await session.refresh(submission)

    return WritingSubmissionRead.model_validate(submission)

async def get_submission(
    submission_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingSubmissionRead:
    submission = await session.get(WritingSubmission, submission_id)
    if submission is None or submission.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
    return WritingSubmissionRead.model_validate(submission)

async def retry_submission(
    submission_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    submission = await session.get(WritingSubmission, submission_id)
    if submission is None or submission.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    if submission.status != WritingSubmissionStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only failed submissions can be retried.",
        )

    submission.status = WritingSubmissionStatus.QUEUED
    submission.error_message = None
    await session.commit()

    submission.celery_task_id = await _dispatch_writing_retry(submission.id)
    await session.commit()

    return WritingSubmissionRead.model_validate(submission)
