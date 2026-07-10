from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.core.enums import UserRole


class MessageResponse(BaseModel):
    message: str


class PaginationMeta(BaseModel):
    page: int = 1
    page_size: int = 20
    total: int = 0


class DebugPrincipal(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str | None = None
    username: str | None = None
    phone: str | None = None
    role: UserRole = UserRole.user
    is_premium: bool = False
    premium_until: datetime | None = None
    show_on_leaderboard: bool = True
    telegram_id: int | None = None
    avatar_url: str | None = None
    language: str = "en"
    created_at: datetime | None = None

    @property
    def display_name(self) -> str:
        if self.username:
            return self.username
        parts = [self.first_name, self.last_name]
        return " ".join(part for part in parts if part)


class AdminPrincipal(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    email: str
    phone_number: str | None = None
    telegram_id: int | None = None
    auth_version: int = 1
    role: UserRole
    is_active: bool = True


class CreatedResponse(BaseModel):
    id: UUID
