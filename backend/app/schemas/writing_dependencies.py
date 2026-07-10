from __future__ import annotations

from datetime import datetime
from typing import Self
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.enums import (
    WritingDifficulty,
    WritingErrorCategory,
    WritingQuestionSubtype,
    WritingSubmissionStatus,
    WritingTaskStatus,
    WritingTaskType,
)

__all__ = [name for name in globals() if not name.startswith('__')]
