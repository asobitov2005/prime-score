from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.ai_generation_dependencies import *
from app.services.ai_generation_part_01 import _append_usage_event, _extract_google_usage, _extract_openai_compatible_usage, _fit_max_output_tokens

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
