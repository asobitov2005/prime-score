from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel, Field, TypeAdapter, ValidationError
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import get_session_maker
from app.models.enums import (
    WritingErrorCategory,
    WritingSubmissionStatus,
    WritingTaskType,
)
from app.models.writing import WritingEvaluation, WritingSubmission, WritingTask
from app.services.writing_anchors import ANCHORS, ANCHORS_VERSION, PROMPT_VERSION
from app.services.writing_roast import generate_roast
from app.services.writing_rubric import (
    IELTS_WRITING_RUBRIC_TEXT,
    calculate_overall_band,
    round_to_ielts_band,
)

logger = logging.getLogger(__name__)


_HTML_TAG_RE = re.compile(r"</?[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")
_ALLOWED_SEVERITIES = {"error", "warning", "suggestion"}


class _CriterionPayload(BaseModel):
    band: float
    reasoning: str = ""
    summary: str = ""
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    evidence_quotes: list[str] = Field(default_factory=list)


class _AnnotationPayload(BaseModel):
    offset: int
    length: int
    original: str
    replacements: list[str] = Field(default_factory=list)
    category: str
    severity: str = "warning"
    short_message: str = ""
    explanation: str = ""
    band_impact: str = ""
    examiner_tip: str = ""
    improved_sentence: str = ""


class _GraderPayload(BaseModel):
    task_achievement: _CriterionPayload
    coherence: _CriterionPayload
    lexical: _CriterionPayload
    grammar: _CriterionPayload
    overall_summary: str = ""
    next_steps: list[str] = Field(default_factory=list)
    inline_annotations: list[_AnnotationPayload] = Field(default_factory=list)


_ANNOTATION_LIST_ADAPTER = TypeAdapter(list[_AnnotationPayload])


def _strip_html(text: str) -> str:
    if not text:
        return ""
    if "<" not in text or ">" not in text:
        return text
    return _HTML_TAG_RE.sub(" ", text)


def _normalize_essay(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", (text or "")).strip().lower()


def compute_essay_hash(task_id: str, essay_text: str, task_type: str) -> str:
    payload = f"{task_type}|{task_id}|{_normalize_essay(essay_text)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _build_gemini_client() -> genai.Client:
    settings = get_settings()
    if not (settings.gemini_api_key or "").strip():
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return genai.Client(api_key=settings.gemini_api_key)


def _criterion_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=["band", "reasoning", "summary", "strengths", "improvements", "evidence_quotes"],
        properties={
            "band": genai_types.Schema(type=genai_types.Type.NUMBER),
            "reasoning": genai_types.Schema(type=genai_types.Type.STRING),
            "summary": genai_types.Schema(type=genai_types.Type.STRING),
            "strengths": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "improvements": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "evidence_quotes": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
        },
    )


def _annotation_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=[
            "offset",
            "length",
            "original",
            "replacements",
            "category",
            "severity",
            "short_message",
            "explanation",
        ],
        properties={
            "offset": genai_types.Schema(type=genai_types.Type.INTEGER),
            "length": genai_types.Schema(type=genai_types.Type.INTEGER),
            "original": genai_types.Schema(type=genai_types.Type.STRING),
            "replacements": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "category": genai_types.Schema(
                type=genai_types.Type.STRING,
                enum=[c.value for c in WritingErrorCategory],
            ),
            "severity": genai_types.Schema(
                type=genai_types.Type.STRING,
                enum=sorted(_ALLOWED_SEVERITIES),
            ),
            "short_message": genai_types.Schema(type=genai_types.Type.STRING),
            "explanation": genai_types.Schema(type=genai_types.Type.STRING),
            "band_impact": genai_types.Schema(type=genai_types.Type.STRING),
            "examiner_tip": genai_types.Schema(type=genai_types.Type.STRING),
            "improved_sentence": genai_types.Schema(type=genai_types.Type.STRING),
        },
    )


