from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class LeaderboardEntryRead(BaseModel):
    rank: int
    user_id: UUID
    avatar_url: str | None = None
    display_name: str
    level: int = 1
    xp: int = 0
    current_streak: int = 0
    badge: str | None = None
    average_score: float | None = None
    full_mock_completions: int = 0
    achieved_at: datetime | None = None
    is_current_user: bool = False
    show_on_leaderboard: bool = True


class LeaderboardResponse(BaseModel):
    period: str
    generated_at: datetime
    items: list[LeaderboardEntryRead] = Field(default_factory=list)
    current_user: LeaderboardEntryRead | None = None
