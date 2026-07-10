from __future__ import annotations

import asyncio
import copy
import html
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID, uuid4
from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.config import get_settings
from app.core.enums import TestMode, TestScope, TestStatus, TestType
from app.db.session import get_session_maker, reset_session_state
from app.models.ai import AdminAiJob, AdminAiMessage, AdminAiThread
from app.models.enums import (
    AdminAiJobStatus,
    AdminAiMessageRole,
    AdminAiThreadStatus,
    AiProvider,
    AiUseCase,
    QuestionType as ModelQuestionType,
    TestStatus as ModelTestStatus,
    TestType as ModelTestType,
)
from app.models.test import Question, QuestionGroup, Test, TestSection
from app.schemas.admin import AdminTestDraftUpsertRequest
from app.schemas.common import AdminPrincipal
from app.services.ai_config import (
    ResolvedAiUseCaseConfig,
    build_google_client,
    resolve_ai_use_case_config,
)
from app.services.test_content_repo import (
    build_admin_draft_state_from_db,
    build_test_snapshot_from_db,
    delete_draft_test_from_db,
    list_tests_from_db,
    publish_test_in_db,
    quick_fix_published_test_in_db,
    save_test_draft_to_db,
)

__all__ = [name for name in globals() if not name.startswith('__')]
