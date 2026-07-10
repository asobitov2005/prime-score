from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.enums import (
    WritingConfigEntityType,
    WritingConfigStatus,
    WritingPromptKey,
    WritingTaskType,
    WritingTaskTypeScope,
)
from app.models.writing import (
    WritingAnchorItem,
    WritingAnchorSet,
    WritingConfigAuditLog,
    WritingPromptEntry,
    WritingPromptProfile,
    WritingRubricVersion,
)
from app.services.writing_anchors import ANCHORS as LEGACY_ANCHORS
from app.services.writing_rubric import IELTS_WRITING_RUBRIC_TEXT

__all__ = [name for name in globals() if not name.startswith('__')]
