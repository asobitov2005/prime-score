from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserProfile(BaseModel):
    id: UUID
    telegram_id: int
    phone: str
    first_name: str
    last_name: str | None
    username: str | None
    is_premium: bool
    premium_until: datetime | None
    show_on_leaderboard: bool


class DashboardStats(BaseModel):
    total_attempts: int
    completed_attempts: int
    average_band: float | None
    best_reading_band: float | None
    best_listening_band: float | None
    leaderboard_position: int | None

