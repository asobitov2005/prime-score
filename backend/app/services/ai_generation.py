from __future__ import annotations

import math
import time
from typing import Any

from google.genai import types as genai_types

from app.models.enums import AiProvider
from app.services.ai_config import (
    ResolvedAiUseCaseConfig,
    build_cerebras_client,
    build_groq_client,
    build_google_client,
)
from app.services.ai_usage import AiUsageEventDraft


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


def generate_text_sync(
    *,
    config: ResolvedAiUseCaseConfig,
    prompt: str,
    system_instruction: str | None = None,
    temperature: float = 0,
    top_p: float = 1,
    max_output_tokens: int = 8192,
    response_schema: Any | None = None,
    response_mime_type: str | None = None,
    seed: int | None = None,
    usage_collector: list[AiUsageEventDraft] | None = None,
    operation: str = "text_generation",
) -> str:
    effective_max_output_tokens, estimated_input_tokens, autofit_applied = _fit_max_output_tokens(
        config=config,
        prompt=prompt,
        system_instruction=system_instruction,
        requested_max_output_tokens=max_output_tokens,
    )
    started = time.perf_counter()
    request_characters = len(prompt or "") + len(system_instruction or "")

    try:
        if config.provider == AiProvider.GOOGLE:
            client = build_google_client(config)
            payload = genai_types.GenerateContentConfig(
                temperature=temperature,
                topP=top_p,
                maxOutputTokens=effective_max_output_tokens,
                systemInstruction=system_instruction,
                responseSchema=response_schema,
                responseMimeType=response_mime_type,
                seed=seed,
            )
            response = client.models.generate_content(
                model=config.model_id,
                contents=prompt,
                config=payload,
            )
            text = (response.text or "").strip()
            _append_usage_event(
                usage_collector,
                config=config,
                operation=operation,
                status="success",
                requested_output_tokens=max_output_tokens,
                effective_output_tokens=effective_max_output_tokens,
                estimated_input_tokens=estimated_input_tokens,
                request_characters=request_characters,
                response_characters=len(text),
                latency_ms=int((time.perf_counter() - started) * 1000),
                usage_payload=_extract_google_usage(response),
                autofit_applied=autofit_applied,
            )
            return text

        if config.provider == AiProvider.CEREBRAS:
            client = build_cerebras_client(config)
        else:
            client = build_groq_client(config)
        messages = []

        if response_mime_type == "application/json" and config.provider == AiProvider.GROQ:
            json_directive = (
                " Please return your response in JSON format. "
                "Ensure all top level keys mentioned in the prompt are present."
            )
            if system_instruction:
                system_instruction += json_directive
            else:
                prompt += json_directive

        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        kwargs: dict[str, Any] = {
            "model": config.model_id,
            "messages": messages,
            "temperature": temperature,
        }
        if response_mime_type == "application/json":
            kwargs["response_format"] = {"type": "json_object"}
        if seed is not None:
            kwargs["seed"] = seed
        try:
            completion = client.chat.completions.create(
                max_completion_tokens=effective_max_output_tokens,
                **kwargs,
            )
        except TypeError:
            completion = client.chat.completions.create(
                max_tokens=effective_max_output_tokens,
                **kwargs,
            )
        message = completion.choices[0].message
        text = str(getattr(message, "content", "") or "").strip()
        _append_usage_event(
            usage_collector,
            config=config,
            operation=operation,
            status="success",
            requested_output_tokens=max_output_tokens,
            effective_output_tokens=effective_max_output_tokens,
            estimated_input_tokens=estimated_input_tokens,
            request_characters=request_characters,
            response_characters=len(text),
            latency_ms=int((time.perf_counter() - started) * 1000),
            usage_payload=_extract_openai_compatible_usage(completion),
            autofit_applied=autofit_applied,
        )
        return text
    except Exception as exc:  # noqa: BLE001
        _append_usage_event(
            usage_collector,
            config=config,
            operation=operation,
            status="failed",
            requested_output_tokens=max_output_tokens,
            effective_output_tokens=effective_max_output_tokens,
            estimated_input_tokens=estimated_input_tokens,
            request_characters=request_characters,
            response_characters=0,
            latency_ms=int((time.perf_counter() - started) * 1000),
            error_message=str(exc),
            autofit_applied=autofit_applied,
        )
        raise


def generate_image_text_sync(
    *,
    config: ResolvedAiUseCaseConfig,
    image_bytes: bytes,
    mime_type: str,
    prompt: str,
    temperature: float = 0,
    top_p: float = 1,
    max_output_tokens: int = 2048,
    usage_collector: list[AiUsageEventDraft] | None = None,
    operation: str = "image_generation",
) -> str:
    if config.provider != AiProvider.GOOGLE:
        raise RuntimeError(f"{config.provider.value} does not support image summary generation in this flow.")
    effective_max_output_tokens, estimated_input_tokens, autofit_applied = _fit_max_output_tokens(
        config=config,
        prompt=prompt,
        system_instruction=None,
        requested_max_output_tokens=max_output_tokens,
    )
    started = time.perf_counter()
    client = build_google_client(config)
    try:
        response = client.models.generate_content(
            model=config.model_id,
            contents=[
                genai_types.Content(
                    role="user",
                    parts=[
                        genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        genai_types.Part(text=prompt),
                    ],
                )
            ],
            config=genai_types.GenerateContentConfig(
                temperature=temperature,
                topP=top_p,
                maxOutputTokens=effective_max_output_tokens,
            ),
        )
        text = (response.text or "").strip()
        _append_usage_event(
            usage_collector,
            config=config,
            operation=operation,
            status="success",
            requested_output_tokens=max_output_tokens,
            effective_output_tokens=effective_max_output_tokens,
            estimated_input_tokens=estimated_input_tokens,
            request_characters=len(prompt or ""),
            response_characters=len(text),
            latency_ms=int((time.perf_counter() - started) * 1000),
            usage_payload=_extract_google_usage(response),
            autofit_applied=autofit_applied,
        )
        return text
    except Exception as exc:  # noqa: BLE001
        _append_usage_event(
            usage_collector,
            config=config,
            operation=operation,
            status="failed",
            requested_output_tokens=max_output_tokens,
            effective_output_tokens=effective_max_output_tokens,
            estimated_input_tokens=estimated_input_tokens,
            request_characters=len(prompt or ""),
            response_characters=0,
            latency_ms=int((time.perf_counter() - started) * 1000),
            error_message=str(exc),
            autofit_applied=autofit_applied,
        )
        raise
