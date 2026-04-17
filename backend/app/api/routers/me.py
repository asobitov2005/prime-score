from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter

from app.schemas.user import DashboardStats, UserProfile


router = APIRouter()


@router.get("", response_model=UserProfile)
async def get_me() -> UserProfile:
    return UserProfile(
        id=uuid4(),
        telegram_id=998900000001,
        phone="+998901234567",
        first_name="Prime",
        last_name="Student",
        username="primescore_user",
        is_premium=False,
        premium_until=None,
        show_on_leaderboard=True,
    )


@router.get("/stats", response_model=DashboardStats)
async def get_my_stats() -> DashboardStats:
    return DashboardStats(
        total_attempts=16,
        completed_attempts=13,
        average_band=6.5,
        best_reading_band=7.0,
        best_listening_band=6.5,
        leaderboard_position=24,
    )


@router.get("/activity")
async def get_my_activity() -> dict[str, list[dict[str, int | str]]]:
    return {
        "days": [
            {"date": datetime.now(UTC).date().isoformat(), "count": 2},
        ]
    }

