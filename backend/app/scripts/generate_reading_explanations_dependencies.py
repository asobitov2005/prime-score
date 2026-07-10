from __future__ import annotations

import argparse
import asyncio
import json
import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.config import get_settings
from app.models.enums import AiProvider, AiUseCase
from app.models.enums import TestType as ModelTestType
from app.models.test import Question, QuestionGroup, Test, TestSection
from app.services.ai_config import ResolvedAiUseCaseConfig
from app.services.ai_generation import generate_text_sync
from app.db.session import get_session_maker

__all__ = [name for name in globals() if not name.startswith('__')]
