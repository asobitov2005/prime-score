from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _ANNOTATION_LIST_ADAPTER, _AnnotationPayload
from app.services.writing_checker_part_02 import _writing_generate_config
from app.services.writing_checker_part_03 import _annotation_list_schema, _annotation_max_output_tokens, _improved_max_output_tokens, _repair_max_output_tokens, _response_schema
from app.services.writing_checker_part_07 import _build_annotation_recovery_prompt, _extract_json_payload
from app.services.writing_prompt_grounding import GROUNDING_POLICY

def _call_annotation_recovery(
    *,
    resolved_config: ResolvedAiUseCaseConfig | None = None,
    prompts: WritingPromptBundle | None = None,
    client: Any | None = None,
    essay_text: str,
    hints: list[str],
    seed: int,
    grounding_context: str = "",
    usage_collector: list[AiUsageEventDraft] | None = None,
) -> list[_AnnotationPayload]:
    max_output_tokens = _annotation_max_output_tokens(resolved_config)
    prompt = _build_annotation_recovery_prompt(
        essay_text=essay_text,
        hints=hints,
    )
    prompt += "\n\n" + grounding_context
    if resolved_config and resolved_config.provider == AiProvider.GROQ:
        prompt += (
            "\n\nReturn JSON array only. Every item must contain: "
            "offset, length, original, replacements, category, severity, "
            "short_message, explanation, band_impact, examiner_tip, improved_sentence."
        )
    if client is not None:
        response = client.models.generate_content(
            model="test-model",
            contents=prompt,
            config=_writing_generate_config(
                temperature=0,
                topP=1,
                seed=seed,
                maxOutputTokens=max_output_tokens,
                responseMimeType="application/json",
                responseSchema=_annotation_list_schema(),
            ),
        )
        raw_text = (response.text or "").strip()
    else:
        if resolved_config is None:
            raise RuntimeError("resolved_config is required when client is not provided.")
        raw_text = generate_text_sync(
            config=resolved_config,
            system_instruction=GROUNDING_POLICY + "\nThis stage returns only the annotation array, not criterion bands.",
            prompt=prompt,
            temperature=0,
            top_p=1,
            seed=seed,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
            response_schema=_annotation_list_schema(),
            usage_collector=usage_collector,
            operation="writing_annotations",
        )
    if not raw_text:
        return []
    try:
        data = json.loads(_extract_json_payload(raw_text))
        return _ANNOTATION_LIST_ADAPTER.validate_python(data)
    except (json.JSONDecodeError, ValidationError):
        repaired_text = _repair_annotation_json(
            resolved_config=resolved_config,
            prompts=prompts,
            client=client,
            raw_text=raw_text,
            seed=seed,
            grounding_context=grounding_context,
            usage_collector=usage_collector,
        )
        if not repaired_text:
            raise
        data = json.loads(_extract_json_payload(repaired_text))
        return _ANNOTATION_LIST_ADAPTER.validate_python(data)

def _repair_annotation_json(
    *,
    resolved_config: ResolvedAiUseCaseConfig | None,
    prompts: WritingPromptBundle | None,
    client: Any | None = None,
    raw_text: str,
    seed: int,
    grounding_context: str = "",
    usage_collector: list[AiUsageEventDraft] | None = None,
) -> str | None:
    max_output_tokens = _repair_max_output_tokens(resolved_config)
    if client is not None:
        response = client.models.generate_content(
            model="test-model",
            contents=(
                "Repair the broken JSON annotation array below so it becomes valid JSON "
                "matching the annotation schema exactly. Preserve meaning when possible, "
                "use [] for missing arrays, use \"\" for missing strings, and output JSON only.\n\n"
                f"BROKEN JSON:\n{raw_text}\n\n{grounding_context}"
            ),
            config=_writing_generate_config(
                temperature=0,
                topP=1,
                seed=seed,
                maxOutputTokens=max_output_tokens,
                responseMimeType="application/json",
                responseSchema=_annotation_list_schema(),
            ),
        )
        repaired = (response.text or "").strip()
    else:
        if resolved_config is None or prompts is None:
            raise RuntimeError("resolved_config and prompts are required when client is not provided.")
        repaired = generate_text_sync(
            config=resolved_config,
            system_instruction=GROUNDING_POLICY + "\nRepair only the annotation JSON array; do not return a grade.",
            prompt=render_annotation_repair_prompt(prompts, raw_text) + "\n\n" + grounding_context,
            temperature=0,
            top_p=1,
            seed=seed,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
            response_schema=_annotation_list_schema(),
            usage_collector=usage_collector,
            operation="writing_annotations_repair",
        )
    return repaired or None

