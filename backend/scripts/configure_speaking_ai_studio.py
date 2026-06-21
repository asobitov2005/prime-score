#!/usr/bin/env python3
"""One-shot: point speaking examiner at AI Studio + Gemini 3.1 Live + harsh roast prompt."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from uuid import uuid4

import sqlalchemy as sa

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@postgres:5432/primescore",
).replace("postgresql+asyncpg://", "postgresql://")

LIVE_MODEL_ID = "gemini-3.1-flash-live-preview"
ROAST_PROMPT = (
    "Mode: Uzbek Roast. You are a loud, sarcastic UZBEK MALE street coach in a live voice chat. "
    "Sound like a deep, confident man — not a polite teacher. Primary language: natural Uzbek (Latin). "
    "Freely mix Russian words and Russian-style curses the way people talk in Tashkent mahallas and on the street. "
    "Use authentic Uzbek chaqchaq, ko'cha ifodalar, and casual swearing aimed at weak answers, laziness, excuses, "
    "empty talk, bad grammar, and low effort. Roast hard: laugh at bad answers, argue back, interrupt rambling, "
    "push them to answer better. Be funny, chaotic, zero patience for excuses. "
    "After each roast burst, ask ONE clear follow-up question and wait. Never sound like an IELTS examiner. "
    "Safety boundary: insult answer quality, effort, and performance only — never protected-class slurs, "
    "no ethnicity/religion/nationality attacks, no violence or self-harm encouragement, no sexual threats, no extremism."
)

EXAMINER_SETTINGS = {
    "auth_mode": "ai_studio",
    "response_modalities": ["AUDIO"],
    "speech_config": {
        "voice_config": {"prebuilt_voice_config": {"voice_name": "Charon"}},
        "language_code": "uz-UZ",
    },
    "prompt_cache": {
        "enabled": True,
        "ttl_seconds": 3600,
        "cache_key": "uzbek-roast-live-v1",
    },
    "cost_controls": {
        "max_session_minutes": 15,
        "max_live_reconnects": 1,
        "send_only_active_part_context": True,
    },
    "system_instruction": (
        "You are PrimeScore Uzbek Roast — a live voice roast coach, not an exam. "
        "This is casual brutal banter for speaking practice. No band scores, no IELTS protocol."
    ),
    "mode_instructions": {
        "strict_exam": (
            "Mode: strict exam. Behave like a real IELTS Speaking examiner: professional, calm, human, and lightly encouraging. "
            "Ask one question at a time, do not coach, do not reveal scores, and keep timing/control exam-like."
        ),
        "free_talk": (
            "Mode: free talk. This is not an IELTS exam. Have an open, natural conversation about any topic the candidate chooses. "
            "Match the candidate's language when reasonable, keep the flow relaxed, ask curious follow-up questions, and let the topic move naturally. "
            "Do not grade, do not follow IELTS timing, and do not force the conversation back to exam structure unless the candidate asks."
        ),
        "uzbek_roast": ROAST_PROMPT,
    },
    "part_instructions": {
        "part_1": "Ask short familiar-topic questions, acknowledge answers naturally, and keep follow-ups brief.",
        "part_2": "Give the cue card, allow preparation time, then prompt the candidate to speak with calm human timing.",
        "part_3": "Ask abstract follow-up questions connected to the Part 2 topic, with natural curiosity and smooth transitions.",
    },
}


def _load_api_key() -> str:
    for env_name in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        value = (os.environ.get(env_name) or "").strip()
        if value.startswith("AIza"):
            return value
    candidates = [
        Path("/run/secrets/gemini_api_key"),
        Path.home() / ".local/share/opencode/auth.json",
    ]
    for path in candidates:
        if not path.exists():
            continue
        if path.suffix == ".json":
            payload = json.loads(path.read_text(encoding="utf-8"))
            google = payload.get("google") if isinstance(payload, dict) else None
            if isinstance(google, dict):
                key = str(google.get("key") or "").strip()
                if key.startswith("AIza"):
                    return key
        else:
            key = path.read_text(encoding="utf-8").strip()
            if key.startswith("AIza"):
                return key
    raise SystemExit("No AI Studio API key (AIza...) found in env or ~/.local/share/opencode/auth.json")


def main() -> int:
    api_key = _load_api_key()
    engine = sa.create_engine(DATABASE_URL)
    settings_json = json.dumps(EXAMINER_SETTINGS)
    capabilities = json.dumps(
        {
            "generate_content": False,
            "bidi_generate_content": True,
            "live_audio": True,
            "vision": False,
            "audio_input": True,
            "audio_output": True,
        }
    )

    with engine.begin() as conn:
        conn.execute(
            sa.text(
                """
                UPDATE ai_provider_configs
                SET api_key = :api_key, updated_at = now()
                WHERE provider = 'google'
                """
            ),
            {"api_key": api_key},
        )
        conn.execute(
            sa.text(
                """
                INSERT INTO ai_provider_models (
                    id, provider_config_id, model_id, display_name, family, capabilities,
                    context_window, is_accessible, is_selectable, sort_order, created_at, updated_at
                )
                SELECT
                    :model_row_id, p.id, :model_id, :display_name, 'gemini', CAST(:capabilities AS jsonb),
                    131072, true, true, 25, now(), now()
                FROM ai_provider_configs p
                WHERE p.provider = 'google'
                ON CONFLICT (provider_config_id, model_id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    capabilities = EXCLUDED.capabilities,
                    is_accessible = true,
                    is_selectable = true,
                    updated_at = now()
                """
            ),
            {
                "model_row_id": uuid4(),
                "model_id": LIVE_MODEL_ID,
                "display_name": "Gemini 3.1 Flash Live Preview (AI Studio)",
                "capabilities": capabilities,
            },
        )
        conn.execute(
            sa.text(
                """
                UPDATE ai_use_case_bindings b
                SET provider_model_id = m.id,
                    settings_json = CAST(:settings AS jsonb),
                    updated_at = now()
                FROM ai_provider_configs p
                JOIN ai_provider_models m ON m.provider_config_id = p.id AND m.model_id = :model_id
                WHERE b.use_case = 'speaking_examiner' AND p.provider = 'google'
                """
            ),
            {"model_id": LIVE_MODEL_ID, "settings": settings_json},
        )

    print("OK: speaking_examiner ->", LIVE_MODEL_ID, "(auth_mode=ai_studio, roast prompt updated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
