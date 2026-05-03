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
from pydantic import BaseModel, Field, ValidationError
from redis import Redis
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
from app.services.writing_rubric import (
    IELTS_WRITING_RUBRIC_TEXT,
    calculate_overall_band,
    round_to_ielts_band,
)

logger = logging.getLogger(__name__)


_HTML_TAG_RE = re.compile(r"</?[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")
_CACHE_PREFIX = "wr:eval:v1:"
_IMPROVED_CACHE_PREFIX = "wr:improved:v1:"
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


class _GraderPayload(BaseModel):
    task_achievement: _CriterionPayload
    coherence: _CriterionPayload
    lexical: _CriterionPayload
    grammar: _CriterionPayload
    overall_summary: str = ""
    next_steps: list[str] = Field(default_factory=list)
    inline_annotations: list[_AnnotationPayload] = Field(default_factory=list)


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


def _redis_client() -> Redis:
    settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=True)


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
        "describe.\n\n"
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
        "(error, warning, or suggestion), a short_message and a brief "
        "explanation. Do not annotate stylistic preferences as errors."
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
    cleaned: list[dict[str, Any]] = []
    essay_len = len(essay_text)
    for ann in annotations:
        if ann.offset < 0 or ann.length <= 0:
            continue
        end = ann.offset + ann.length
        if end > essay_len:
            continue
        actual = essay_text[ann.offset:end]
        if ann.original and actual != ann.original:
            continue
        try:
            category = WritingErrorCategory(ann.category.strip().lower())
        except ValueError:
            continue
        severity = ann.severity.strip().lower() if ann.severity else "warning"
        if severity not in _ALLOWED_SEVERITIES:
            severity = "warning"
        cleaned.append(
            {
                "offset": ann.offset,
                "length": ann.length,
                "original": actual,
                "replacements": [r for r in ann.replacements if isinstance(r, str)][:5],
                "category": category.value,
                "severity": severity,
                "short_message": ann.short_message or "",
                "explanation": ann.explanation or "",
            }
        )
    return cleaned


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
            data = json.loads(raw_text)
            return _GraderPayload.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = exc
            continue
    raise RuntimeError(f"Grader returned invalid JSON: {last_error}")


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
        "model_version": model_version,
        "prompt_version": PROMPT_VERSION,
        "anchors_version": ANCHORS_VERSION,
        "latency_ms": latency_ms,
        "cache_hit": False,
    }


def grade_essay_sync(
    *,
    task: WritingTask,
    essay_text: str,
    word_count: int,
    essay_hash: str,
) -> dict[str, Any]:
    redis_client = _redis_client()
    cache_key = f"{_CACHE_PREFIX}{essay_hash}"
    try:
        cached = redis_client.get(cache_key)
    except Exception:  # noqa: BLE001
        logger.exception("Redis read failed for %s", cache_key)
        cached = None
    if cached:
        try:
            payload = json.loads(cached)
            payload["cache_hit"] = True
            return payload
        except json.JSONDecodeError:
            logger.warning("Discarding malformed cache entry %s", cache_key)

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
    annotations = _validate_annotations(grader.inline_annotations, essay_text)

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

    improved_cache_key = f"{_IMPROVED_CACHE_PREFIX}{essay_hash}"
    improved_text: str | None = None
    potential_band: float | None = None
    try:
        improved_cached = redis_client.get(improved_cache_key)
    except Exception:  # noqa: BLE001
        improved_cached = None

    if improved_cached:
        try:
            improved_payload = json.loads(improved_cached)
            improved_text = improved_payload.get("improved_version")
            potential_band = improved_payload.get("potential_band")
        except json.JSONDecodeError:
            improved_text = None

    if improved_text is None:
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
            try:
                redis_client.setex(
                    improved_cache_key,
                    60 * 60 * 24 * 30,
                    json.dumps(
                        {
                            "improved_version": improved_text,
                            "potential_band": potential_band,
                        }
                    ),
                )
            except Exception:  # noqa: BLE001
                logger.exception("Redis write failed for %s", improved_cache_key)
        except Exception:  # noqa: BLE001
            logger.exception("Improved version generation failed")
            improved_text = None
            potential_band = None

    payload["improved_version"] = improved_text
    payload["potential_band"] = potential_band

    try:
        redis_client.setex(cache_key, 60 * 60 * 24 * 30, json.dumps(payload))
    except Exception:  # noqa: BLE001
        logger.exception("Redis write failed for %s", cache_key)

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
                model_version=payload.get("model_version", ""),
                prompt_version=payload.get("prompt_version", PROMPT_VERSION),
                anchors_version=payload.get("anchors_version", ANCHORS_VERSION),
                latency_ms=payload.get("latency_ms", 0),
                cache_hit=payload.get("cache_hit", False),
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
            evaluation.model_version = payload.get("model_version", "")
            evaluation.prompt_version = payload.get("prompt_version", PROMPT_VERSION)
            evaluation.anchors_version = payload.get("anchors_version", ANCHORS_VERSION)
            evaluation.latency_ms = payload.get("latency_ms", 0)
            evaluation.cache_hit = payload.get("cache_hit", False)
            evaluation.graded_at = graded_at

        submission_result = await session.execute(
            select(WritingSubmission).where(WritingSubmission.id == submission_id)
        )
        submission = submission_result.scalar_one_or_none()
        if submission is not None:
            submission.status = WritingSubmissionStatus.COMPLETED
            submission.error_message = None
        await session.commit()
