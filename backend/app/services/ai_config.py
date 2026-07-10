from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import httpx
from google import genai
from google.oauth2 import service_account
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.ai import AiProviderConfig, AiProviderModel, AiUseCaseBinding
from app.models.enums import AiProvider, AiUseCase
from app.services.speaking_roast_prompt import UZBEK_ROAST_MODE_INSTRUCTION

try:
    from cerebras.cloud.sdk import Cerebras
except Exception:  # noqa: BLE001
    Cerebras = None  # type: ignore[assignment]

try:
    from groq import Groq
except Exception:  # noqa: BLE001
    Groq = None  # type: ignore[assignment]


RESOLVER_TTL_SECONDS = 30
GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"

_resolver_cache: dict[str, tuple[float, "ResolvedAiUseCaseConfig"]] = {}


@dataclass(slots=True)
class ResolvedAiUseCaseConfig:
    use_case: AiUseCase
    provider: AiProvider
    provider_config_id: UUID | None
    provider_label: str
    api_key: str
    base_url: str | None
    model_id: str
    model_record_id: UUID | None
    settings_json: dict[str, Any]
    context_window: int | None = None
    source: str = "db"


def invalidate_ai_config_cache() -> None:
    _resolver_cache.clear()


def _strip_model_prefix(name: str) -> str:
    text = str(name or "").strip()
    for prefix in (
        "models/",
        "publishers/google/models/",
        "projects/./locations/./models/",
        "google/",
    ):
        if text.startswith(prefix):
            return text[len(prefix) :]
    return text


def _normalize_cerebras_family(model_id: str) -> str:
    lowered = model_id.lower()
    for prefix in ("llama", "gpt-oss", "qwen", "zai-glm", "deepseek"):
        if lowered.startswith(prefix):
            return prefix
    return lowered.split("-", 1)[0]


def _normalize_groq_family(model_id: str) -> str:
    lowered = model_id.lower()
    if "/" in lowered:
        lowered = lowered.split("/", 1)[1]
    for prefix in ("gpt-oss", "llama", "qwen", "gemma", "mixtral", "deepseek", "whisper", "playai"):
        if lowered.startswith(prefix):
            return prefix
    return lowered.split("-", 1)[0]


def _google_capabilities_from_payload(payload: dict[str, Any]) -> dict[str, Any]:
    model_id = _strip_model_prefix(str(payload.get("name") or payload.get("model") or ""))
    lowered_model_id = model_id.lower()
    supported = payload.get("supported_actions") or payload.get("supportedActions") or []
    input_modalities = payload.get("input_modalities") or payload.get("inputModalities") or []
    output_modalities = payload.get("output_modalities") or payload.get("outputModalities") or []
    supported_lower = {str(item).lower() for item in supported}
    is_live_model = "live" in lowered_model_id or "native-audio" in lowered_model_id
    has_bidi = any("bidigeneratecontent" in item for item in supported_lower)
    return {
        "generate_content": any("generatecontent" in item for item in supported_lower),
        "bidi_generate_content": has_bidi,
        "live_audio": has_bidi or is_live_model,
        "vision": "IMAGE" in {str(item).upper() for item in input_modalities} or "image" in lowered_model_id,
        "audio_input": "AUDIO" in {str(item).upper() for item in input_modalities} or is_live_model or "audio" in lowered_model_id,
        "audio_output": "AUDIO" in {str(item).upper() for item in output_modalities} or is_live_model or "tts" in lowered_model_id,
    }


def supports_use_case_binding(capabilities: dict[str, Any], use_case: AiUseCase, provider: AiProvider) -> bool:
    if use_case in {
        AiUseCase.WRITING_GRADER,
        AiUseCase.WRITING_IMPROVER,
        AiUseCase.WRITING_ROAST,
    }:
        return provider in {AiProvider.GOOGLE, AiProvider.CEREBRAS, AiProvider.GROQ}
    if use_case == AiUseCase.ADMIN_CHAT:
        return provider in {AiProvider.GOOGLE, AiProvider.CEREBRAS}
    if use_case == AiUseCase.WRITING_IMAGE_SUMMARY:
        return bool(capabilities.get("vision")) and provider == AiProvider.GOOGLE
    if use_case == AiUseCase.AUDIO_TRANSCRIPTION:
        return bool(capabilities.get("audio_input")) and provider == AiProvider.GOOGLE
    if use_case == AiUseCase.SPEAKING_EXAMINER:
        return bool(capabilities.get("live_audio") or capabilities.get("bidi_generate_content")) and provider == AiProvider.GOOGLE
    if use_case == AiUseCase.SPEAKING_GRADER:
        return provider in {AiProvider.GOOGLE, AiProvider.CEREBRAS, AiProvider.GROQ} and bool(
            capabilities.get("generate_content", True)
        )
    return False


