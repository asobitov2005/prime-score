from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.admin_ai_dependencies import *
from app.api.routes.admin_ai_part_01 import _now, _serialize_provider_config, _serialize_provider_model, _serialize_thread_detail, _serialize_thread_summary

router = APIRouter()

async def _serialize_use_case_binding(
    session: AsyncSession,
    use_case: AiUseCase,
) -> AdminAiUseCaseBindingRead:
    binding = await session.scalar(select(AiUseCaseBinding).where(AiUseCaseBinding.use_case == use_case))
    if binding is None:
        return AdminAiUseCaseBindingRead(use_case=use_case)
    provider_config = await session.get(AiProviderConfig, binding.provider_config_id)
    provider_model = await session.get(AiProviderModel, binding.provider_model_id)
    resolved_source = "binding"
    try:
        resolved = await resolve_ai_use_case_config(session, use_case)
        resolved_source = resolved.source
    except Exception:
        resolved_source = "missing"
    return AdminAiUseCaseBindingRead(
        id=binding.id,
        use_case=use_case,
        provider_config_id=binding.provider_config_id,
        provider=provider_config.provider if provider_config is not None else None,
        provider_label=provider_config.label if provider_config is not None else None,
        provider_model_id=binding.provider_model_id,
        model_id=provider_model.model_id if provider_model is not None else None,
        model_display_name=provider_model.display_name if provider_model is not None else None,
        settings_json=dict(binding.settings_json or {}),
        resolved_source=resolved_source,
    )

