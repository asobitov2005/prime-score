from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _ALLOWED_SEVERITIES, _AnnotationPayload, _GraderPayload
from app.services.writing_checker_part_02 import _writing_generate_config
from app.services.writing_checker_part_03 import _grader_max_output_tokens, _response_schema
from app.services.writing_checker_part_06 import _assert_grader_payload_integrity


def _validate_annotations(
    annotations: list[_AnnotationPayload], essay_text: str
) -> list[dict[str, Any]]:
    def resolve_span(
        *,
        offset: int,
        length: int,
        original: str,
    ) -> tuple[int, int, str] | None:
        if offset < 0 or length <= 0:
            return None

        essay_len = len(essay_text)
        if not original:
            end = offset + length
            if end > essay_len:
                return None
            actual = essay_text[offset:end]
            return offset, length, actual

        expected = original
        expected_len = len(expected)
        if expected_len <= 0:
            return None

        end = offset + expected_len
        if end <= essay_len:
            actual = essay_text[offset:end]
            if actual == expected:
                return offset, expected_len, actual

        window_start = max(0, offset - 64)
        window_end = min(essay_len, offset + expected_len + 64)
        window = essay_text[window_start:window_end]
        local_hits: list[int] = []
        start_at = 0
        while True:
            found = window.find(expected, start_at)
            if found == -1:
                break
            local_hits.append(window_start + found)
            start_at = found + 1

        if local_hits:
            best_offset = min(local_hits, key=lambda candidate: abs(candidate - offset))
            return best_offset, expected_len, essay_text[best_offset:best_offset + expected_len]

        global_hits: list[int] = []
        start_at = 0
        while True:
            found = essay_text.find(expected, start_at)
            if found == -1:
                break
            global_hits.append(found)
            start_at = found + 1

        if len(global_hits) == 1:
            best_offset = global_hits[0]
            return best_offset, expected_len, essay_text[best_offset:best_offset + expected_len]

        return None

    cleaned: list[dict[str, Any]] = []
    for ann in annotations:
        resolved = resolve_span(
            offset=ann.offset,
            length=ann.length,
            original=ann.original,
        )
        if resolved is None:
            continue
        resolved_offset, resolved_length, actual = resolved
        try:
            category = WritingErrorCategory(ann.category.strip().lower())
        except ValueError:
            continue
        severity = ann.severity.strip().lower() if ann.severity else "warning"
        if severity not in _ALLOWED_SEVERITIES:
            severity = "warning"
        cleaned.append(
            {
                "offset": resolved_offset,
                "length": resolved_length,
                "original": actual,
                "replacements": [r for r in ann.replacements if isinstance(r, str)][:5],
                "category": category.value,
                "severity": severity,
                "short_message": ann.short_message or "",
                "explanation": ann.explanation or "",
                "band_impact": ann.band_impact or "",
                "examiner_tip": ann.examiner_tip or "",
                "improved_sentence": ann.improved_sentence or "",
            }
        )
    return cleaned


