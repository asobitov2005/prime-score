from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from math import floor, sqrt
from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.attempt import Attempt
from app.models.gamification import LeaderboardEntry, Streak, XPTransaction
from app.models.speaking import SpeakingEvaluation, SpeakingSession, SpeakingTest
from app.models.user import User
from app.models.writing import WritingEvaluation, WritingSubmission, WritingTask
from app.services.attempt_runtime import band_for_raw_score

__all__ = [name for name in globals() if not name.startswith('__')]
