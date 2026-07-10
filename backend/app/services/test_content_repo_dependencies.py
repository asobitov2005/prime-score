from __future__ import annotations

from collections import defaultdict
import logging
import re
import unicodedata
from uuid import UUID, uuid4
from sqlalchemy import Select, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.enums import AccessType, TestMode, TestScope, TestStatus, TestType
from app.core.security import hash_password
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.enums import AccessType as ModelAccessType
from app.models.enums import QuestionType as ModelQuestionType
from app.models.enums import TestFormat as ModelTestFormat
from app.models.enums import TestSource as ModelTestSource
from app.models.enums import TestStatus as ModelTestStatus
from app.models.enums import TestType as ModelTestType
from app.models.attempt import Attempt, UserAnswer
from app.models.test import AnswerVariant, Question, QuestionGroup, Test, TestSection, TestSlugRedirect
from app.services.admin_example_reading_seed import (
    ADMIN_EXAMPLE_READING_TEST_ID,
    build_admin_example_reading_draft,
)
from app.services.fixtures import (
    LISTENING_TEST_ID,
    TEST_CATALOG_FIXTURES,
    get_test_questions,
    get_test_sections,
)
from app.services.object_storage import normalize_storage_asset_path
from app.services.scoring import listening_exam_seconds, mc_multiple_question_weight
from app.services.snapshots import freeze_test_snapshot
from app.services.test_source import normalize_test_source_detail

__all__ = [name for name in globals() if not name.startswith('__')]
