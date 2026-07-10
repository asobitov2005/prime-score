from __future__ import annotations

import asyncio
import html
from datetime import UTC, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.enums import (
    AiUseCase,
    WritingDifficulty,
    WritingQuestionSubtype,
    WritingSubmissionStatus,
    WritingTaskStatus,
    WritingTaskType,
)
from app.models.gamification import XPTransaction
from app.models.user import User
from app.models.writing import WritingDraft, WritingEvaluation, WritingEvaluationRun, WritingSubmission, WritingTask
from app.schemas.common import DebugPrincipal
from app.schemas.writing import (
    WritingCriterionFeedback,
    WritingDashboardSummary,
    WritingEvaluationRead,
    WritingActionPlan,
    WritingBandBoundary,
    WritingDraftListItem,
    WritingDraftListResponse,
    WritingDraftRead,
    WritingErrorPattern,
    WritingDraftUpsertRequest,
    WritingHistoryItem,
    WritingHistoryResponse,
    WritingInlineAnnotation,
    WritingChecklistItem,
    WritingLimitRead,
    WritingRevisionDiff,
    WritingRoastFeedback,
    WritingScoreBooster,
    WritingSentenceFix,
    WritingTargetAction,
    WritingVocabularySuggestion,
    WritingSubmissionRead,
    WritingSubmitRequest,
    WritingTaskListItem,
    WritingTaskListResponse,
    WritingTaskRead,
    WritingUploadImageResponse,
)
from app.services.object_storage import upload_test_diagram_image
from app.services.ai_config import resolve_ai_use_case_config
from app.services.writing_limits import WritingLimitStatus, resolve_writing_limit_status

__all__ = [name for name in globals() if not name.startswith('__')]
