from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.ai_config_dependencies import *
from app.services.ai_config_part_01 import ResolvedAiUseCaseConfig, _google_capabilities_from_payload, _is_vertex_google_enabled, _normalize_cerebras_family, _strip_model_prefix, build_cerebras_client, build_google_client, invalidate_ai_config_cache
from app.services.ai_config_part_03 import _sync_groq_models

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