def _repair_grader_json(
    *,
    resolved_config: ResolvedAiUseCaseConfig | None,
    prompts: WritingPromptBundle | None,
    client: Any | None = None,
    raw_text: str,
    seed: int,
    grounding_context: str = "",
    usage_collector: list[AiUsageEventDraft] | None = None,
    operation: str = "writing_grader_repair",
) -> str | None:
    max_output_tokens = _repair_max_output_tokens(resolved_config)
    if client is not None:
        response = client.models.generate_content(
            model="test-model",
            contents=(
                "Repair the broken IELTS grader JSON below so it becomes valid JSON "
                "that matches the response schema exactly. Preserve meaning when possible, "
                "use [] for missing arrays, use \"\" for missing strings, and output JSON only.\n\n"
                f"BROKEN JSON:\n{raw_text}\n\n{grounding_context}"
            ),
            config=_writing_generate_config(
                temperature=0,
                topP=1,
                seed=seed,
                maxOutputTokens=max_output_tokens,
                responseMimeType="application/json",
                responseSchema=_response_schema(),
            ),
        )
        repaired = (response.text or "").strip()
    else:
        if resolved_config is None or prompts is None:
            raise RuntimeError("resolved_config and prompts are required when client is not provided.")
        repaired = generate_text_sync(
            config=resolved_config,
            system_instruction=GROUNDING_POLICY + "\nRepair the grader JSON using the full original context; never invent missing evidence.",
            prompt=render_json_repair_prompt(prompts, raw_text) + "\n\n" + grounding_context,
            temperature=0,
            top_p=1,
            seed=seed,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
            response_schema=_response_schema(),
            usage_collector=usage_collector,
            operation=operation,
        )
    return repaired or None

def _generate_improved_version(
    *,
    resolved_config: ResolvedAiUseCaseConfig,
    prompts: WritingPromptBundle,
    essay_text: str,
    annotations: list[dict[str, Any]],
    task_prompt_text: str,
    overall_band: float,
    desired_score: float | None,
    word_count: int,
    word_minimum: int,
    grounding_context: str = "",
    feedback: dict[str, Any] | None = None,
    usage_collector: list[AiUsageEventDraft] | None = None,
) -> str:
    if not annotations and not any(
        (feedback or {}).get(key, {}).get("improvements")
        for key in ("task_achievement", "coherence", "lexical", "grammar")
    ):
        return essay_text
    annotations_lines = [
        (
            f"- offset {a['offset']} length {a['length']} "
            f"({a['category']}, {a['severity']}): "
            f"replace {a['original']!r} with {a['replacements'][:1] or ['(see explanation)']} "
            f"-- {a['short_message']}"
        )
        for a in annotations
    ]
    target_band = min(9.0, overall_band + 1.0)
    if desired_score is not None:
        if overall_band >= desired_score:
            target_band = min(9.0, overall_band + 0.5)
        else:
            target_band = min(9.0, max(overall_band + 0.5, min(desired_score, overall_band + 1.0)))
    prompt = render_improved_version_prompt(
        prompts=prompts,
        essay_text=essay_text,
        annotations_lines=annotations_lines,
        task_prompt_text=task_prompt_text,
        current_band=overall_band,
        target_band=target_band,
        desired_score=desired_score,
        word_count=word_count,
        word_minimum=word_minimum,
    )
    text = generate_text_sync(
        config=resolved_config,
        system_instruction=GROUNDING_POLICY + "\nThis stage revises the essay, not the awarded bands. Return only the full revised essay as plain text.",
        prompt=prompt + "\n\n" + grounding_context + "\nFEEDBACK:\n" + json.dumps(feedback or {}),
        temperature=0,
        top_p=1,
        max_output_tokens=_improved_max_output_tokens(resolved_config),
        usage_collector=usage_collector,
        operation="writing_rewrite",
    )
    return text or essay_text
