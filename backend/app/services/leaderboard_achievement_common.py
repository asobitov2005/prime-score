from __future__ import annotations

from dataclasses import dataclass
from math import ceil

from app.models.user import User
from app.schemas.leaderboard import (
    LeaderboardUserAchievementProgressRead,
    LeaderboardUserAchievementStateRead,
)


@dataclass(slots=True)
class AchievementCatalogContext:
    user: User
    reading_attempt_count: int
    reading_average_accuracy: float | None
    listening_perfect_score_reached: bool
    listening_best_score: int
    listening_best_target: int
    writing_submission_count: int
    writing_best_band: float | None
    speaking_completed_count: int
    recent_full_mock_accuracy: float | None
    recent_full_mock_count: int
    full_mock_completions: int
    weekend_day_count: int
    early_session_count: int
    late_session_count: int
    rank: int
    weekly_rank: int | None
    leaderboard_size: int

    @property
    def level(self) -> int:
        return int(self.user.current_level or 1)

    @property
    def total_xp(self) -> int:
        return int(self.user.total_xp or 0)

    @property
    def current_streak(self) -> int:
        return int(self.user.current_streak or 0)

    @property
    def best_streak(self) -> int:
        return int(self.user.best_streak or self.current_streak or 0)

    @property
    def top_one_percent_cutoff(self) -> int:
        if self.leaderboard_size <= 0:
            return 1
        return max(1, ceil(self.leaderboard_size * 0.01))


def achievement_progress(
    current: int,
    target: int,
    label: str,
) -> LeaderboardUserAchievementProgressRead:
    return LeaderboardUserAchievementProgressRead(
        current=max(0, int(current)),
        target=max(0, int(target)),
        label=label,
    )


def achievement_status(*, unlocked: bool, started: bool) -> str:
    if unlocked:
        return "unlocked"
    if started:
        return "in_progress"
    return "locked"


def achievement(
    *,
    id: str,
    title: str,
    description: str,
    category: str,
    rarity: str,
    image: str,
    requirement: str,
    status: str,
    skill_type: str | None = None,
    required_xp: int | None = None,
    unlock_level: int | None = None,
    streak_days: int | None = None,
    xp_reward: int | None = None,
    progress: LeaderboardUserAchievementProgressRead | None = None,
) -> LeaderboardUserAchievementStateRead:
    return LeaderboardUserAchievementStateRead(
        id=id,
        title=title,
        description=description,
        category=category,
        skill_type=skill_type,
        rarity=rarity,
        image=image,
        status=status,
        requirement=requirement,
        required_xp=required_xp,
        unlock_level=unlock_level,
        streak_days=streak_days,
        xp_reward=xp_reward,
        progress=progress,
    )


def streak_rarity(days: int) -> str:
    if days >= 180:
        return "Mythic"
    if days >= 60:
        return "Legendary"
    if days >= 14:
        return "Epic"
    if days >= 7:
        return "Rare"
    return "Common"


def streak_image(days: int) -> str:
    if days == 3:
        return "/badges/streak/day-3.png"
    if days == 7:
        return "/badges/streak/day-7.png"
    if days == 14:
        return "/badges/streak/day-14.png"
    if days == 30:
        return "/badges/streak/day-30.png"
    if days in {60, 90}:
        return "/badges/streak/day-60.png"
    if days == 180:
        return "/badges/streak/day-180.png"
    return "/badges/streak/day-360.png"
