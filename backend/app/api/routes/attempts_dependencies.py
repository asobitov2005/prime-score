from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user
from app.core.enums import TestMode, TestScope, TestType
from app.db.session import get_db_session
from app.models.attempt import AttemptEvent
from app.models.test import Question
from app.schemas.common import DebugPrincipal
from app.schemas.attempts import (
    AttemptAnswerRequest,
    AttemptAnswerResponse,
    AttemptBreakdownItemRead,
    AttemptDiagramGroupRead,
    AttemptEventCreate,
    AttemptEventRead,
    AttemptProgressRequest,
    AttemptProgressResponse,
    AttemptRead,
    AttemptResultRead,
    AttemptReviewItemRead,
    AttemptReviewRead,
    AttemptSubmitRequest,
    AttemptSubmitResponse,
    AttemptUiStateRead,
    AttemptTextHighlightRead,
)
from app.schemas.tests import TestSnapshotRead
from app.services.attempt_repo import get_attempt_from_db, save_answer_in_db, save_progress_in_db, submit_attempt_in_db
from app.services.object_storage import normalize_storage_asset_path
from app.services.scoring import mc_multiple_question_weight
from app.services.attempt_runtime import band_for_raw_score
from app.services.test_content_repo import build_test_snapshot_from_db

__all__ = [name for name in globals() if not name.startswith('__')]
