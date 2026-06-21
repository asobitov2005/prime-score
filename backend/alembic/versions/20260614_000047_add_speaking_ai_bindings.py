"""add speaking AI examiner and grader bindings

Revision ID: 20260614_000047
Revises: 20260608_000046
Create Date: 2026-06-14
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260614_000047"
down_revision: str | None = "20260608_000046"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


LIVE_MODEL_ID = "gemini-live-2.5-flash-native-audio"
GRADER_MODEL_ID = "gemini-2.5-flash-lite"

EXAMINER_SETTINGS = {
    "response_modalities": ["AUDIO"],
    "prompt_cache": {
        "enabled": True,
        "ttl_seconds": 3600,
        "cache_key": "ielts-speaking-examiner-v3-admin-modes",
    },
    "cost_controls": {
        "max_session_minutes": 15,
        "max_live_reconnects": 1,
        "send_only_active_part_context": True,
    },
    "system_instruction": (
        "You are the PrimeScore IELTS Speaking examiner. Run one IELTS Speaking part at a time. "
        "Sound like a real human examiner: warm, calm, professional, lightly expressive, and naturally curious. "
        "Ask concise examiner questions, use brief natural acknowledgements, and do not reveal band scores."
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
        "uzbek_roast": (
            "Mode: Uzbek roast. Speak mainly in Uzbek or Uzbek-English mix. Be extremely blunt, sarcastic, confrontational, and funny like a harsh coach. "
            "You may use rough Uzbek street-style wording and ordinary profanity aimed at laziness, excuses, weak answers, or poor effort. "
            "Roast the candidate's performance hard, argue back, interrupt rambling, and push them to answer better. "
            "Safety boundary: do not praise Nazism or extremist ideology, do not use protected-class slurs, do not attack ethnicity, religion, nationality, race, gender, disability, or sexuality, "
            "do not encourage violence or self-harm, and do not make sexual threats. Keep the abuse focused on answer quality, effort, and exam performance."
        ),
    },
    "part_instructions": {
        "part_1": "Ask short familiar-topic questions, acknowledge answers naturally, and keep follow-ups brief.",
        "part_2": "Give the cue card, allow preparation time, then prompt the candidate to speak with calm human timing.",
        "part_3": "Ask abstract follow-up questions connected to the Part 2 topic, with natural curiosity and smooth transitions.",
    },
}

GRADER_SETTINGS = {
    "rubric_version": "ielts-speaking-v1",
    "prompt_cache": {
        "enabled": True,
        "ttl_seconds": 86400,
        "cache_key": "ielts-speaking-grader-rubric-v1",
    },
    "cost_controls": {
        "call_policy": "final_transcript_only",
        "soft_total_token_budget": 12000,
        "max_output_tokens": 1800,
    },
    "system_prompt": "You are a strict IELTS Speaking examiner. Score only from the transcript and return valid JSON.",
    "user_prompt_template": (
        "Evaluate this IELTS Speaking session transcript. Return overall_band, fluency_band, lexical_band, "
        "grammar_band, pronunciation_band, summary_feedback, strengths, critical_issues, pronunciation_issues, "
        "grammar_issues, lexical_issues, and improvement_actions.\n\n{transcript}"
    ),
}


def _upsert_google_model(model_id: str, display_name: str, capabilities: dict, sort_order: int) -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO ai_provider_models (
                id, provider_config_id, model_id, display_name, family, capabilities,
                context_window, is_accessible, is_selectable, sort_order, created_at, updated_at
            )
            SELECT
                :id, p.id, :model_id, :display_name, 'gemini', CAST(:capabilities AS jsonb),
                NULL, true, true, :sort_order, now(), now()
            FROM ai_provider_configs p
            WHERE p.provider = 'google'
            ON CONFLICT (provider_config_id, model_id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                capabilities = EXCLUDED.capabilities,
                is_accessible = true,
                is_selectable = true,
                updated_at = now()
            """
        ).bindparams(
            sa.bindparam("id", value=uuid4(), type_=postgresql.UUID(as_uuid=True)),
            sa.bindparam("model_id", value=model_id),
            sa.bindparam("display_name", value=display_name),
            sa.bindparam("capabilities", value=json.dumps(capabilities), type_=sa.Text()),
            sa.bindparam("sort_order", value=sort_order),
        )
    )


def _upsert_binding(use_case: str, model_id: str, settings: dict) -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO ai_use_case_bindings (
                id, use_case, provider_config_id, provider_model_id, settings_json, created_at, updated_at
            )
            SELECT
                :id, :use_case, p.id, m.id, CAST(:settings AS jsonb), now(), now()
            FROM ai_provider_configs p
            JOIN ai_provider_models m ON m.provider_config_id = p.id AND m.model_id = :model_id
            WHERE p.provider = 'google'
            ON CONFLICT (use_case) DO NOTHING
            """
        ).bindparams(
            sa.bindparam("id", value=uuid4(), type_=postgresql.UUID(as_uuid=True)),
            sa.bindparam("use_case", value=use_case),
            sa.bindparam("model_id", value=model_id),
            sa.bindparam("settings", value=json.dumps(settings), type_=sa.Text()),
        )
    )


def upgrade() -> None:
    _upsert_google_model(
        LIVE_MODEL_ID,
        "Gemini 3.1 Flash Live Preview",
        {
            "generate_content": False,
            "bidi_generate_content": True,
            "live_audio": True,
            "vision": False,
            "audio_input": True,
            "audio_output": True,
        },
        30,
    )
    _upsert_google_model(
        GRADER_MODEL_ID,
        "Gemini 2.5 Flash Lite",
        {
            "generate_content": True,
            "bidi_generate_content": False,
            "live_audio": False,
            "vision": True,
            "audio_input": True,
            "audio_output": False,
        },
        31,
    )
    _upsert_binding("speaking_examiner", LIVE_MODEL_ID, EXAMINER_SETTINGS)
    _upsert_binding("speaking_grader", GRADER_MODEL_ID, GRADER_SETTINGS)


def downgrade() -> None:
    op.execute("DELETE FROM ai_use_case_bindings WHERE use_case IN ('speaking_examiner', 'speaking_grader')")
