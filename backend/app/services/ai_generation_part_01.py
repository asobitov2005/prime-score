from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.ai_generation_dependencies import *

def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None

def _to_plain_dict(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if hasattr(value, "model_dump"):
        return dict(value.model_dump(exclude_none=True))
    if isinstance(value, dict):
        return dict(value)
    return {}

def _estimate_text_tokens(*parts: str | None) -> int:
    combined = "".join(part or "" for part in parts)
    if not combined:
        return 0
    return max(1, math.ceil(len(combined) / 4))

def _provider_soft_total_budget(config: ResolvedAiUseCaseConfig) -> int | None:
    budget = _safe_int((config.settings_json or {}).get("soft_total_token_budget"))
    if budget and budget > 0:
        return budget
    if config.provider == AiProvider.GROQ:
        lowered = config.model_id.lower()
        if "gpt-oss" in lowered:
            return 6000
        return 8000
    return None

def _fit_max_output_tokens(
    *,
    config: ResolvedAiUseCaseConfig,
    prompt: str,
    system_instruction: str | None,
    requested_max_output_tokens: int,
) -> tuple[int, int, bool]:
    estimated_input_tokens = _estimate_text_tokens(system_instruction, prompt)
    effective = max(128, int(requested_max_output_tokens))
    autofit_applied = False

    if config.context_window and config.context_window > 0:
        context_cap = max(128, config.context_window - estimated_input_tokens - 256)
        if context_cap < effective:
            effective = context_cap
            autofit_applied = True

    soft_budget = _provider_soft_total_budget(config)
    if soft_budget and soft_budget > 0:
        soft_cap = max(128, soft_budget - estimated_input_tokens)
        if soft_cap < effective:
            effective = soft_cap
            autofit_applied = True

    return max(128, effective), estimated_input_tokens, autofit_applied

def _extract_google_usage(response: Any) -> dict[str, int | None]:
    usage = getattr(response, "usage_metadata", None) or getattr(response, "usageMetadata", None)
    payload = _to_plain_dict(usage)
    return {
        "prompt_tokens": _safe_int(payload.get("prompt_token_count") or payload.get("promptTokenCount")),
        "completion_tokens": _safe_int(
            payload.get("candidates_token_count")
            or payload.get("candidatesTokenCount")
            or payload.get("output_token_count")
            or payload.get("outputTokenCount")
        ),
        "total_tokens": _safe_int(payload.get("total_token_count") or payload.get("totalTokenCount")),
        "cached_prompt_tokens": _safe_int(
            payload.get("cached_content_token_count") or payload.get("cachedContentTokenCount")
        ),
        "thoughts_tokens": _safe_int(payload.get("thoughts_token_count") or payload.get("thoughtsTokenCount")),
    }

def _extract_openai_compatible_usage(completion: Any) -> dict[str, int | None]:
    usage = getattr(completion, "usage", None)
    payload = _to_plain_dict(usage)
    prompt_details = _to_plain_dict(
        payload.get("prompt_tokens_details")
        or payload.get("promptTokensDetails")
        or payload.get("input_tokens_details")
        or payload.get("inputTokensDetails")
    )
    completion_details = _to_plain_dict(
        payload.get("completion_tokens_details") or payload.get("completionTokensDetails")
    )
    return {
        "prompt_tokens": _safe_int(payload.get("prompt_tokens") or payload.get("promptTokens")),
        "completion_tokens": _safe_int(payload.get("completion_tokens") or payload.get("completionTokens")),
        "total_tokens": _safe_int(payload.get("total_tokens") or payload.get("totalTokens")),
        "cached_prompt_tokens": _safe_int(
            prompt_details.get("cached_tokens")
            or prompt_details.get("cachedTokens")
            or prompt_details.get("cache_read_input_tokens")
            or prompt_details.get("cacheReadInputTokens")
        ),
        "thoughts_tokens": _safe_int(
            completion_details.get("reasoning_tokens")
            or completion_details.get("reasoningTokens")
            or completion_details.get("thinking_tokens")
            or completion_details.get("thinkingTokens")
        ),
    }

def _append_usage_event(
    usage_collector: list[AiUsageEventDraft] | None,
    *,
    config: ResolvedAiUseCaseConfig,
    operation: str,
    status: str,
    requested_output_tokens: int,
    effective_output_tokens: int,
    estimated_input_tokens: int,
    request_characters: int,
    response_characters: int,
    latency_ms: int,
    usage_payload: dict[str, int | None] | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
    autofit_applied: bool = False,
) -> None:
    if usage_collector is None:
        return
    usage = usage_payload or {}
    usage_collector.append(
        AiUsageEventDraft(
            provider=config.provider,
            use_case=config.use_case,
            provider_config_id=config.provider_config_id,
            provider_model_id=config.model_record_id,
            model_id=config.model_id,
            operation=operation,
            status=status,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
            cached_prompt_tokens=usage.get("cached_prompt_tokens"),
            thoughts_tokens=usage.get("thoughts_tokens"),
            estimated_input_tokens=estimated_input_tokens,
            requested_output_tokens=requested_output_tokens,
            effective_output_tokens=effective_output_tokens,
            request_characters=request_characters,
            response_characters=response_characters,
            latency_ms=latency_ms,
            error_code=error_code,
            error_message=error_message,
            metadata_json={
                "source": config.source,
                "usage_source": "provider_api",
                "autofit_applied": autofit_applied,
            },
        )
    )