def _google_fallback_for_use_case(use_case: AiUseCase) -> str:
    settings = get_settings()
    if use_case in {
        AiUseCase.WRITING_GRADER,
        AiUseCase.WRITING_IMPROVER,
        AiUseCase.WRITING_ROAST,
        AiUseCase.WRITING_IMAGE_SUMMARY,
    }:
        return (settings.gemini_writing_model or settings.gemini_model).strip()
    if use_case == AiUseCase.SPEAKING_EXAMINER:
        return settings.gemini_speaking_live_model.strip()
    if use_case == AiUseCase.SPEAKING_GRADER:
        return settings.gemini_speaking_grader_model.strip()
    if use_case == AiUseCase.AUDIO_TRANSCRIPTION:
        return (settings.gemini_transcription_model or settings.gemini_model).strip()
    return settings.gemini_model.strip()


def _vertex_location_for_config(config: ResolvedAiUseCaseConfig) -> str:
    settings = get_settings()
    default_location = (settings.google_cloud_location or "global").strip()
    live_location = (settings.google_cloud_live_location or "us-central1").strip()
    if config.use_case == AiUseCase.SPEAKING_EXAMINER:
        return live_location
    model_id = (config.model_id or "").lower()
    if "live" in model_id or "native-audio" in model_id:
        return live_location
    return default_location


def _is_vertex_google_enabled() -> bool:
    return bool(get_settings().google_genai_use_vertexai)


async def resolve_ai_use_case_config(
    session: AsyncSession,
    use_case: AiUseCase,
) -> ResolvedAiUseCaseConfig:
    cache_key = use_case.value
    cached = _resolver_cache.get(cache_key)
    if cached and cached[0] > time.monotonic():
        return cached[1]

    settings = get_settings()
    binding = await session.scalar(
        select(AiUseCaseBinding).where(AiUseCaseBinding.use_case == use_case)
    )
    if binding is not None:
        provider_config = await session.get(AiProviderConfig, binding.provider_config_id)
        provider_model = await session.get(AiProviderModel, binding.provider_model_id)
        has_provider_credentials = bool(((provider_config.api_key if provider_config else "") or "").strip())
        can_use_vertex = (
            provider_config is not None
            and provider_config.provider == AiProvider.GOOGLE
            and settings.google_genai_use_vertexai
        )
        if (
            provider_config is not None
            and provider_model is not None
            and provider_config.is_enabled
            and provider_model.is_selectable
            and provider_model.is_accessible
            and (has_provider_credentials or can_use_vertex)
        ):
            resolved = ResolvedAiUseCaseConfig(
                use_case=use_case,
                provider=provider_config.provider,
                provider_config_id=provider_config.id,
                provider_label=provider_config.label,
                api_key=(provider_config.api_key or "").strip(),
                base_url=(provider_config.base_url or "").strip() or None,
                model_id=provider_model.model_id,
                model_record_id=provider_model.id,
                context_window=provider_model.context_window,
                settings_json=dict(binding.settings_json or {}),
                source="db",
            )
            _resolver_cache[cache_key] = (time.monotonic() + RESOLVER_TTL_SECONDS, resolved)
            return resolved

    api_key = (settings.gemini_api_key or "").strip()
    if not api_key and not settings.google_genai_use_vertexai:
        raise RuntimeError(f"No active AI binding is configured for {use_case.value}.")
    resolved = ResolvedAiUseCaseConfig(
        use_case=use_case,
        provider=AiProvider.GOOGLE,
        provider_config_id=None,
        provider_label="Google Vertex AI (env fallback)" if settings.google_genai_use_vertexai else "Google (env fallback)",
        api_key=api_key,
        base_url=None,
        model_id=_google_fallback_for_use_case(use_case),
        model_record_id=None,
        context_window=None,
        settings_json={},
        source="env_fallback",
    )
    _resolver_cache[cache_key] = (time.monotonic() + RESOLVER_TTL_SECONDS, resolved)
    return resolved


