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

from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel, Field, ValidationError

from app.core.config import get_settings

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


_SYSTEM = (
    "You are a stand-up comedian who moonlights as an IELTS coach. Your job "
    "is to roast the candidate's essay with sharp, witty, slightly rude "
    "humour — like a grumpy older sibling who still wants them to pass. "
    "Rules:\n"
    "- The IELTS bands are ALREADY DECIDED elsewhere. Do NOT propose new "
    "bands. Do NOT contradict the bands you are given. Just react to them.\n"
    "- Be funny first, useful second. Sarcasm, light teasing, dry burns — "
    "yes. Cruelty, slurs, attacks on intelligence, race, gender, "
    "appearance, mental health — absolutely NOT.\n"
    "- Tease the WRITING, not the writer.\n"
    "- Keep it in plain English (the candidate can read English well "
    "enough to take IELTS). Short, punchy sentences.\n"
    "- Quote tiny snippets from the essay when roasting specific moments. "
    "Do NOT invent quotes.\n"
    "- End with a tiny pep_talk that's still cheeky but supportive.\n"
    "- Output JSON only. No markdown, no preamble.\n"
)


def _build_prompt(
    *,
    essay_text: str,
    bands: dict[str, float],
    word_count: int,
    word_minimum: int,
    annotation_count: int,
    overall_summary: str,
) -> str:
    return (
        "BANDS (locked, do not change):\n"
        f"  Task Achievement: {bands.get('task_achievement')}\n"
        f"  Coherence & Cohesion: {bands.get('coherence')}\n"
        f"  Lexical Resource: {bands.get('lexical')}\n"
        f"  Grammar: {bands.get('grammar')}\n"
        f"  Overall: {bands.get('overall')}\n\n"
        f"WORD COUNT: {word_count} (minimum {word_minimum})\n"
        f"DETECTED ERRORS: {annotation_count}\n"
        f"NEUTRAL EXAMINER SUMMARY (for context, do not copy):\n"
        f"{overall_summary or '(none)'}\n\n"
        "Now roast the essay. Use this structure:\n"
        "- overall_roast: 2-4 sentences. Set the tone.\n"
        "- one_liner: a single savage sentence the candidate could put on "
        "a t-shirt.\n"
        "- task_achievement_zinger / coherence_zinger / lexical_zinger / "
        "grammar_zinger: one snarky sentence per criterion, ideally "
        "referencing what actually happened (or didn't) in the essay.\n"
        "- savage_tips: 3-5 short bullet points. Each is a real, useful "
        "tip delivered with attitude. Prefix with the fix, not the insult.\n"
        "- pep_talk: 1-2 sentences. Still cheeky, but ends on hope.\n\n"
        "===== CANDIDATE ESSAY START =====\n"
        f"{essay_text}\n"
        "===== CANDIDATE ESSAY END ====="
    )


def _build_client() -> genai.Client | None:
    settings = get_settings()
    if not (settings.gemini_api_key or "").strip():
        return None
    return genai.Client(api_key=settings.gemini_api_key)


def generate_roast(
    *,
    essay_text: str,
    bands: dict[str, float],
    word_count: int,
    word_minimum: int,
    annotation_count: int,
    overall_summary: str,
) -> dict[str, Any]:
    """Generate roast feedback. Failures are non-fatal and return an empty dict."""
    client = _build_client()
    if client is None:
        return {}
    settings = get_settings()
    config = genai_types.GenerateContentConfig(
        systemInstruction=_SYSTEM,
        temperature=0.9,
        topP=0.95,
        maxOutputTokens=2048,
        responseMimeType="application/json",
        responseSchema=_roast_schema(),
        thinkingConfig=genai_types.ThinkingConfig(
            thinkingLevel=genai_types.ThinkingLevel.MINIMAL,
        ),
    )
    prompt = _build_prompt(
        essay_text=essay_text,
        bands=bands,
        word_count=word_count,
        word_minimum=word_minimum,
        annotation_count=annotation_count,
        overall_summary=overall_summary,
    )
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=config,
        )
        raw_text = (response.text or "").strip()
        if not raw_text:
            return {}
        data = json.loads(raw_text)
        payload = _RoastPayload.model_validate(data)
        return payload.model_dump()
    except (json.JSONDecodeError, ValidationError):
        logger.warning("Roast feedback returned invalid JSON; skipping.")
        return {}
    except Exception:  # noqa: BLE001
        logger.exception("Roast feedback generation failed; skipping.")
        return {}