def _response_schema() -> genai_types.Schema:
    criterion = _criterion_schema()
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=[
            "task_achievement",
            "coherence",
            "lexical",
            "grammar",
            "overall_summary",
            "next_steps",
            "inline_annotations",
        ],
        properties={
            "task_achievement": criterion,
            "coherence": criterion,
            "lexical": criterion,
            "grammar": criterion,
            "overall_summary": genai_types.Schema(type=genai_types.Type.STRING),
            "next_steps": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=genai_types.Schema(type=genai_types.Type.STRING),
            ),
            "inline_annotations": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=_annotation_schema(),
            ),
        },
    )


def _annotation_list_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.ARRAY,
        items=_annotation_schema(),
    )


def _grader_thinking_level() -> genai_types.ThinkingLevel:
    value = (get_settings().gemini_thinking_level or "MEDIUM").strip().upper()
    return {
        "MINIMAL": genai_types.ThinkingLevel.MINIMAL,
        "LOW": genai_types.ThinkingLevel.LOW,
        "MEDIUM": genai_types.ThinkingLevel.MEDIUM,
        "HIGH": genai_types.ThinkingLevel.HIGH,
    }.get(value, genai_types.ThinkingLevel.MEDIUM)


def _seed_from_hash(essay_hash: str) -> int:
    return int(essay_hash[:8], 16) % (2**31)


def _format_anchors_block(task_type: str) -> str:
    anchors = ANCHORS.get(task_type, [])
    blocks: list[str] = []
    for anchor in anchors:
        criteria = anchor.get("criteria", {})
        blocks.append(
            "----- ANCHOR ESSAY (Band {band}) -----\n"
            "Criteria bands -> TA: {ta}, CC: {cc}, LR: {lr}, GRA: {gra}\n"
            "Rationale: {rationale}\n"
            "Essay:\n{essay}\n----- END ANCHOR -----".format(
                band=anchor.get("band"),
                ta=criteria.get("task_achievement"),
                cc=criteria.get("coherence"),
                lr=criteria.get("lexical"),
                gra=criteria.get("grammar"),
                rationale=anchor.get("rationale", ""),
                essay=anchor.get("essay", ""),
            )
        )
    return "\n\n".join(blocks)


def _build_system_instruction() -> str:
    return (
        "You are an experienced IELTS Writing examiner. Score essays strictly "
        "according to the official band descriptors below. For every criterion, "
        "first reason internally about the descriptors and the evidence in the "
        "essay (placed in the 'reasoning' field), then issue a band in 0.5 "
        "increments between 0 and 9. Quote short verbatim phrases from the "
        "candidate's essay as evidence. Be conservative: when the essay sits "
        "between two bands, choose the lower band unless the higher-band "
        "descriptors are clearly met. Use the provided anchor essays as "
        "calibration references; never reveal them in your output. Do NOT "
        "reward length, topic, or apparent effort beyond what the descriptors "
        "describe. Be specific and critical when giving improvement advice: "
        "avoid vague comments such as 'use better vocabulary' or 'improve "
        "grammar'. Name the exact weakness, quote or paraphrase the weak "
        "phrase, and, when possible, suggest the stronger grammar pattern, "
        "collocation, or academic wording that would raise the band.\n\n"
        + IELTS_WRITING_RUBRIC_TEXT
    )


