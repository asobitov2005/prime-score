from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.ai_config_dependencies import *
from app.services.ai_config_part_01 import ResolvedAiUseCaseConfig, _normalize_groq_family, supports_use_case_binding
from app.services.ai_config_part_02 import build_groq_client

async def _sync_groq_models(provider_config: AiProviderConfig) -> list[dict[str, Any]]:
    client = build_groq_client(
        ResolvedAiUseCaseConfig(
            use_case=AiUseCase.WRITING_GRADER,
            provider=AiProvider.GROQ,
            provider_config_id=provider_config.id,
            provider_label=provider_config.label,
            api_key=provider_config.api_key.strip(),
            base_url=(provider_config.base_url or "").strip() or None,
            model_id="",
            model_record_id=None,
            context_window=None,
            settings_json={},
        )
    )
    models = client.models.list()
    rows: list[dict[str, Any]] = []
    for item in list(getattr(models, "data", None) or []):
        payload = item.model_dump(exclude_none=True) if hasattr(item, "model_dump") else dict(item)
        model_id = str(payload.get("id") or payload.get("model") or "")
        if not model_id:
            continue
        lowered = model_id.lower()
        if any(token in lowered for token in ("whisper", "audio", "tts", "speech", "playai")):
            continue
        rows.append(
            {
                "model_id": model_id,
                "display_name": str(payload.get("name") or payload.get("display_name") or model_id),
                "family": _normalize_groq_family(model_id),
                "capabilities": {
                    "generate_content": True,
                    "vision": False,
                    "audio_input": False,
                    "audio_output": False,
                },
                "context_window": payload.get("context_window") or payload.get("contextWindow"),
                "is_accessible": True,
                "is_selectable": True,
            }
        )
    return rows

async def ensure_provider_configs_seeded(
    session: AsyncSession,
    *,
    google_api_key: str | None,
    cerebras_api_key: str | None,
    groq_api_key: str | None = None,
) -> None:
    settings = get_settings()
    defaults = [
        {
            "provider": AiProvider.GOOGLE,
            "label": "Google",
            "api_key": (google_api_key or "").strip(),
            "is_enabled": bool((google_api_key or "").strip() or settings.google_genai_use_vertexai),
        },
        {
            "provider": AiProvider.CEREBRAS,
            "label": "Cerebras",
            "api_key": (cerebras_api_key or "").strip(),
            "is_enabled": bool((cerebras_api_key or "").strip()),
        },
        {
            "provider": AiProvider.GROQ,
            "label": "Groq",
            "api_key": (groq_api_key or "").strip(),
            "is_enabled": bool((groq_api_key or "").strip()),
        },
    ]
    for item in defaults:
        existing = await session.scalar(
            select(AiProviderConfig).where(AiProviderConfig.provider == item["provider"])
        )
        if existing is not None:
            if item["api_key"] and not (existing.api_key or "").strip():
                existing.api_key = item["api_key"]
                existing.is_enabled = True
            elif item["provider"] == AiProvider.GOOGLE and settings.google_genai_use_vertexai:
                existing.is_enabled = True
            continue
        session.add(
            AiProviderConfig(
                provider=item["provider"],
                label=item["label"],
                api_key=item["api_key"],
                is_enabled=bool(item["is_enabled"]),
            )
        )
    await session.flush()

async def seed_default_use_case_bindings(session: AsyncSession) -> None:
    providers = {
        row.provider: row
        for row in (
            await session.scalars(select(AiProviderConfig))
        ).all()
    }
    google = providers.get(AiProvider.GOOGLE)
    if google is None:
        return
    google_models = (
        await session.scalars(
            select(AiProviderModel)
            .where(AiProviderModel.provider_config_id == google.id, AiProviderModel.is_selectable.is_(True))
            .order_by(AiProviderModel.sort_order.asc())
        )
    ).all()
    if not google_models:
        return
    def choose_model_for_use_case(use_case: AiUseCase) -> AiProviderModel:
        for model in google_models:
            if supports_use_case_binding(dict(model.capabilities or {}), use_case, google.provider):
                return model
        return google_models[0]

    for use_case in AiUseCase:
        existing = await session.scalar(
            select(AiUseCaseBinding).where(AiUseCaseBinding.use_case == use_case)
        )
        if existing is not None:
            continue
        default_model = choose_model_for_use_case(use_case)
        session.add(
            AiUseCaseBinding(
                use_case=use_case,
                provider_config_id=google.id,
                provider_model_id=default_model.id,
                settings_json=default_settings_for_use_case(use_case),
            )
        )
    await session.flush()

def default_settings_for_use_case(use_case: AiUseCase) -> dict[str, Any]:
    if use_case == AiUseCase.SPEAKING_EXAMINER:
        return {
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
                "uzbek_roast": UZBEK_ROAST_MODE_INSTRUCTION,
            },
            "part_instructions": {
                "part_1": "Ask short familiar-topic questions, acknowledge answers naturally, and keep follow-ups brief.",
                "part_2": "Give the cue card, allow preparation time, then prompt the candidate to speak with calm human timing.",
                "part_3": "Ask abstract follow-up questions connected to the Part 2 topic, with natural curiosity and smooth transitions.",
            },
        }
    if use_case == AiUseCase.SPEAKING_GRADER:
        return {
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
            "system_prompt": (
                "You are a strict IELTS Speaking examiner. Score only from the transcript and return valid JSON."
            ),
            "user_prompt_template": (
                "Evaluate this IELTS Speaking session transcript. Return overall_band, fluency_band, "
                "lexical_band, grammar_band, pronunciation_band, summary_feedback, strengths, critical_issues, "
                "pronunciation_issues, grammar_issues, lexical_issues, and improvement_actions.\n\n{transcript}"
            ),
        }
    return {}

def mask_secret(value: str | None) -> str | None:
    text = (value or "").strip()
    if not text:
        return None
    if len(text) <= 8:
        return "*" * len(text)
    return f"{text[:4]}{'*' * max(4, len(text) - 8)}{text[-4:]}"

async def fetch_cerebras_public_models() -> dict[str, dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get("https://api.cerebras.ai/public/v1/models")
        response.raise_for_status()
        payload = response.json()
    by_id: dict[str, dict[str, Any]] = {}
    for item in list(payload.get("data") or []):
        model_id = str(item.get("id") or "")
        if model_id:
            by_id[model_id] = item
    return by_id
