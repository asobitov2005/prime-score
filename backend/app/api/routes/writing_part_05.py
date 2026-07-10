from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.writing_dependencies import *
from app.api.routes.writing_part_01 import _annotation_patterns, _build_action_plan, _criterion_from_dict, _writing_xp_breakdown
from app.api.routes.writing_part_02 import _build_checklist, _build_history_error_trends, _parse_band_boundaries, _parse_checklist, _parse_error_patterns, _parse_score_boosters, _parse_target_actions
from app.api.routes.writing_part_03 import _build_revision_diff, _parse_sentence_fixes

router = APIRouter()

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
    evaluation_run = await session.scalar(
        select(WritingEvaluationRun).where(WritingEvaluationRun.submission_id == submission.id)
    )

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
    task_achievement = _criterion_from_dict(feedback.get("task_achievement"))
    coherence = _criterion_from_dict(feedback.get("coherence"))
    lexical = _criterion_from_dict(feedback.get("lexical"))
    grammar = _criterion_from_dict(feedback.get("grammar"))
    next_steps = list(feedback.get("next_steps", []) or [])
    desired_score = getattr(submission, "desired_score", None)
    action_plan = _build_action_plan(
        task_achievement=task_achievement,
        coherence=coherence,
        lexical=lexical,
        grammar=grammar,
        next_steps=next_steps,
    )
    fallback_checklist = _build_checklist(
        task_type=submission.task_type,
        subtype=task.question_subtype,
        essay_text=submission.essay_text,
        feedback=feedback,
        annotations_raw=[item for item in annotations_raw if isinstance(item, dict)],
    )
    fallback_error_patterns = _annotation_patterns(
        [item for item in annotations_raw if isinstance(item, dict)]
    )
    checklist = _parse_checklist(feedback, fallback_checklist)
    error_patterns = _parse_error_patterns(feedback, fallback_error_patterns)
    target_action_plan = _parse_target_actions(
        feedback,
        action_plan,
        evaluation.overall_band,
        desired_score,
    )
    band_boundaries = _parse_band_boundaries(
        feedback,
        task_achievement=task_achievement,
        coherence=coherence,
        lexical=lexical,
        grammar=grammar,
    )
    score_boosters = _parse_score_boosters(
        feedback,
        task_achievement=task_achievement,
        coherence=coherence,
        lexical=lexical,
        grammar=grammar,
    )
    sentence_fixes = _parse_sentence_fixes(feedback, annotations)
    revision_diff = _build_revision_diff(
        submission.essay_text,
        evaluation.improved_version,
        sentence_fixes,
    )
    history_error_trends = await _build_history_error_trends(
        session=session,
        user_id=current_user.id,
    )
    xp_rows = list(
        (
            await session.scalars(
                select(XPTransaction).where(
                    XPTransaction.user_id == current_user.id,
                    XPTransaction.source_type == "writing_submission",
                    XPTransaction.source_id == str(submission.id),
                )
            )
        ).all()
    )
    xp_breakdown = _writing_xp_breakdown(xp_rows)
    user = await session.get(User, current_user.id)

    return WritingEvaluationRead(
        submission_id=submission.id,
        task_id=task.id,
        task_type=submission.task_type,
        task_title=task.title,
        word_count=submission.word_count,
        word_minimum=task.word_minimum,
        desired_score=desired_score,
        time_spent_seconds=submission.time_spent_seconds,
        submitted_at=submission.submitted_at,
        graded_at=evaluation.graded_at,
        essay_text=submission.essay_text,
        overall_band=evaluation.overall_band,
        potential_band=evaluation.potential_band,
        word_count_penalty=evaluation.word_count_penalty,
        task_achievement=task_achievement,
        coherence=coherence,
        lexical=lexical,
        grammar=grammar,
        inline_annotations=annotations,
        vocabulary_suggestions=vocabulary_suggestions,
        improved_version=evaluation.improved_version,
        overall_summary=str(feedback.get("overall_summary", "") or ""),
        next_steps=next_steps,
        action_plan=action_plan,
        target_action_plan=target_action_plan,
        band_boundaries=band_boundaries,
        score_boosters=score_boosters,
        checklist=checklist,
        error_patterns=error_patterns,
        history_error_trends=history_error_trends,
        sentence_fixes=sentence_fixes,
        revision_diff=revision_diff,
        roast=roast,
        is_ai_estimate=True,
        confidence=evaluation_run.confidence if evaluation_run else "Medium",
        possible_score_range=evaluation_run.possible_score_range if evaluation_run else "",
        selected_benchmarks=evaluation_run.selected_benchmarks if evaluation_run else [],
        calibration_result=evaluation_run.calibration_result if evaluation_run else {},
        audit_result=evaluation_run.audit_result if evaluation_run else {},
        meta_learning_note=evaluation_run.meta_learning_note if evaluation_run else "",
        cache_hit=evaluation.cache_hit,
        model_version=evaluation.model_version,
        prompt_version=evaluation.prompt_version,
        grader_profile_version=evaluation.grader_profile_version,
        rubric_version=evaluation.rubric_version,
        anchor_set_version=evaluation.anchor_set_version,
        roast_profile_version=evaluation.roast_profile_version,
        improved_profile_version=evaluation.improved_profile_version,
        annotation_profile_version=evaluation.annotation_profile_version,
        xp_awarded_total=int(xp_breakdown.get("total", 0) or 0),
        xp_breakdown=xp_breakdown,
        xp_level_after=int(user.current_level or 1) if user is not None else None,
        xp_current_streak=int(user.current_streak or 0) if user is not None else None,
    )

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
                time_spent_seconds=int(submission.time_spent_seconds or 0),
                overall_band=evaluation.overall_band if evaluation is not None else None,
                status=submission.status,
                submitted_at=submission.submitted_at,
                graded_at=evaluation.graded_at if evaluation is not None else None,
            )
        )

    return WritingHistoryResponse(items=items, total=int(total))
