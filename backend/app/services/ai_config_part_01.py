from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.ai_config_dependencies import *

try:
    from cerebras.cloud.sdk import Cerebras
except Exception:  # noqa: BLE001
    Cerebras = None

try:
    from groq import Groq
except Exception:  # noqa: BLE001
    Groq = None

RESOLVER_TTL_SECONDS = 30

GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"

_resolver_cache: dict[str, tuple[float, "ResolvedAiUseCaseConfig"]] = {}

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
