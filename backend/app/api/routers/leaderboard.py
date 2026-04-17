from uuid import uuid4

from fastapi import APIRouter

from app.schemas.leaderboard import LeaderboardEntry


router = APIRouter()


@router.get("", response_model=list[LeaderboardEntry])
async def get_leaderboard() -> list[LeaderboardEntry]:
    return [
        LeaderboardEntry(
            user_id=uuid4(),
            display_name="A. Karimov",
            test_type="reading",
            average_band=8.0,
            attempts_count=12,
            rank=1,
        ),
        LeaderboardEntry(
            user_id=uuid4(),
            display_name="M. Lee",
            test_type="reading",
            average_band=7.5,
            attempts_count=10,
            rank=2,
        ),
    ]

