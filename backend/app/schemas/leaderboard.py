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


class LeaderboardUserBadgeRead(BaseModel):
    title: str
    rarity: str = "Common"
    tagline: str = ""
    image: str | None = None


class LeaderboardUserAchievementRead(BaseModel):
    id: str
    title: str
    rarity: str = "Common"
    image: str | None = None


class LeaderboardUserStatsRead(BaseModel):
    longest_streak: int = 0
    highest_band: float | None = None
    total_mock_tests: int = 0
    total_study_hours: int = 0
    accuracy: float | None = None
    achievements_unlocked: int = 0


class LeaderboardUserProfileRead(BaseModel):
    user_id: UUID
    avatar_url: str | None = None
    display_name: str
    level: int = 1
    total_xp: int = 0
    rank: int = 0
    is_online: bool = False
    is_premium: bool = False
    current_streak: int = 0
    equipped_badge: LeaderboardUserBadgeRead | None = None
    active_titles: list[str] = Field(default_factory=list)
    stats: LeaderboardUserStatsRead = Field(default_factory=LeaderboardUserStatsRead)
    achievements: list[LeaderboardUserAchievementRead] = Field(default_factory=list)
