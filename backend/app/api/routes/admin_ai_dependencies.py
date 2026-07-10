from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.ai import AdminAiJob, AdminAiMessage, AdminAiThread, AiProviderConfig, AiProviderModel, AiUseCaseBinding
from app.models.enums import AdminAiJobStatus, AdminAiThreadStatus, AiUseCase
from app.schemas.admin_ai import (
    AdminAiConfigRead,
    AdminAiProviderConfigRead,
    AdminAiProviderConfigUpdateRequest,
    AdminAiProviderModelRead,
    AdminAiProviderValidationRead,
    AdminAiProviderValidationRequest,
    AdminAiJobProgressRead,
    AdminAiJobRead,
    AdminAiMessageCreateRequest,
    AdminAiMessageRead,
    AdminAiThreadCreateRequest,
    AdminAiThreadDetailRead,
    AdminAiThreadSummaryRead,
    AdminAiThreadUpdateRequest,
    AdminAiToolTraceRead,
    AdminAiUseCaseBindingRead,
    AdminAiUseCaseBindingUpdateRequest,
    AdminAiWorkspaceScopeRead,
)
from app.schemas.common import AdminPrincipal, MessageResponse
from app.services.ai_config import (
    invalidate_ai_config_cache,
    mask_secret,
    resolve_ai_use_case_config,
    sync_provider_models,
    supports_use_case_binding,
    validate_provider_credentials,
)
from app.services.admin_ai_agent import (
    archive_admin_ai_thread,
    cancel_active_admin_ai_job,
    create_admin_ai_thread,
    enqueue_admin_ai_message,
    resume_pending_admin_ai_jobs,
)

__all__ = [name for name in globals() if not name.startswith('__')]