def build_google_client(config: ResolvedAiUseCaseConfig) -> genai.Client:
    settings = get_settings()
    timeout = (config.settings_json or {}).get("http_timeout_ms")
    http_options = {"timeout": int(timeout)} if timeout else None
    binding_auth_mode = str((config.settings_json or {}).get("auth_mode") or "").strip().lower()
    api_key = (config.api_key or settings.gemini_api_key or "").strip()
    use_ai_studio_for_speaking = (
        config.use_case == AiUseCase.SPEAKING_EXAMINER
        and binding_auth_mode == "ai_studio"
        and bool(api_key)
    )
    if use_ai_studio_for_speaking:
        return genai.Client(api_key=api_key, vertexai=False, http_options=http_options)
    if settings.google_genai_use_vertexai:
        project = (settings.google_cloud_project or "").strip()
        location = _vertex_location_for_config(config)
        if not project:
            raise RuntimeError("GOOGLE_CLOUD_PROJECT is required when GOOGLE_GENAI_USE_VERTEXAI=True.")
        credentials = None
        credentials_path = (settings.google_application_credentials or "").strip()
        if credentials_path:
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
            # The live WebSocket path needs a ready OAuth token up front; unlike the
            # REST path it does not lazily refresh, so a token=None credential is
            # rejected with "expected OAuth 2 access token". Refresh eagerly for live.
            model_id = (config.model_id or "").lower()
            is_live = (
                config.use_case == AiUseCase.SPEAKING_EXAMINER
                or "live" in model_id
                or "native-audio" in model_id
            )
            if is_live and not credentials.valid:
                from google.auth.transport.requests import Request as _GoogleAuthRequest

                credentials.refresh(_GoogleAuthRequest())
        return genai.Client(
            vertexai=True,
            credentials=credentials,
            project=project,
            location=location,
            http_options=http_options,
        )
    return genai.Client(api_key=config.api_key, http_options=http_options)


def build_cerebras_client(config: ResolvedAiUseCaseConfig) -> Any:
    if Cerebras is None:
        raise RuntimeError("cerebras-cloud-sdk is not installed.")
    kwargs: dict[str, Any] = {"api_key": config.api_key}
    if config.base_url:
        kwargs["base_url"] = config.base_url
    return Cerebras(**kwargs)


def build_groq_client(config: ResolvedAiUseCaseConfig) -> Any:
    if Groq is None:
        raise RuntimeError("groq is not installed.")
    kwargs: dict[str, Any] = {"api_key": config.api_key}
    if config.base_url:
        kwargs["base_url"] = config.base_url
    return Groq(**kwargs)


async def validate_provider_credentials(
    *,
    provider: AiProvider,
    api_key: str,
    base_url: str | None = None,
) -> dict[str, Any]:
    key = (api_key or "").strip()
    if not key and not (provider == AiProvider.GOOGLE and _is_vertex_google_enabled()):
        raise RuntimeError("API key is required.")
    if provider == AiProvider.GOOGLE:
        client = build_google_client(
            ResolvedAiUseCaseConfig(
                use_case=AiUseCase.ADMIN_CHAT,
                provider=provider,
                provider_config_id=None,
                provider_label=provider.value,
                api_key=key,
                base_url=None,
                model_id="",
                model_record_id=None,
                context_window=None,
                settings_json={},
            )
        )
        pager = client.models.list(config={"page_size": 1, "query_base": True})
        first_page = list(pager)[:1]
        return {"ok": True, "provider": provider.value, "models_seen": len(first_page)}
    if provider == AiProvider.GROQ:
        client = build_groq_client(
            ResolvedAiUseCaseConfig(
                use_case=AiUseCase.ADMIN_CHAT,
                provider=provider,
                provider_config_id=None,
                provider_label=provider.value,
                api_key=key,
                base_url=(base_url or "").strip() or None,
                model_id="",
                model_record_id=None,
                context_window=None,
                settings_json={},
            )
        )
        models = client.models.list()
        data = getattr(models, "data", None) or []
        return {"ok": True, "provider": provider.value, "models_seen": len(list(data))}
    client = build_cerebras_client(
        ResolvedAiUseCaseConfig(
            use_case=AiUseCase.WRITING_GRADER,
            provider=provider,
            provider_config_id=None,
            provider_label=provider.value,
            api_key=key,
            base_url=(base_url or "").strip() or None,
            model_id="",
            model_record_id=None,
            context_window=None,
            settings_json={},
        )
    )
    models = client.models.list()
    data = getattr(models, "data", None) or []
    return {"ok": True, "provider": provider.value, "models_seen": len(list(data))}


