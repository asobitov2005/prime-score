from __future__ import annotations

import asyncio
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import AiUseCase
from app.models.speaking import SpeakingEvaluation, SpeakingSession
from app.schemas.speaking import (
    SpeakingDiarizedTranscriptItem,
    SpeakingEvaluationRead,
    SpeakingStructuredFeedbackRead,
)
from app.services.ai_config import resolve_ai_use_case_config
from app.services.ai_generation import generate_text_sync


def string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def normalize_feedback_items(
    value: Any,
    category: str,
) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    items: list[dict[str, str]] = []
    for raw_item in value:
        if isinstance(raw_item, dict):
            issue = str(
                raw_item.get("issue")
                or raw_item.get("text")
                or raw_item.get("problem")
                or ""
            ).strip()
            if not issue:
                continue
            items.append(
                {
                    "category": str(
                        raw_item.get("category") or category
                    ).strip()
                    or category,
                    "issue": issue,
                    "why_it_matters": str(
                        raw_item.get("why_it_matters")
                        or raw_item.get("why")
                        or ""
                    ).strip(),
                    "example": str(
                        raw_item.get("example")
                        or raw_item.get("example_from_transcript")
                        or ""
                    ).strip(),
                    "fix": str(
                        raw_item.get("fix")
                        or raw_item.get("suggested_fix")
                        or ""
                    ).strip(),
                    "practice": str(
                        raw_item.get("practice")
                        or raw_item.get("practice_drill")
                        or ""
                    ).strip(),
                }
            )
        else:
            issue = str(raw_item).strip()
            if issue:
                items.append(
                    {
                        "category": category,
                        "issue": issue,
                        "why_it_matters": "",
                        "example": "",
                        "fix": "",
                        "practice": "",
                    }
                )
    return items


def build_structured_feedback(payload: dict[str, Any]) -> dict[str, Any]:
    criteria_feedback_raw = payload.get("criteria_feedback")
    criteria_feedback = (
        criteria_feedback_raw
        if isinstance(criteria_feedback_raw, dict)
        else {}
    )
    error_feedback = normalize_feedback_items(
        payload.get("error_feedback"),
        "General",
    )
    if not error_feedback:
        error_feedback = [
            *normalize_feedback_items(payload.get("critical_issues"), "Critical"),
            *normalize_feedback_items(
                payload.get("pronunciation_issues"),
                "Pronunciation",
            ),
            *normalize_feedback_items(payload.get("grammar_issues"), "Grammar"),
            *normalize_feedback_items(
                payload.get("lexical_issues"),
                "Lexical resource",
            ),
        ]
    return {
        "criteria_feedback": criteria_feedback,
        "error_feedback": error_feedback,
        "strengths": string_list(payload.get("strengths")),
        "improvement_actions": string_list(payload.get("improvement_actions")),
    }


def safe_band(value: Any) -> float | None:
    try:
        number = round(float(value) * 2) / 2
    except (TypeError, ValueError):
        return None
    return min(9.0, max(0.0, number))


def extract_json_object(text: str) -> dict[str, Any]:
    try:
        payload = json.loads(text)
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                payload = json.loads(text[start : end + 1])
                return payload if isinstance(payload, dict) else {}
            except json.JSONDecodeError:
                return {}
    return {}


def serialize_evaluation(
    row: SpeakingEvaluation | None,
) -> SpeakingEvaluationRead | None:
    if row is None:
        return None
    return SpeakingEvaluationRead(
        overall_band=row.overall_band,
        fluency_band=row.fluency_band,
        lexical_band=row.lexical_band,
        grammar_band=row.grammar_band,
        pronunciation_band=row.pronunciation_band,
        summary_feedback=row.summary_feedback or "",
        strengths=string_list(row.strengths),
        critical_issues=string_list(row.critical_issues),
        pronunciation_issues=string_list(row.pronunciation_issues),
        grammar_issues=string_list(row.grammar_issues),
        lexical_issues=string_list(row.lexical_issues),
        improvement_actions=string_list(row.improvement_actions),
        deep_feedback_markdown=row.deep_feedback_markdown or "",
        evaluator_model=row.evaluator_model,
        rubric_version=row.rubric_version,
    )


