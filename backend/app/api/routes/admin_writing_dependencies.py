from __future__ import annotations

from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.enums import WritingQuestionSubtype, WritingSubmissionStatus, WritingTaskStatus, WritingTaskType
from app.models.user import User
from app.models.writing import WritingEvaluation, WritingSubmission, WritingTask
from app.schemas.common import AdminPrincipal
from app.schemas.writing import (
    AdminWritingTaskCreateRequest,
    AdminWritingTaskUpdateRequest,
    WritingCriterionFeedback,
    WritingEvaluationRead,
    WritingInlineAnnotation,
    WritingRoastFeedback,
    WritingTaskRead,
    WritingVocabularySuggestion,
)
from app.services.object_storage import upload_test_diagram_image

__all__ = [name for name in globals() if not name.startswith('__')]
