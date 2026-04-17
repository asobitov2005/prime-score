from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import PaymentStatus


class Plan(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "plans"

    name: Mapped[str] = mapped_column(String(120))
    duration_days: Mapped[int] = mapped_column(Integer)
    price_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    discount_percent: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    payment_paused: Mapped[bool] = mapped_column(Boolean, default=True)


class PromoCode(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "promo_codes"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    discount_percent: Mapped[int] = mapped_column(Integer)
    max_uses: Mapped[int] = mapped_column(Integer)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class GiftCode(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "gift_codes"

    purchaser_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    recipient_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    plan_id: Mapped[UUID | None] = mapped_column(ForeignKey("plans.id"), nullable=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, native_enum=False), default=PaymentStatus.PAUSED)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Payment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    plan_id: Mapped[UUID | None] = mapped_column(ForeignKey("plans.id"), nullable=True)
    provider: Mapped[str] = mapped_column(String(50), default="paused")
    provider_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, native_enum=False), default=PaymentStatus.PAUSED)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