def _dedupe_annotations(annotations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = sorted(
        annotations,
        key=lambda item: (item["offset"], -item["length"], item["category"]),
    )
    deduped: list[dict[str, Any]] = []
    index_by_key: dict[tuple[int, int, str], int] = {}
    for item in ordered:
        key = (item["offset"], item["length"], item["category"])
        existing_index = index_by_key.get(key)
        if existing_index is None:
            index_by_key[key] = len(deduped)
            deduped.append(item)
            continue
        existing = deduped[existing_index]
        existing_score = len(existing.get("explanation", "")) + len(existing.get("band_impact", ""))
        current_score = len(item.get("explanation", "")) + len(item.get("band_impact", ""))
        if current_score > existing_score:
            deduped[existing_index] = item
    return deduped


def _call_grader(
    *,
    resolved_config: ResolvedAiUseCaseConfig | None = None,
    prompts: WritingPromptBundle | None = None,
    client: Any | None = None,
    system_instruction: str,
    prompt: str,
    essay_text: str,
    seed: int,
) -> _GraderPayload:
    from app.services.writing_checker_part_08 import _repair_grader_json

    max_output_tokens = _grader_max_output_tokens(resolved_config)
    config = _writing_generate_config(
        systemInstruction=system_instruction,
        temperature=0,
        topP=1,
        seed=seed,
        maxOutputTokens=max_output_tokens,
        responseMimeType="application/json",
        responseSchema=_response_schema(),
    )
    last_error: Exception | None = None
    for _ in range(2):
        if client is not None:
            response = client.models.generate_content(
                model="test-model",
                contents=prompt,
                config=config,
            )
            raw_text = (response.text or "").strip()
        else:
            if resolved_config is None:
                raise RuntimeError("resolved_config is required when client is not provided.")
            raw_text = generate_text_sync(
                config=resolved_config,
                system_instruction=system_instruction,
                prompt=prompt,
                temperature=0,
                top_p=1,
                max_output_tokens=max_output_tokens,
                response_mime_type="application/json",
                response_schema=_response_schema(),
                seed=seed,
            )
        if not raw_text:
            last_error = RuntimeError("Empty response from grader")
            continue
        try:
            data = json.loads(_extract_json_payload(raw_text))
            payload = _GraderPayload.model_validate(data)
            _assert_grader_payload_integrity(payload, essay_text=essay_text)
            return payload
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = exc
            repaired_text = _repair_grader_json(
                resolved_config=resolved_config,
                prompts=prompts,
                client=client,
                raw_text=raw_text,
                seed=seed,
            )
            if repaired_text:
                try:
                    data = json.loads(_extract_json_payload(repaired_text))
                    payload = _GraderPayload.model_validate(data)
                    _assert_grader_payload_integrity(payload, essay_text=essay_text)
                    return payload
                except (json.JSONDecodeError, ValidationError, ValueError) as repair_exc:
                    last_error = repair_exc
            continue
        except ValueError as exc:
            last_error = exc
            continue
    raise RuntimeError(f"Grader returned invalid or incomplete payload: {last_error}")


def _extract_json_payload(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = [line for line in text.splitlines() if not line.strip().startswith("```")]
        text = "\n".join(lines).strip()
    object_start = text.find("{")
    array_start = text.find("[")
    starts = [(object_start, "}"), (array_start, "]")]
    starts = [(idx, closing) for idx, closing in starts if idx != -1]
    if starts:
        start, closing = min(starts, key=lambda item: item[0])
        end = text.rfind(closing)
        if end != -1 and end > start:
            return text[start : end + 1]
    return text


def _build_annotation_recovery_prompt(*, essay_text: str, hints: list[str]) -> str:
    prompt_parts = [
        "You are a strict IELTS writing line editor and annotation generator.",
        "Return ONLY a JSON array of annotation objects.",
        "Find the specific text-level issues that are holding this essay below the learner's target band or the next realistic +0.5 band.",
        "Include real spelling mistakes, grammar mistakes, tense/form errors, article/preposition errors, punctuation problems, wrong word forms, awkward or imprecise vocabulary, weak collocations, and clearly broken cohesive phrasing.",
        "You may include lexical upgrades when the current wording is understandable but unnatural, inaccurate, or too weak for a higher IELTS band.",
        "Do NOT annotate mere style preferences that do not materially improve the IELTS result.",
        "STRICT RULES:",
        "1. `original` must be copied verbatim from the essay, character-for-character.",
        "2. `offset` is the exact 0-based character index in the raw essay between the markers.",
        "3. `length` must equal the exact character count of `original`.",
        "4. Before outputting each item, verify mentally that essay[offset:offset+length] == original.",
        "5. If you are unsure about any item, omit it.",
        "6. Prefer 6-18 high-value annotations and avoid duplicates.",
        "7. `short_message` must be a sharp issue label, not a vague sentence.",
        "8. `explanation` must be 2-4 specific sentences explaining what is wrong in THIS exact phrase or sentence, what rule is broken, and why the replacement is better.",
        "9. `band_impact` must state which IELTS criterion is affected and how this mistake holds the band down.",
        "10. `examiner_tip` must state what a stronger Band 7-9 writer would do instead.",
        "11. `improved_sentence` must rewrite only the containing sentence with the minimum changes needed to fix the problem while preserving meaning.",
    ]
    if hints:
        prompt_parts.append("KNOWN ISSUE HINTS:")
        prompt_parts.extend(f"- {hint}" for hint in hints[:20])
    prompt_parts.append("===== CANDIDATE ESSAY START =====")
    prompt_parts.append(essay_text)
    prompt_parts.append("===== CANDIDATE ESSAY END =====")
    return "\n".join(prompt_parts)
