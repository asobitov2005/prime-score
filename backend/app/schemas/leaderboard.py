from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class LeaderboardEntryRead(BaseModel):
    rank: int
    user_id: UUID
    display_name: str
    test_type: str
    percentile: float = 0.0
    estimated_band_score: float | None = None
    reading_score: float | None = None
    listening_score: float | None = None
    total_tests_attempted: int = 0
    avg_accuracy: float | None = None
    total_time_sec: int = 0
    last_active_at: datetime | None = None
    is_current_user: bool = False
    show_on_leaderboard: bool = True


class LeaderboardResponse(BaseModel):
    test_type: str
    period: str
    generated_at: datetime
    items: list[LeaderboardEntryRead] = Field(default_factory=list)
    current_user: LeaderboardEntryRead | None = None
