from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.core.enums import TestType


class LeaderboardEntryRead(BaseModel):
    rank: int
    user_id: UUID
    display_name: str
    test_type: TestType
    band_score: Decimal
    attempts_count: int
    show_on_leaderboard: bool = True


class LeaderboardResponse(BaseModel):
    test_type: TestType
    period: str
    generated_at: datetime
    items: list[LeaderboardEntryRead]


