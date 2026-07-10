from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from uuid import UUID
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.attempt import Attempt
from app.models.enums import AttemptScope, AttemptStatus
from app.models.speaking import SpeakingSession
from app.models.user import User
from app.models.writing import WritingEvaluation, WritingSubmission
from app.schemas.common import DebugPrincipal
from app.schemas.leaderboard import (
    LeaderboardEntryRead,
    LeaderboardResponse,
    LeaderboardUserAchievementRead,
    LeaderboardUserAchievementProgressRead,
    LeaderboardUserAchievementStateRead,
    LeaderboardUserBadgeRead,
    LeaderboardUserProfileRead,
    LeaderboardUserStatsRead,
)
from app.services.leaderboard_achievement_catalog import build_achievement_catalog
from app.services.leaderboard_achievement_common import AchievementCatalogContext
from app.services.xp import (
    PERIOD_ALL_TIME,
    PERIOD_MONTHLY,
    PERIOD_WEEKLY,
    badge_for_user,
    get_user_period_xp,
    leaderboard_rows,
)

__all__ = [name for name in globals() if not name.startswith('__')]
