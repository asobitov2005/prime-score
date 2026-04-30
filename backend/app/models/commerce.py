from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import PaymentStatus


class Plan(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "plans"

    catalog: Mapped[str] = mapped_column(String(16), default="public", index=True)
    name: Mapped[str] = mapped_column(String(120))
    duration_days: Mapped[int] = mapped_column(Integer)
    price_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    discount_percent: Mapped[int] = mapped_column(Integer, default=0)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    badge_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    perks: Mapped[list[str]] = mapped_column(JSONB, default=list)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
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
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    per_user_limit: Mapped[int] = mapped_column(Integer, default=1)
    target_user_type: Mapped[str] = mapped_column(String(16), default="all")
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class GiftCodeRedemption(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "gift_code_redemptions"

    gift_code_id: Mapped[UUID] = mapped_column(ForeignKey("gift_codes.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    premium_starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    premium_until: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Payment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    plan_id: Mapped[UUID | None] = mapped_column(ForeignKey("plans.id"), nullable=True)
    card_id: Mapped[UUID | None] = mapped_column(ForeignKey("payment_cards.id"), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(50), default="card_transfer")
    provider_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    invoice_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    base_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    compare_at_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    currency: Mapped[str] = mapped_column(String(8), default="UZS")
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    card_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    card_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    wheel_options: Mapped[list[int]] = mapped_column(JSONB, default=list)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    matched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    granted_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    detected_message_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    detected_message_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)


class PaymentCard(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "payment_cards"

    label: Mapped[str] = mapped_column(String(120))
    card_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    card_type: Mapped[str] = mapped_column(String(24), default="humo")
    holder_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    bot_source: Mapped[str] = mapped_column(String(32), default="HUMOcardbot")


class PaymentSetting(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "payment_settings"

    telegram_api_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    telegram_api_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(24), nullable=True)
    active_bot: Mapped[str] = mapped_column(String(32), default="HUMOcardbot")
    support_contact: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    poll_fallback_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
