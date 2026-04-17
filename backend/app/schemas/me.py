from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.enums import AccessType, TestMode, TestStatus, TestType
from app.schemas.common import DebugPrincipal


class MeProfileUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    avatar_url: str | None = None
    show_on_leaderboard: bool | None = None


class MeProfileRead(DebugPrincipal):
    premium_until: datetime | None = None
    last_active_at: datetime | None = None


class MeStatsRead(BaseModel):
    attempts_total: int = 0
    favorites_total: int = 0
    current_streak: int = 0
    average_band: Decimal | None = None
    reading_band: Decimal | None = None
    listening_band: Decimal | None = None
    leaderboard_rank: int | None = None
    active_sessions: int = 0


class MeActivityPointRead(BaseModel):
    activity_date: date
    attempts_count: int = 0
    time_spent_sec: int = 0


class MeAttemptSummaryRead(BaseModel):
    attempt_id: UUID
    test_id: UUID
    test_title: str
    test_type: TestType
    mode: TestMode
    status: TestStatus
    access_type: AccessType
    raw_score: int | None = None
    band_score: Decimal | None = None
    started_at: datetime


class FavoriteTestRead(BaseModel):
    test_id: UUID
    title: str
    test_type: TestType
    access_type: AccessType
    status: TestStatus


