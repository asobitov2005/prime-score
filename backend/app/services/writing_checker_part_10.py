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
from app.services.writing_prompt_grounding import OFFICIAL_DESCRIPTOR_SOURCE, SOURCE_PDF_SHA256, build_writing_grounding_context
from app.services.writing_checker_task_fit import check_task_fit
from app.services.writing_input_validation import WritingInputRejected

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
    usage_collector: list[AiUsageEventDraft] | None = None,
) -> dict[str, Any]:
    usage_events = usage_collector if usage_collector is not None else []
    usage_start = len(usage_events)
    task_type_value = (
        task.task_type.value if isinstance(task.task_type, WritingTaskType) else str(task.task_type)
    )
    grounding_context = build_writing_grounding_context(
        task_type=task_type_value,
        task_prompt_text=_strip_html(task.prompt_html or ""),
        image_summary=task.image_summary or "",
        essay_text=essay_text,
        descriptors=descriptors,
        benchmarks=benchmarks,
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
    task_fit = check_task_fit(
        config=grader_config, grounding_context=grounding_context,
        essay_text=essay_text, task_prompt_text=_strip_html(task.prompt_html or ""),
        seed=seed, usage_collector=usage_events,
    )
    grading_context = grounding_context + "\nTASK-FIT PREFLIGHT (model finding, not a band):\n" + json.dumps(task_fit)
    grader = _call_grader(
        resolved_config=grader_config,
        prompts=prompts,
        system_instruction=system_instruction,
        prompt=prompt + "\n\n" + grading_context,
        essay_text=essay_text,
        seed=seed,
        usage_collector=usage_events,
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
    annotations_valid = (
        "inline_annotations" in grader.model_fields_set
        and len(grader_annotations) == len(grader.inline_annotations)
        and all(item["original"].strip() and item["explanation"].strip() for item in grader_annotations)
    )
    # A valid empty list is a legitimate finding, not a reason to invent errors.
    if not annotations_valid:
        try:
            recovered_annotations = _call_annotation_recovery(
                resolved_config=grader_config,
                prompts=prompts,
                essay_text=essay_text,
                hints=[hint for hint in annotation_hints if hint],
                seed=seed + 17,
                grounding_context=grounding_context,
                usage_collector=usage_events,
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
    payload["evaluation_run"]["audit_result"]["evidence_validation"] = {
        "status": "passed",
        "checks": ["integer_criteria", "required_justifications", "verbatim_criterion_quotes"],
        "semantic_agreement": "not_measured",
    }
    payload["feedback"]["task_fit"] = task_fit
    payload["evaluation_run"]["initial_scores"]["task_fit"] = task_fit
    payload["evaluation_run"]["audit_result"]["task_fit"] = task_fit
    payload["evaluation_run"]["initial_scores"]["reference_context"] = {
        "official_descriptors": {
            "source_url": OFFICIAL_DESCRIPTOR_SOURCE,
            "revision": "May 2023",
            "source_pdf_sha256": SOURCE_PDF_SHA256,
            "text": "verbatim_extraction_checksum_verified",
        },
        "descriptor_origin": "configured" if descriptors is not None else "legacy_local_reference",
        "benchmark_card_ids": [
            card["card_id"] for card in (benchmarks.items if benchmarks else [])
            if card.get("task_type_scope", task_type_value) in (task_type_value, "all")
        ],
        "benchmark_usage": "provided_as_references_not_calibrated",
    }

    improved_text: str | None = None
    potential_band: float | None = None
    regrade_enabled = (improver_config.settings_json or {}).get("regrade_improved_version") is True
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
            grounding_context=grading_context,
            feedback=payload["feedback"],
            usage_collector=usage_events,
        )
        if regrade_enabled and improved_text and improved_text.strip() != essay_text.strip():
            regrade_context = build_writing_grounding_context(
                task_type=task_type_value,
                task_prompt_text=_strip_html(task.prompt_html or ""),
                image_summary=task.image_summary or "",
                essay_text=improved_text,
                descriptors=descriptors,
                benchmarks=benchmarks,
            )
            regrade_prompt = _build_grading_prompt(
                prompts=prompts,
                anchors=anchors,
                resolved_config=grader_config,
                task_type=task_type_value,
                task_prompt_text=_strip_html(task.prompt_html or ""),
                image_summary=task.image_summary or "",
                essay_text=improved_text,
            )
            try:
                regrade = _call_grader(
                    resolved_config=grader_config,
                    prompts=prompts,
                    system_instruction=system_instruction,
                    prompt=regrade_prompt + "\n\n" + regrade_context,
                    essay_text=improved_text,
                    seed=_seed_from_hash(hashlib.sha256(improved_text.encode("utf-8")).hexdigest()),
                    usage_collector=usage_events,
                    operation="writing_rewrite_regrade",
                )
                potential_band = calculate_overall_band(
                    round_criterion_band(regrade.task_achievement.band),
                    round_criterion_band(regrade.coherence.band),
                    round_criterion_band(regrade.lexical.band),
                    round_criterion_band(regrade.grammar.band),
                )
            except Exception:  # noqa: BLE001
                logger.exception("Improved version regrade failed; keeping original bands and rewrite")
    except Exception:  # noqa: BLE001
        logger.exception("Improved version generation failed")
    payload["improved_version"] = improved_text
    payload["potential_band"] = potential_band
    payload["evaluation_run"]["audit_result"]["rewrite_regrade"] = (
        "completed" if potential_band is not None else "not_performed_or_unavailable"
    )

    # Roast feedback: completely independent call, must NOT affect bands.
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
            task_type=task_type_value,
            task_prompt_text=_strip_html(task.prompt_html or ""),
            image_summary=task.image_summary or "",
            usage_collector=usage_events,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Roast generation crashed; ignoring.")
        roast = {}
    payload["roast_feedback"] = roast or {}
    payload["latency_ms"] = int((time.perf_counter() - started) * 1000)
    # Persist in the existing evaluation-run JSON, without requiring a usage table.
    payload["evaluation_run"]["audit_result"]["stage_metrics"] = [
        {
            "operation": event.operation, "status": event.status,
            "provider": event.provider.value, "model_id": event.model_id,
            "latency_ms": event.latency_ms,
            "prompt_tokens": event.prompt_tokens,
            "completion_tokens": event.completion_tokens,
            "total_tokens": event.total_tokens,
            "estimated_input_tokens": event.estimated_input_tokens,
            "requested_output_tokens": event.requested_output_tokens,
            "effective_output_tokens": event.effective_output_tokens,
        }
        for event in usage_events[usage_start:]
    ]

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
