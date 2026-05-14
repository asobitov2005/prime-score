"""Sarcastic / savage feedback generator.

This is a SEPARATE Gemini call that runs AFTER the official IELTS grader.
It must NEVER influence the band scores. It receives the bands and the
essay, and produces witty, slightly rude, comedy-roast style feedback in
plain English.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from google.genai import types as genai_types
from pydantic import BaseModel, Field, ValidationError

from app.models.enums import WritingPromptKey
from app.services.ai_config import ResolvedAiUseCaseConfig
from app.services.ai_generation import generate_text_sync
from app.services.writing_config import WritingPromptBundle, render_roast_user_prompt

logger = logging.getLogger(__name__)


class _RoastPayload(BaseModel):
    overall_roast: str = ""
    one_liner: str = ""
    task_achievement_zinger: str = ""
    coherence_zinger: str = ""
    lexical_zinger: str = ""
    grammar_zinger: str = ""
    savage_tips: list[str] = Field(default_factory=list)
    pep_talk: str = ""


def _roast_schema() -> genai_types.Schema:
    str_field = genai_types.Schema(type=genai_types.Type.STRING)
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=[
            "overall_roast",
            "one_liner",
            "task_achievement_zinger",
            "coherence_zinger",
            "lexical_zinger",
            "grammar_zinger",
            "savage_tips",
            "pep_talk",
        ],
        properties={
            "overall_roast": str_field,
            "one_liner": str_field,
            "task_achievement_zinger": str_field,
            "coherence_zinger": str_field,
            "lexical_zinger": str_field,
            "grammar_zinger": str_field,
            "savage_tips": genai_types.Schema(
                type=genai_types.Type.ARRAY,
                items=str_field,
            ),
            "pep_talk": str_field,
        },
    )


def _writing_generate_config(**kwargs: Any) -> genai_types.GenerateContentConfig:
    return genai_types.GenerateContentConfig(**kwargs)


def _extract_json_payload(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = [line for line in text.splitlines() if not line.strip().startswith("```")]
        text = "\n".join(lines).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def _repair_roast_json(
    *,
    resolved_config: ResolvedAiUseCaseConfig,
    prompts: WritingPromptBundle,
    raw_text: str,
) -> str | None:
    repaired = generate_text_sync(
        config=resolved_config,
        system_instruction=prompts.entries[WritingPromptKey.ROAST_SYSTEM],
        prompt=(
            "Repair the broken roast JSON below so it becomes valid JSON matching "
            "the schema exactly. Preserve the same jokes and meaning where possible. "
            "Use [] for missing arrays, \"\" for missing strings, and output JSON only.\n\n"
            f"BROKEN JSON:\n{raw_text}"
        ),
        temperature=0,
        top_p=1,
        max_output_tokens=2048,
        response_mime_type="application/json",
        response_schema=_roast_schema(),
    )
    return repaired or None


def generate_roast(
    *,
    resolved_config: ResolvedAiUseCaseConfig | None,
    prompts: WritingPromptBundle,
    essay_text: str,
    bands: dict[str, float],
    word_count: int,
    word_minimum: int,
    annotation_count: int,
    overall_summary: str,
) -> dict[str, Any]:
    """Generate roast feedback. Failures are non-fatal and return an empty dict."""
    if resolved_config is None:
        return {}
    prompt = render_roast_user_prompt(
        prompts=prompts,
        essay_text=essay_text,
        bands=bands,
        word_count=word_count,
        word_minimum=word_minimum,
        annotation_count=annotation_count,
        overall_summary=overall_summary,
    )
    try:
        raw_text = generate_text_sync(
            config=resolved_config,
            system_instruction=prompts.entries[WritingPromptKey.ROAST_SYSTEM],
            prompt=prompt,
            temperature=0.75,
            top_p=0.9,
            max_output_tokens=2048,
            response_mime_type="application/json",
            response_schema=_roast_schema(),
        )
        if not raw_text:
            return {}
        try:
            data = json.loads(_extract_json_payload(raw_text))
            payload = _RoastPayload.model_validate(data)
            return payload.model_dump()
        except (json.JSONDecodeError, ValidationError):
            repaired = _repair_roast_json(
                resolved_config=resolved_config,
                prompts=prompts,
                raw_text=raw_text,
            )
            if not repaired:
                raise
            data = json.loads(_extract_json_payload(repaired))
            payload = _RoastPayload.model_validate(data)
            return payload.model_dump()
    except (json.JSONDecodeError, ValidationError):
        logger.warning("Roast feedback returned invalid JSON; skipping.")
        return {}
    except Exception:  # noqa: BLE001
        logger.exception("Roast feedback generation failed; skipping.")
        return {}