async def read_admin_ai_config(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiConfigRead:
    _ = current_admin
    resolved = await resolve_ai_use_case_config(session, AiUseCase.ADMIN_CHAT)
    return AdminAiConfigRead(
        provider=resolved.provider.value,
        model_name=resolved.model_id,
        has_api_key=bool(resolved.api_key),
        background_supported=True,
        context_window_tokens=1_048_576,
        notes=[
            "Tasks are persisted in the database and run through Celery workers after the page closes.",
            "Admin AI resolves provider, model, and API key from the published AI use-case binding at execution time.",
            "Google is currently required for the admin workspace tool-calling runtime.",
        ],
    )

async def list_ai_providers(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminAiProviderConfigRead]:
    _ = current_admin
    rows = (
        await session.scalars(select(AiProviderConfig).order_by(AiProviderConfig.label.asc()))
    ).all()
    return [_serialize_provider_config(row) for row in rows]

async def update_ai_provider(
    provider: str,
    payload: AdminAiProviderConfigUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiProviderConfigRead:
    _ = current_admin
    row = await session.scalar(select(AiProviderConfig).where(AiProviderConfig.provider == provider))
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI provider not found.")
    data = payload.model_dump(exclude_unset=True)
    if "label" in data and payload.label is not None:
        row.label = payload.label.strip() or row.label
    if "api_key" in data and payload.api_key is not None:
        row.api_key = payload.api_key.strip()
    if "base_url" in data:
        row.base_url = (payload.base_url or "").strip() or None
    if "is_enabled" in data and payload.is_enabled is not None:
        row.is_enabled = bool(payload.is_enabled)
    await session.commit()
    invalidate_ai_config_cache()
    return _serialize_provider_config(row)

async def validate_ai_provider(
    provider: str,
    payload: AdminAiProviderValidationRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiProviderValidationRead:
    _ = current_admin
    row = await session.scalar(select(AiProviderConfig).where(AiProviderConfig.provider == provider))
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI provider not found.")
    try:
        result = await validate_provider_credentials(
            provider=row.provider,
            api_key=(payload.api_key or row.api_key or "").strip(),
            base_url=(payload.base_url or row.base_url or "").strip() or None,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return AdminAiProviderValidationRead(
        ok=True,
        provider=row.provider,
        message="Credentials look valid.",
        models_seen=result.get("models_seen"),
    )

async def sync_ai_provider_models(
    provider: str,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminAiProviderModelRead]:
    _ = current_admin
    row = await session.scalar(select(AiProviderConfig).where(AiProviderConfig.provider == provider))
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI provider not found.")
    if not (row.api_key or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provider API key is missing.")
    try:
        models = await sync_provider_models(session, provider_config=row)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return [_serialize_provider_model(model) for model in models]

async def list_ai_provider_models(
    provider: str,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminAiProviderModelRead]:
    _ = current_admin
    row = await session.scalar(select(AiProviderConfig).where(AiProviderConfig.provider == provider))
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI provider not found.")
    models = (
        await session.scalars(
            select(AiProviderModel)
            .where(AiProviderModel.provider_config_id == row.id)
            .order_by(AiProviderModel.sort_order.asc(), AiProviderModel.display_name.asc())
        )
    ).all()
    return [_serialize_provider_model(model) for model in models]

async def list_ai_use_cases(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminAiUseCaseBindingRead]:
    _ = current_admin
    return [await _serialize_use_case_binding(session, use_case) for use_case in AiUseCase]

async def update_ai_use_case(
    use_case: AiUseCase,
    payload: AdminAiUseCaseBindingUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiUseCaseBindingRead:
    _ = current_admin
    provider_config = await session.get(AiProviderConfig, payload.provider_config_id)
    provider_model = await session.get(AiProviderModel, payload.provider_model_id)
    if provider_config is None or provider_model is None or provider_model.provider_config_id != provider_config.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider or model not found.")
    if not supports_use_case_binding(dict(provider_model.capabilities or {}), use_case, provider_config.provider):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{provider_config.label} model {provider_model.model_id} does not support {use_case.value}.",
        )
    binding = await session.scalar(select(AiUseCaseBinding).where(AiUseCaseBinding.use_case == use_case))
    if binding is None:
        binding = AiUseCaseBinding(
            use_case=use_case,
            provider_config_id=provider_config.id,
            provider_model_id=provider_model.id,
            settings_json=dict(payload.settings_json or {}),
        )
        session.add(binding)
    else:
        binding.provider_config_id = provider_config.id
        binding.provider_model_id = provider_model.id
        binding.settings_json = dict(payload.settings_json or {})
    await session.commit()
    invalidate_ai_config_cache()
    return await _serialize_use_case_binding(session, use_case)

async def list_ai_threads(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminAiThreadSummaryRead]:
    await resume_pending_admin_ai_jobs()
    thread_ids = list(
        (
            await session.scalars(
                select(AdminAiThread.id)
                .where(
                    AdminAiThread.admin_id == current_admin.id,
                    AdminAiThread.status == AdminAiThreadStatus.ACTIVE,
                )
                .order_by(AdminAiThread.updated_at.desc())
            )
        ).all()
    )
    return [
        await _serialize_thread_summary(session, admin_id=current_admin.id, thread_id=thread_id)
        for thread_id in thread_ids
    ]

async def create_ai_thread(
    payload: AdminAiThreadCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiThreadDetailRead:
    thread = await create_admin_ai_thread(session, admin=current_admin, title=payload.title)
    if payload.scope is not None:
        thread.context = {"scope": payload.scope.model_dump(exclude_none=True)}
    thread_id = thread.id
    await session.commit()
    return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)

async def get_ai_thread(
    thread_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiThreadDetailRead:
    await resume_pending_admin_ai_jobs()
    return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)

async def update_ai_thread(
    thread_id: UUID,
    payload: AdminAiThreadUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAiThreadDetailRead:
    thread = await session.get(AdminAiThread, thread_id)
    if thread is None or thread.admin_id != current_admin.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI thread not found.")

    if payload.title is not None:
        thread.title = payload.title.strip() or thread.title
    if payload.status == "archived":
        thread.status = AdminAiThreadStatus.ARCHIVED
    thread.updated_at = _now()
    await session.commit()
    return await _serialize_thread_detail(session, admin_id=current_admin.id, thread_id=thread_id)

async def delete_ai_thread(
    thread_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    archived = await archive_admin_ai_thread(session, admin_id=current_admin.id, thread_id=thread_id)
    if not archived:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI thread not found.")
    return MessageResponse(message="Thread archived.")
