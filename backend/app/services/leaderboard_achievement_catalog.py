from __future__ import annotations

from app.schemas.leaderboard import LeaderboardUserAchievementStateRead
from app.services.leaderboard_achievement_common import AchievementCatalogContext
from app.services.leaderboard_achievement_levels import (
    build_level_achievements,
    build_streak_achievements,
)
from app.services.leaderboard_achievement_performance import (
    build_performance_achievements,
)
from app.services.leaderboard_achievement_skills import build_skill_achievements
from app.services.leaderboard_achievement_special import build_special_achievements


def build_achievement_catalog(
    context: AchievementCatalogContext,
) -> list[LeaderboardUserAchievementStateRead]:
    return [
        *build_level_achievements(context),
        *build_streak_achievements(context),
        *build_skill_achievements(context),
        *build_performance_achievements(context),
        *build_special_achievements(context),
    ]
