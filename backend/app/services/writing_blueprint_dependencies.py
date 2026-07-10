from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.enums import WritingConfigStatus, WritingTaskType, WritingTaskTypeScope
from app.models.writing import WritingBenchmarkCard, WritingDescriptor
from app.services.writing_rubric import IELTS_WRITING_RUBRIC_TEXT, calculate_overall_band, round_to_ielts_band

__all__ = [name for name in globals() if not name.startswith('__')]