def _build_grading_prompt(
    *,
    task_type: str,
    task_prompt_text: str,
    image_summary: str,
    essay_text: str,
) -> str:
    parts: list[str] = []
    parts.append(f"TASK TYPE: {task_type.upper()}")
    parts.append("TASK PROMPT:\n" + (task_prompt_text or "").strip())
    if task_type == WritingTaskType.TASK_1.value and image_summary:
        parts.append("VISUAL DESCRIPTION (ground truth, do not re-interpret):\n" + image_summary.strip())
    parts.append("CALIBRATION ANCHORS:\n" + _format_anchors_block(task_type))
    parts.append(
        "INLINE ANNOTATIONS:\n"
        "Identify concrete, fixable language errors in the candidate's essay. "
        "For each error, return offset (0-based character index into the essay "
        "text exactly as provided between the markers), length (number of "
        "characters of the original span), original (the exact substring), "
        "replacements (1-3 corrected alternatives), category (one of: "
        "spelling, grammar, lexical, cohesion, style, punctuation), severity "
        "(error, warning, or suggestion), a short_message, a brief "
        "explanation, band_impact, examiner_tip, and improved_sentence. "
        "`short_message` should be a direct label such as 'Subject-verb "
        "agreement' or 'Misspelled academic term'. `explanation` must name the "
        "exact grammar, vocabulary, or cohesion problem in this context rather "
        "than giving generic advice. `band_impact` should say which IELTS "
        "criterion is affected and why. `examiner_tip` should say what a "
        "stronger Band 7-9 writer would do instead. `improved_sentence` should "
        "rewrite only the sentence containing the error with minimal change. "
        "STRICTLY copy `original` verbatim from the essay, "
        "character-for-character. `length` must exactly equal the number of "
        "characters in `original`. Before outputting each annotation, verify "
        "that essay[offset:offset+length] == original in the exact raw essay "
        "text, including spaces and newlines. If you cannot verify an "
        "annotation exactly, omit it. Do not annotate stylistic preferences "
        "as errors."
    )
    parts.append(
        "OUTPUT: Return JSON only that matches the provided response schema. "
        "Do not include markdown fences. Do not add fields. Bands MUST be "
        "0-9 in 0.5 increments."
    )
    parts.append("===== CANDIDATE ESSAY START =====\n" + essay_text + "\n===== CANDIDATE ESSAY END =====")
    return "\n\n".join(parts)


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
    client: genai.Client,
    system_instruction: str,
    prompt: str,
    seed: int,
) -> _GraderPayload:
    settings = get_settings()
    config = genai_types.GenerateContentConfig(
        systemInstruction=system_instruction,
        temperature=0,
        topP=1,
        seed=seed,
        maxOutputTokens=8192,
        responseMimeType="application/json",
        responseSchema=_response_schema(),
        thinkingConfig=genai_types.ThinkingConfig(
            thinkingLevel=_grader_thinking_level(),
        ),
    )
    last_error: Exception | None = None
    for _ in range(2):
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=config,
        )
        raw_text = (response.text or "").strip()
        if not raw_text:
            last_error = RuntimeError("Empty response from grader")
            continue
        try:
            data = json.loads(_extract_json_payload(raw_text))
            return _GraderPayload.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = exc
            repaired_text = _repair_grader_json(
                client=client,
                raw_text=raw_text,
                seed=seed,
            )
            if repaired_text:
                try:
                    data = json.loads(_extract_json_payload(repaired_text))
                    return _GraderPayload.model_validate(data)
                except (json.JSONDecodeError, ValidationError) as repair_exc:
                    last_error = repair_exc
            continue
    raise RuntimeError(f"Grader returned invalid JSON: {last_error}")


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
        "Find the specific text-level issues that are holding this essay below Band 9.",
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


def _call_annotation_recovery(
    *,
    client: genai.Client,
    essay_text: str,
    hints: list[str],
    seed: int,
) -> list[_AnnotationPayload]:
    settings = get_settings()
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=_build_annotation_recovery_prompt(
            essay_text=essay_text,
            hints=hints,
        ),
        config=genai_types.GenerateContentConfig(
            temperature=0,
            topP=1,
            seed=seed,
            maxOutputTokens=8192,
            responseMimeType="application/json",
            responseSchema=_annotation_list_schema(),
            thinkingConfig=genai_types.ThinkingConfig(
                thinkingLevel=genai_types.ThinkingLevel.MINIMAL,
            ),
        ),
    )
    raw_text = (response.text or "").strip()
    if not raw_text:
        return []
    data = json.loads(_extract_json_payload(raw_text))
    return _ANNOTATION_LIST_ADAPTER.validate_python(data)


def _repair_grader_json(
    *,
    client: genai.Client,
    raw_text: str,
    seed: int,
) -> str | None:
    settings = get_settings()
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=(
            "Repair the broken IELTS grader JSON below so it becomes valid JSON "
            "that matches the response schema exactly. Preserve meaning when possible, "
            "use [] for missing arrays, use \"\" for missing strings, and output JSON only.\n\n"
            f"BROKEN JSON:\n{raw_text}"
        ),
        config=genai_types.GenerateContentConfig(
            temperature=0,
            topP=1,
            seed=seed,
            maxOutputTokens=4096,
            responseMimeType="application/json",
            responseSchema=_response_schema(),
            thinkingConfig=genai_types.ThinkingConfig(
                thinkingLevel=genai_types.ThinkingLevel.MINIMAL,
            ),
        ),
    )
    repaired = (response.text or "").strip()
    return repaired or None


