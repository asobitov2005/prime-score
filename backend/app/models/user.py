from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import BIGINT, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.ops import Notification


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    telegram_id: Mapped[int] = mapped_column(BIGINT, unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    username: Mapped[str | None] = mapped_column(String(50), nullable=True)
    telegram_contact_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str] = mapped_column(String(2), default="en", server_default="en")
    name_is_custom: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    username_is_custom: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    avatar_is_custom: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    bot_contact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    full_test_premium_bonus_granted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    premium_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    show_on_leaderboard: Mapped[bool] = mapped_column(Boolean, default=True)
    equipped_achievement_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    total_xp: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    current_level: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    current_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    best_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sessions: Mapped[list[Session]] = relationship(back_populates="user")
    notifications: Mapped[list[Notification]] = relationship(back_populates="user")
    telegram_profile: Mapped[TelegramUser | None] = relationship(back_populates="linked_user")


class Session(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "sessions"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(255), unique=True)
    device_info: Mapped[dict] = mapped_column(JSONB, default=dict)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="sessions")


class TelegramLoginCode(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "telegram_login_codes"

    telegram_id: Mapped[int] = mapped_column(BIGINT, index=True)
    code: Mapped[str] = mapped_column(String(6))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    blocked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TelegramUser(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "telegram_users"

    telegram_id: Mapped[int] = mapped_column(BIGINT, unique=True, index=True)
    linked_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), unique=True, nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    username: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    language_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_bot: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    start_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    first_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    bot_contact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    linked_user: Mapped[User | None] = relationship(back_populates="telegram_profile")
