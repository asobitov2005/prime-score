from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import logger
from app.services.writing_checker_part_02 import _strip_html
from app.services.writing_checker_part_03 import _seed_from_hash, _skip_groq_aux_call
from app.services.writing_checker_part_04 import _build_grading_prompt, _build_system_instruction
from app.services.writing_checker_part_07 import _call_grader, _dedupe_annotations, _validate_annotations
from app.services.writing_checker_part_08 import _call_annotation_recovery, _generate_improved_version
from app.services.writing_checker_part_09 import _build_payload

def grade_essay_sync(
    *,
    task: WritingTask,
    essay_text: str,
    word_count: int,
    essay_hash: str,
    desired_score: float | None,
    grader_config: ResolvedAiUseCaseConfig,
    improver_config: ResolvedAiUseCaseConfig,
    roast_config: ResolvedAiUseCaseConfig | None,
    prompts: WritingPromptBundle,
    rubric: WritingRubricBundle,
    anchors: WritingAnchorBundle,
    descriptors: WritingDescriptorBundle | None = None,
    benchmarks: WritingBenchmarkCardBundle | None = None,
) -> dict[str, Any]:
    task_type_value = (
        task.task_type.value if isinstance(task.task_type, WritingTaskType) else str(task.task_type)
    )
    system_instruction = _build_system_instruction(
        prompts=prompts,
        rubric=rubric,
        resolved_config=grader_config,
        task_type=task_type_value,
    )
    prompt = _build_grading_prompt(
        prompts=prompts,
        anchors=anchors,
        resolved_config=grader_config,
        task_type=task_type_value,
        task_prompt_text=_strip_html(task.prompt_html or ""),
        image_summary=task.image_summary or "",
        essay_text=essay_text,
        desired_score=desired_score,
    )
    seed = _seed_from_hash(essay_hash)

    started = time.perf_counter()
    grader = _call_grader(
        resolved_config=grader_config,
        prompts=prompts,
        system_instruction=system_instruction,
        prompt=prompt,
        essay_text=essay_text,
        seed=seed,
    )
    grader_annotations = _validate_annotations(grader.inline_annotations, essay_text)
    annotation_hints = [
        *grader.lexical.improvements,
        *grader.grammar.improvements,
        *grader.coherence.improvements,
        *grader.task_achievement.improvements,
        *grader.lexical.evidence_quotes,
        *grader.grammar.evidence_quotes,
        *(
            f"{item['original']} -> {(item['replacements'][:1] or [''])[0]} ({item['short_message']})"
            for item in grader_annotations
        ),
    ]
    annotations = grader_annotations
    if _skip_groq_aux_call(grader_config):
        annotations = _dedupe_annotations(grader_annotations)
        logger.info(
            "Skipping annotation recovery for Groq writing grader to stay within provider TPM limits."
        )
    else:
        try:
            recovered_annotations = _call_annotation_recovery(
                resolved_config=grader_config,
                prompts=prompts,
                essay_text=essay_text,
                hints=[hint for hint in annotation_hints if hint],
                seed=seed + 17,
            )
            annotations = _dedupe_annotations(
                _validate_annotations(recovered_annotations, essay_text) + grader_annotations
            )
        except Exception:  # noqa: BLE001
            logger.exception("Annotation recovery failed")
            annotations = _dedupe_annotations(grader_annotations)

    word_minimum = int(task.word_minimum or 0)
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    payload = _build_payload(
        grader=grader,
        annotations=annotations,
        essay_text=essay_text,
        task_type=task_type_value,
        word_count=word_count,
        word_minimum=word_minimum,
        desired_score=desired_score,
        model_version=f"{grader_config.provider.value}:{grader_config.model_id}",
        prompt_profile_version=prompts.profile_version,
        rubric_version=rubric.version,
        anchor_set_version=anchors.version,
        latency_ms=elapsed_ms,
        descriptors=descriptors,
        benchmarks=benchmarks,
    )

    improved_text: str | None = None
    potential_band: float | None = None
    if _skip_groq_aux_call(improver_config):
        logger.info(
            "Skipping improved-version generation for Groq writing improver to stay within provider TPM limits."
        )
    else:
        try:
            improved_text = _generate_improved_version(
                resolved_config=improver_config,
                prompts=prompts,
                essay_text=essay_text,
                annotations=annotations,
                task_prompt_text=_strip_html(task.prompt_html or ""),
                overall_band=payload["overall_band"],
                desired_score=desired_score,
                word_count=word_count,
                word_minimum=word_minimum,
            )
            if improved_text and improved_text != essay_text:
                if _skip_groq_aux_call(grader_config):
                    logger.info(
                        "Skipping Groq improved-version regrade to stay within provider TPM limits."
                    )
                    potential_band = None
                else:
                    regrade_prompt = _build_grading_prompt(
                        prompts=prompts,
                        anchors=anchors,
                        task_type=task_type_value,
                        task_prompt_text=_strip_html(task.prompt_html or ""),
                        image_summary=task.image_summary or "",
                        essay_text=improved_text,
                        desired_score=desired_score,
                    )
                    improved_seed = _seed_from_hash(
                        hashlib.sha256(improved_text.encode("utf-8")).hexdigest()
                    )
                    regrade = _call_grader(
                        resolved_config=grader_config,
                        prompts=prompts,
                        system_instruction=system_instruction,
                        prompt=regrade_prompt,
                        essay_text=improved_text,
                        seed=improved_seed,
                    )
                    potential_band = calculate_overall_band(
                        round_to_ielts_band(regrade.task_achievement.band),
                        round_to_ielts_band(regrade.coherence.band),
                        round_to_ielts_band(regrade.lexical.band),
                        round_to_ielts_band(regrade.grammar.band),
                    )
                    potential_band = round_to_ielts_band(
                        min(potential_band, payload["overall_band"] + 1.0)
                    )
            else:
                potential_band = payload["overall_band"]
        except Exception:  # noqa: BLE001
            logger.exception("Improved version generation failed")
            improved_text = None
            potential_band = None

    payload["improved_version"] = improved_text
    payload["potential_band"] = potential_band

    # Roast feedback: completely independent call, must NOT affect bands.
    if _skip_groq_aux_call(roast_config):
        roast = {}
        logger.info("Skipping Groq roast generation to stay within provider TPM limits.")
    else:
        try:
            roast = generate_roast(
                resolved_config=roast_config,
                prompts=prompts,
                essay_text=essay_text,
                bands={
                    "task_achievement": payload["task_achievement_band"],
                    "coherence": payload["coherence_band"],
                    "lexical": payload["lexical_band"],
                    "grammar": payload["grammar_band"],
                    "overall": payload["overall_band"],
                },
                word_count=word_count,
                word_minimum=word_minimum,
                annotation_count=len(annotations),
                overall_summary=payload["feedback"].get("overall_summary", ""),
            )
        except Exception:  # noqa: BLE001
            logger.exception("Roast generation crashed; ignoring.")
            roast = {}
    payload["roast_feedback"] = roast or {}

    return payload

async def _set_submission_state(
    submission_id: UUID,
    *,
    status: WritingSubmissionStatus,
    error_message: str | None,
) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        result = await session.execute(
            select(WritingSubmission).where(WritingSubmission.id == submission_id)
        )
        submission = result.scalar_one_or_none()
        if submission is None:
            return
        submission.status = status
        submission.error_message = error_message[:500] if error_message else None
        await session.commit()

async def mark_submission_retrying(submission_id: UUID) -> None:
    await _set_submission_state(
        submission_id,
        status=WritingSubmissionStatus.QUEUED,
        error_message=None,
    )

async def mark_submission_failed(submission_id: UUID, error_message: str) -> None:
    await _set_submission_state(
        submission_id,
        status=WritingSubmissionStatus.FAILED,
        error_message=error_message,
    )
