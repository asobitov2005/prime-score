from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_checker_dependencies import *
from app.services.writing_checker_part_01 import _HTML_TAG_RE, _WHITESPACE_RE


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

def _writing_generate_config(**kwargs: Any) -> genai_types.GenerateContentConfig:
    # Writing uses a dedicated Gemini model, and some model IDs reject
    # thinkingLevel/thinkingConfig entirely. Keep writing requests free of
    # thinking controls unless that model contract is revisited explicitly.
    return genai_types.GenerateContentConfig(**kwargs)

def _criterion_schema() -> genai_types.Schema:
    return genai_types.Schema(
        type=genai_types.Type.OBJECT,
        required=["band", "reasoning", "summary", "strengths", "improvements", "evidence_quotes"],
        properties={
            "band": genai_types.Schema(type=genai_types.Type.INTEGER, minimum=0, maximum=9),
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