def _generate_improved_version(
    *,
    client: genai.Client,
    essay_text: str,
    annotations: list[dict[str, Any]],
) -> str:
    if not annotations:
        return essay_text
    settings = get_settings()
    annotations_lines = [
        (
            f"- offset {a['offset']} length {a['length']} "
            f"({a['category']}, {a['severity']}): "
            f"replace {a['original']!r} with {a['replacements'][:1] or ['(see explanation)']} "
            f"-- {a['short_message']}"
        )
        for a in annotations
    ]
    prompt = (
        "You will receive a candidate IELTS essay and a list of inline "
        "annotations. Apply ONLY those annotations to fix the listed errors "
        "WITHOUT rewriting the essay. Keep the same arguments, structure, "
        "paragraph breaks, examples and overall length. Output the corrected "
        "essay as plain text only. No commentary.\n\n"
        f"Annotations:\n" + "\n".join(annotations_lines) + "\n\n"
        "===== ESSAY START =====\n"
        f"{essay_text}\n"
        "===== ESSAY END ====="
    )
    config = genai_types.GenerateContentConfig(
        temperature=0,
        topP=1,
        maxOutputTokens=4096,
        thinkingConfig=genai_types.ThinkingConfig(
            thinkingLevel=genai_types.ThinkingLevel.MINIMAL,
        ),
    )
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=config,
    )
    text = (response.text or "").strip()
    return text or essay_text


def _build_payload(
    *,
    grader: _GraderPayload,
    annotations: list[dict[str, Any]],
    essay_text: str,
    word_count: int,
    word_minimum: int,
    model_version: str,
    latency_ms: int,
) -> dict[str, Any]:
    ta = round_to_ielts_band(grader.task_achievement.band)
    cc = round_to_ielts_band(grader.coherence.band)
    lr = round_to_ielts_band(grader.lexical.band)
    gra = round_to_ielts_band(grader.grammar.band)
    overall_pre_penalty = calculate_overall_band(ta, cc, lr, gra)

    penalty = 0.0
    if word_minimum > 0:
        if word_count < word_minimum * 0.6:
            penalty = 1.0
        elif word_count < word_minimum:
            penalty = 0.5

    overall_after_penalty = max(0.0, min(9.0, overall_pre_penalty - penalty))
    overall_after_penalty = round_to_ielts_band(overall_after_penalty)

    feedback = {
        "task_achievement": {
            "band": ta,
            "summary": grader.task_achievement.summary,
            "strengths": grader.task_achievement.strengths,
            "improvements": grader.task_achievement.improvements,
            "evidence_quotes": grader.task_achievement.evidence_quotes,
            "reasoning": grader.task_achievement.reasoning,
        },
        "coherence": {
            "band": cc,
            "summary": grader.coherence.summary,
            "strengths": grader.coherence.strengths,
            "improvements": grader.coherence.improvements,
            "evidence_quotes": grader.coherence.evidence_quotes,
            "reasoning": grader.coherence.reasoning,
        },
        "lexical": {
            "band": lr,
            "summary": grader.lexical.summary,
            "strengths": grader.lexical.strengths,
            "improvements": grader.lexical.improvements,
            "evidence_quotes": grader.lexical.evidence_quotes,
            "reasoning": grader.lexical.reasoning,
        },
        "grammar": {
            "band": gra,
            "summary": grader.grammar.summary,
            "strengths": grader.grammar.strengths,
            "improvements": grader.grammar.improvements,
            "evidence_quotes": grader.grammar.evidence_quotes,
            "reasoning": grader.grammar.reasoning,
        },
        "overall_summary": grader.overall_summary,
        "next_steps": grader.next_steps,
    }

    rubric_reasoning = {
        "task_achievement": grader.task_achievement.reasoning,
        "coherence": grader.coherence.reasoning,
        "lexical": grader.lexical.reasoning,
        "grammar": grader.grammar.reasoning,
        "overall_pre_penalty": overall_pre_penalty,
        "word_count_penalty": penalty,
    }

    return {
        "task_achievement_band": ta,
        "coherence_band": cc,
        "lexical_band": lr,
        "grammar_band": gra,
        "overall_band": overall_after_penalty,
        "potential_band": None,
        "word_count_penalty": penalty,
        "feedback": feedback,
        "inline_annotations": annotations,
        "improved_version": None,
        "rubric_reasoning": rubric_reasoning,
        "roast_feedback": {},
        "model_version": model_version,
        "prompt_version": PROMPT_VERSION,
        "anchors_version": ANCHORS_VERSION,
        "latency_ms": latency_ms,
    }


