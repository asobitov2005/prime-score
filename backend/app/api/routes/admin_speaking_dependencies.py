from __future__ import annotations

import re
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.speaking import SpeakingCategory, SpeakingSessionPart, SpeakingTopic, SpeakingTopicQuestionItem
from app.schemas.common import AdminPrincipal
from app.schemas.speaking import (
    AdminSpeakingCategoryCreateRequest,
    AdminSpeakingCategoryListResponse,
    AdminSpeakingCategoryRead,
    AdminSpeakingTopicCreateRequest,
    AdminSpeakingTopicListResponse,
    AdminSpeakingTopicRead,
    AdminSpeakingTopicUpdateRequest,
)

__all__ = [name for name in globals() if not name.startswith('__')]
