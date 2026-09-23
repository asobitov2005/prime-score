from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class OfflineMockSchedule(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "offline_mock_schedules"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="capacity_positive"),
        CheckConstraint("price_amount >= 0", name="price_nonnegative"),
    )

    title: Mapped[str] = mapped_column(String(160))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    location: Mapped[str] = mapped_column(String(255))
    capacity: Mapped[int] = mapped_column(Integer)
    price_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("100000"), server_default="100000"
    )
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", index=True)


class OfflineMockBooking(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "offline_mock_bookings"
    __table_args__ = (
        UniqueConstraint("user_id", "schedule_id", name="uq_offline_mock_booking_user_schedule"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    schedule_id: Mapped[UUID] = mapped_column(
        ForeignKey("offline_mock_schedules.id", ondelete="RESTRICT"), index=True
    )