def grade_essay_sync(
    *,
    task: WritingTask,
    essay_text: str,
    word_count: int,
    essay_hash: str,
) -> dict[str, Any]:
    settings = get_settings()
    client = _build_gemini_client()
    task_type_value = (
        task.task_type.value if isinstance(task.task_type, WritingTaskType) else str(task.task_type)
    )
    system_instruction = _build_system_instruction()
    prompt = _build_grading_prompt(
        task_type=task_type_value,
        task_prompt_text=_strip_html(task.prompt_html or ""),
        image_summary=task.image_summary or "",
        essay_text=essay_text,
    )
    seed = _seed_from_hash(essay_hash)

    started = time.perf_counter()
    grader = _call_grader(
        client=client,
        system_instruction=system_instruction,
        prompt=prompt,
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
    try:
        recovered_annotations = _call_annotation_recovery(
            client=client,
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
        word_count=word_count,
        word_minimum=word_minimum,
        model_version=settings.gemini_model,
        latency_ms=elapsed_ms,
    )

    improved_text: str | None = None
    potential_band: float | None = None
    try:
        improved_text = _generate_improved_version(
            client=client,
            essay_text=essay_text,
            annotations=annotations,
        )
        if improved_text and improved_text != essay_text:
            regrade_prompt = _build_grading_prompt(
                task_type=task_type_value,
                task_prompt_text=_strip_html(task.prompt_html or ""),
                image_summary=task.image_summary or "",
                essay_text=improved_text,
            )
            improved_seed = _seed_from_hash(
                hashlib.sha256(improved_text.encode("utf-8")).hexdigest()
            )
            regrade = _call_grader(
                client=client,
                system_instruction=system_instruction,
                prompt=regrade_prompt,
                seed=improved_seed,
            )
            potential_band = calculate_overall_band(
                round_to_ielts_band(regrade.task_achievement.band),
                round_to_ielts_band(regrade.coherence.band),
                round_to_ielts_band(regrade.lexical.band),
                round_to_ielts_band(regrade.grammar.band),
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
    try:
        roast = generate_roast(
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


async def grade_submission(submission_id: UUID) -> None:
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

    try:
        payload = grade_essay_sync(
            task=task,
            essay_text=essay_text,
            word_count=word_count,
            essay_hash=essay_hash,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Writing grading failed for submission %s", submission_id)
        async with session_maker() as session:
            result = await session.execute(
                select(WritingSubmission).where(WritingSubmission.id == submission_id)
            )
            submission = result.scalar_one_or_none()
            if submission is not None:
                submission.status = WritingSubmissionStatus.FAILED
                submission.error_message = str(exc)[:500]
                await session.commit()
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
                prompt_version=payload.get("prompt_version", PROMPT_VERSION),
                anchors_version=payload.get("anchors_version", ANCHORS_VERSION),
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
            evaluation.prompt_version = payload.get("prompt_version", PROMPT_VERSION)
            evaluation.anchors_version = payload.get("anchors_version", ANCHORS_VERSION)
            evaluation.latency_ms = payload.get("latency_ms", 0)
            evaluation.cache_hit = False
            evaluation.graded_at = graded_at

        submission_result = await session.execute(
            select(WritingSubmission).where(WritingSubmission.id == submission_id)
        )
        submission = submission_result.scalar_one_or_none()
        if submission is not None:
            submission.status = WritingSubmissionStatus.COMPLETED
            submission.error_message = None
        await session.commit()