async def sync_provider_models(
    session: AsyncSession,
    *,
    provider_config: AiProviderConfig,
) -> list[AiProviderModel]:
    try:
        if provider_config.provider == AiProvider.GOOGLE:
            models_payload = await _sync_google_models(provider_config)
        elif provider_config.provider == AiProvider.CEREBRAS:
            models_payload = await _sync_cerebras_models(provider_config)
        else:
            models_payload = await _sync_groq_models(provider_config)
        now = datetime.now(UTC)
        existing_rows = (
            await session.scalars(
                select(AiProviderModel).where(AiProviderModel.provider_config_id == provider_config.id)
            )
        ).all()
        existing_by_model_id = {row.model_id: row for row in existing_rows}
        seen_ids: set[str] = set()
        for index, payload in enumerate(models_payload):
            model_id = str(payload["model_id"])
            seen_ids.add(model_id)
            row = existing_by_model_id.get(model_id)
            if row is None:
                row = AiProviderModel(
                    provider_config_id=provider_config.id,
                    model_id=model_id,
                    display_name=str(payload.get("display_name") or model_id),
                    family=payload.get("family"),
                    capabilities=dict(payload.get("capabilities") or {}),
                    context_window=payload.get("context_window"),
                    is_accessible=bool(payload.get("is_accessible", True)),
                    is_selectable=bool(payload.get("is_selectable", True)),
                    sort_order=index,
                )
                session.add(row)
            else:
                row.display_name = str(payload.get("display_name") or model_id)
                row.family = payload.get("family")
                row.capabilities = dict(payload.get("capabilities") or {})
                row.context_window = payload.get("context_window")
                row.is_accessible = bool(payload.get("is_accessible", True))
                row.is_selectable = bool(payload.get("is_selectable", True))
                row.sort_order = index
        for row in existing_rows:
            if row.model_id not in seen_ids:
                row.is_accessible = False
                row.is_selectable = False
        provider_config.last_sync_at = now
        provider_config.last_sync_status = "success"
        provider_config.last_sync_error = None
        await session.commit()
    except Exception as exc:  # noqa: BLE001
        provider_config.last_sync_at = datetime.now(UTC)
        provider_config.last_sync_status = "failed"
        provider_config.last_sync_error = str(exc)[:1000]
        await session.commit()
        raise
    invalidate_ai_config_cache()
    refreshed = (
        await session.scalars(
            select(AiProviderModel)
            .where(AiProviderModel.provider_config_id == provider_config.id)
            .order_by(AiProviderModel.sort_order.asc(), AiProviderModel.display_name.asc())
        )
    ).all()
    return list(refreshed)


async def _sync_google_models(provider_config: AiProviderConfig) -> list[dict[str, Any]]:
    client = build_google_client(
        ResolvedAiUseCaseConfig(
            use_case=AiUseCase.ADMIN_CHAT,
            provider=AiProvider.GOOGLE,
            provider_config_id=provider_config.id,
            provider_label=provider_config.label,
            api_key=(provider_config.api_key or "").strip(),
            base_url=(provider_config.base_url or "").strip() or None,
            model_id="",
            model_record_id=None,
            context_window=None,
            settings_json={},
        )
    )
    rows: list[dict[str, Any]] = []
    for raw_model in client.models.list(config={"query_base": True, "page_size": 100}):
        payload = raw_model.model_dump(exclude_none=True) if hasattr(raw_model, "model_dump") else dict(raw_model)
        model_id = _strip_model_prefix(str(payload.get("name") or payload.get("model") or ""))
        if not model_id or "gemini" not in model_id.lower():
            continue
        capabilities = _google_capabilities_from_payload(payload)
        rows.append(
            {
                "model_id": model_id,
                "display_name": payload.get("display_name") or model_id,
                "family": "gemini",
                "capabilities": capabilities,
                "context_window": payload.get("input_token_limit") or payload.get("inputTokenLimit"),
                "is_accessible": True,
                "is_selectable": bool(capabilities.get("generate_content") or capabilities.get("bidi_generate_content")),
            }
        )
    return rows


async def _sync_cerebras_models(provider_config: AiProviderConfig) -> list[dict[str, Any]]:
    config = ResolvedAiUseCaseConfig(
        use_case=AiUseCase.WRITING_GRADER,
        provider=AiProvider.CEREBRAS,
        provider_config_id=provider_config.id,
        provider_label=provider_config.label,
        api_key=provider_config.api_key.strip(),
        base_url=(provider_config.base_url or "").strip() or None,
        model_id="",
        model_record_id=None,
        context_window=None,
        settings_json={},
    )
    client = build_cerebras_client(config)
    models = client.models.list()
    rows: list[dict[str, Any]] = []
    for item in list(getattr(models, "data", None) or []):
        model_id = str(getattr(item, "id", "") or "")
        details = None
        try:
            details = client.models.retrieve(model_id)
        except Exception:  # noqa: BLE001
            details = None
        limits = getattr(details, "limits", None) if details is not None else None
        capabilities = getattr(details, "capabilities", None) if details is not None else None
        capabilities_payload = (
            capabilities.model_dump(exclude_none=True)
            if capabilities is not None and hasattr(capabilities, "model_dump")
            else dict(capabilities or {})
        )
        rows.append(
            {
                "model_id": model_id,
                "display_name": str(getattr(details, "name", "") or getattr(item, "id", "") or model_id),
                "family": _normalize_cerebras_family(model_id),
                "capabilities": {
                    **capabilities_payload,
                    "generate_content": True,
                    "vision": False,
                    "audio_input": False,
                    "audio_output": False,
                },
                "context_window": getattr(limits, "max_context_length", None) if limits is not None else None,
                "is_accessible": True,
                "is_selectable": True,
            }
        )
    return rows


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
