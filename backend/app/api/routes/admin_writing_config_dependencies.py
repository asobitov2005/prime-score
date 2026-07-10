from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.enums import WritingConfigEntityType, WritingConfigStatus, WritingPromptKey, WritingTaskType, WritingTaskTypeScope
from app.models.writing import (
    WritingAnchorItem,
    WritingAnchorSet,
    WritingConfigAuditLog,
    WritingPromptEntry,
    WritingPromptProfile,
    WritingRubricVersion,
)
from app.schemas.admin_ai import (
    AdminWritingAnchorItemRead,
    AdminWritingAnchorSetCreateRequest,
    AdminWritingAnchorSetRead,
    AdminWritingConfigAuditRead,
    AdminWritingPromptPreviewRead,
    AdminWritingPromptPreviewRequest,
    AdminWritingPromptProfileCreateRequest,
    AdminWritingPromptProfileRead,
    AdminWritingPromptProfileUpdateRequest,
    AdminWritingPromptEntryRead,
    AdminWritingRubricCreateRequest,
    AdminWritingRubricRead,
)
from app.schemas.common import AdminPrincipal
from app.services.writing_config import (
    get_active_anchor_bundle,
    get_active_prompt_bundle,
    get_active_rubric_bundle,
    log_writing_config_action,
    publish_anchor_set,
    publish_prompt_profile,
    publish_rubric,
    render_grader_system_prompt,
    render_grader_user_prompt,
    render_improved_version_prompt,
    render_roast_user_prompt,
    replace_anchor_items,
)

__all__ = [name for name in globals() if not name.startswith('__')]
