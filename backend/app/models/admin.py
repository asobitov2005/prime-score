from datetime import datetime
from uuid import UUID

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AdminRole


class Admin(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "admins"

    username: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[AdminRole] = mapped_column(Enum(AdminRole, native_enum=False))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AdminLoginOtp(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "admin_login_otps"

    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id", ondelete="CASCADE"), index=True)
    phone_number: Mapped[str] = mapped_column(String(32), index=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, index=True)
    telegram_message_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    otp_code: Mapped[str] = mapped_column(String(5))
    purpose: Mapped[str] = mapped_column(String(40), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True, nullable=True)


class AuditLog(UUIDMixin, Base):
    __tablename__ = "audit_logs"

    admin_id: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120))
    target_type: Mapped[str] = mapped_column(String(80))
    target_id: Mapped[str] = mapped_column(String(120))
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
