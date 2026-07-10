from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import logger
from app.services.writing_checker_part_02 import compute_essay_hash
from app.services.writing_checker_part_10 import grade_essay_sync, mark_submission_failed

async def grade_submission(submission_id: UUID, *, mark_failed: bool = True) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        submission_result = await session.execute(
            select(WritingSubmission).where(WritingSubmission.id == submission_id)
        )
        submission = submission_result.scalar_one_or_none()
        if submission is None:
            return

        task_result = await session.execute(
            select(WritingTask).where(WritingTask.id == submission.task_id)
        )
        task = task_result.scalar_one_or_none()
        if task is None:
            submission.status = WritingSubmissionStatus.FAILED
            submission.error_message = "Writing task not found"
            await session.commit()
            return

        submission.status = WritingSubmissionStatus.GRADING
        submission.error_message = None
        await session.commit()

        task_id_str = str(task.id)
        task_type_value = (
            task.task_type.value
            if isinstance(task.task_type, WritingTaskType)
            else str(task.task_type)
        )
        essay_text = submission.essay_text
        word_count = submission.word_count
        essay_hash = submission.essay_hash or compute_essay_hash(
            task_id_str, essay_text, task_type_value
        )
        grader_config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_GRADER)
        improver_config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_IMPROVER)
        try:
            roast_config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_ROAST)
        except Exception:
            roast_config = None
        prompts = await get_active_prompt_bundle(session, task.task_type)
        rubric = await get_active_rubric_bundle(session, task.task_type)
        anchors = await get_active_anchor_bundle(session, task.task_type)
        descriptors = await get_active_descriptor_bundle(session, task.task_type)
        benchmarks = await get_active_benchmark_card_bundle(session, task.task_type)

    try:
        payload = grade_essay_sync(
            task=task,
            essay_text=essay_text,
            word_count=word_count,
            essay_hash=essay_hash,
            desired_score=getattr(submission, "desired_score", None),
            grader_config=grader_config,
            improver_config=improver_config,
            roast_config=roast_config,
            prompts=prompts,
            rubric=rubric,
            anchors=anchors,
            descriptors=descriptors,
            benchmarks=benchmarks,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Writing grading failed for submission %s", submission_id)
        if mark_failed:
            await mark_submission_failed(submission_id, str(exc))
        raise

    async with session_maker() as session:
        existing_result = await session.execute(
            select(WritingEvaluation).where(
                WritingEvaluation.submission_id == submission_id
            )
        )
        evaluation = existing_result.scalar_one_or_none()
        graded_at = datetime.now(UTC)
        if evaluation is None:
            evaluation = WritingEvaluation(
                submission_id=submission_id,
                task_achievement_band=payload["task_achievement_band"],
                coherence_band=payload["coherence_band"],
                lexical_band=payload["lexical_band"],
                grammar_band=payload["grammar_band"],
                overall_band=payload["overall_band"],
                potential_band=payload.get("potential_band"),
                word_count_penalty=payload.get("word_count_penalty", 0.0),
                feedback=payload["feedback"],
                inline_annotations=payload["inline_annotations"],
                improved_version=payload.get("improved_version"),
                rubric_reasoning=payload.get("rubric_reasoning", {}),
                roast_feedback=payload.get("roast_feedback", {}),
                model_version=payload.get("model_version", ""),
                prompt_version=payload.get("prompt_version", "profile:1"),
                anchors_version=payload.get("anchors_version", "anchor:1"),
                grader_profile_version=payload.get("grader_profile_version"),
                rubric_version=payload.get("rubric_version"),
                anchor_set_version=payload.get("anchor_set_version"),
                roast_profile_version=payload.get("roast_profile_version"),
                improved_profile_version=payload.get("improved_profile_version"),
                annotation_profile_version=payload.get("annotation_profile_version"),
                latency_ms=payload.get("latency_ms", 0),
                cache_hit=False,
                graded_at=graded_at,
            )
            session.add(evaluation)
        else:
            evaluation.task_achievement_band = payload["task_achievement_band"]
            evaluation.coherence_band = payload["coherence_band"]
            evaluation.lexical_band = payload["lexical_band"]
            evaluation.grammar_band = payload["grammar_band"]
            evaluation.overall_band = payload["overall_band"]
            evaluation.potential_band = payload.get("potential_band")
            evaluation.word_count_penalty = payload.get("word_count_penalty", 0.0)
            evaluation.feedback = payload["feedback"]
            evaluation.inline_annotations = payload["inline_annotations"]
            evaluation.improved_version = payload.get("improved_version")
            evaluation.rubric_reasoning = payload.get("rubric_reasoning", {})
            evaluation.roast_feedback = payload.get("roast_feedback", {})
            evaluation.model_version = payload.get("model_version", "")
            evaluation.prompt_version = payload.get("prompt_version", "profile:1")
            evaluation.anchors_version = payload.get("anchors_version", "anchor:1")
            evaluation.grader_profile_version = payload.get("grader_profile_version")
            evaluation.rubric_version = payload.get("rubric_version")
            evaluation.anchor_set_version = payload.get("anchor_set_version")
            evaluation.roast_profile_version = payload.get("roast_profile_version")
            evaluation.improved_profile_version = payload.get("improved_profile_version")
            evaluation.annotation_profile_version = payload.get("annotation_profile_version")
            evaluation.latency_ms = payload.get("latency_ms", 0)
            evaluation.cache_hit = False
            evaluation.graded_at = graded_at

        await session.flush()

        evaluation_run_payload = payload.get("evaluation_run") or {}
        run_result = await session.execute(
            select(WritingEvaluationRun).where(WritingEvaluationRun.submission_id == submission_id)
        )
        evaluation_run = run_result.scalar_one_or_none()
        if evaluation_run is None:
            evaluation_run = WritingEvaluationRun(
                submission_id=submission_id,
                evaluation_id=evaluation.id,
                pipeline_version=str(evaluation_run_payload.get("pipeline_version") or "blueprint_v1"),
                mode=str(evaluation_run_payload.get("mode") or "full_diagnostic"),
                initial_scores=evaluation_run_payload.get("initial_scores") or {},
                selected_benchmarks=evaluation_run_payload.get("selected_benchmarks") or [],
                calibration_result=evaluation_run_payload.get("calibration_result") or {},
                audit_result=evaluation_run_payload.get("audit_result") or {},
                confidence=str(evaluation_run_payload.get("confidence") or "Medium"),
                possible_score_range=str(evaluation_run_payload.get("possible_score_range") or ""),
                meta_learning_note=str(evaluation_run_payload.get("meta_learning_note") or ""),
            )
            session.add(evaluation_run)
        else:
            evaluation_run.evaluation_id = evaluation.id
            evaluation_run.pipeline_version = str(evaluation_run_payload.get("pipeline_version") or "blueprint_v1")
            evaluation_run.mode = str(evaluation_run_payload.get("mode") or "full_diagnostic")
            evaluation_run.initial_scores = evaluation_run_payload.get("initial_scores") or {}
            evaluation_run.selected_benchmarks = evaluation_run_payload.get("selected_benchmarks") or []
            evaluation_run.calibration_result = evaluation_run_payload.get("calibration_result") or {}
            evaluation_run.audit_result = evaluation_run_payload.get("audit_result") or {}
            evaluation_run.confidence = str(evaluation_run_payload.get("confidence") or "Medium")
            evaluation_run.possible_score_range = str(evaluation_run_payload.get("possible_score_range") or "")
            evaluation_run.meta_learning_note = str(evaluation_run_payload.get("meta_learning_note") or "")

        submission_result = await session.execute(
            select(WritingSubmission).where(WritingSubmission.id == submission_id)
        )
        submission = submission_result.scalar_one_or_none()
        if submission is not None:
            submission.status = WritingSubmissionStatus.COMPLETED
            submission.error_message = None
            task = await session.get(WritingTask, submission.task_id)
            if task is not None:
                await award_xp_for_writing_submission(session, submission, evaluation, task)
        await session.commit()