def serialize_diarized_transcript(
    value: Any,
) -> list[SpeakingDiarizedTranscriptItem]:
    if not isinstance(value, list):
        return []
    items: list[SpeakingDiarizedTranscriptItem] = []
    for raw_item in value:
        if not isinstance(raw_item, dict):
            continue
        text = str(raw_item.get("text") or "").strip()
        role = str(raw_item.get("role") or "").strip()
        if not text or not role:
            continue
        offset_raw = raw_item.get("offset_ms")
        try:
            offset_ms = int(offset_raw) if offset_raw is not None else None
        except (TypeError, ValueError):
            offset_ms = None
        items.append(
            SpeakingDiarizedTranscriptItem(
                role=role,
                text=text,
                at=str(raw_item.get("at") or "") or None,
                offset_ms=offset_ms,
            )
        )
    return items


def serialize_structured_feedback(
    value: Any,
) -> SpeakingStructuredFeedbackRead:
    payload = value if isinstance(value, dict) else {}
    return SpeakingStructuredFeedbackRead(
        criteria_feedback=(
            payload.get("criteria_feedback")
            if isinstance(payload.get("criteria_feedback"), dict)
            else {}
        ),
        error_feedback=(
            payload.get("error_feedback")
            if isinstance(payload.get("error_feedback"), list)
            else []
        ),
        strengths=string_list(payload.get("strengths")),
        improvement_actions=string_list(payload.get("improvement_actions")),
    )


async def grade_speaking_session(
    db: AsyncSession,
    *,
    speaking_session: SpeakingSession,
    transcript: str,
) -> SpeakingEvaluation | None:
    if not transcript.strip():
        return None
    existing = await db.scalar(
        select(SpeakingEvaluation).where(
            SpeakingEvaluation.speaking_session_id == speaking_session.id
        )
    )
    if existing is not None:
        return existing

    grader_config = await resolve_ai_use_case_config(
        db,
        AiUseCase.SPEAKING_GRADER,
    )
    settings = grader_config.settings_json or {}
    system_prompt = str(
        settings.get("system_prompt")
        or "You are a strict IELTS Speaking examiner. Return valid JSON."
    )
    prompt_template = str(
        settings.get("user_prompt_template")
        or (
            "Evaluate this IELTS Speaking session transcript. Return overall_band, "
            "fluency_band, lexical_band, grammar_band, pronunciation_band, "
            "summary_feedback, strengths, critical_issues, pronunciation_issues, "
            "grammar_issues, lexical_issues, improvement_actions, "
            "deep_feedback_markdown, criteria_feedback, and error_feedback. "
            "criteria_feedback must contain fluency, lexical, grammar, and "
            "pronunciation objects with feedback and next_step. error_feedback must "
            "be an array where each item has category, issue, why_it_matters, "
            "example_from_transcript, suggested_fix, and practice_drill. Be specific "
            "to the candidate's transcript.\n\n{transcript}"
        )
    )
    prompt = prompt_template.replace("{transcript}", transcript)
    max_output_tokens = int(
        (settings.get("cost_controls") or {}).get("max_output_tokens") or 1800
    )
    text = await asyncio.to_thread(
        generate_text_sync,
        config=grader_config,
        prompt=prompt,
        system_instruction=system_prompt,
        temperature=0,
        max_output_tokens=max_output_tokens,
        response_mime_type="application/json",
        operation="speaking_grading",
    )
    payload = extract_json_object(text)
    metadata = dict(speaking_session.session_metadata or {})
    metadata["structured_feedback"] = build_structured_feedback(payload)
    speaking_session.session_metadata = metadata
    evaluation = SpeakingEvaluation(
        speaking_session_id=speaking_session.id,
        overall_band=safe_band(payload.get("overall_band")),
        fluency_band=safe_band(payload.get("fluency_band")),
        lexical_band=safe_band(payload.get("lexical_band")),
        grammar_band=safe_band(payload.get("grammar_band")),
        pronunciation_band=safe_band(payload.get("pronunciation_band")),
        summary_feedback=str(payload.get("summary_feedback") or "").strip(),
        strengths=string_list(payload.get("strengths")),
        critical_issues=string_list(payload.get("critical_issues")),
        pronunciation_issues=string_list(payload.get("pronunciation_issues")),
        grammar_issues=string_list(payload.get("grammar_issues")),
        lexical_issues=string_list(payload.get("lexical_issues")),
        improvement_actions=string_list(payload.get("improvement_actions")),
        deep_feedback_markdown=str(
            payload.get("deep_feedback_markdown") or ""
        ).strip(),
        evaluator_model=grader_config.model_id,
        rubric_version=str(settings.get("rubric_version") or "ielts-speaking-v1"),
    )
    db.add(evaluation)
    await db.flush()
    return evaluation
