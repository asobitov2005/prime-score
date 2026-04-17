from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Query

from app.core.enums import TestType
from app.schemas.leaderboard import LeaderboardEntryRead, LeaderboardResponse
from app.services.fixtures import LEADERBOARD_FIXTURES

router = APIRouter()


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    test_type: TestType = Query(default=TestType.reading, alias="type"),
    period: str = Query(default="month"),
) -> LeaderboardResponse:
    items = [
        LeaderboardEntryRead(**item)
        for item in LEADERBOARD_FIXTURES
        if item["test_type"] == test_type
    ]
    return LeaderboardResponse(
        test_type=test_type,
        period=period,
        generated_at=datetime.now(timezone.utc),
        items=items,
    )

