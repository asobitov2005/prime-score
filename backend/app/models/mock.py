from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
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
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
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


class OnlineFullMock(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "online_full_mocks"
    __table_args__ = (
        CheckConstraint("module = 'academic'", name="academic_module"),
        CheckConstraint("NOT is_published OR academic_confirmed", name="publish_confirmation"),
    )

    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    module: Mapped[str] = mapped_column(String(32), default="academic", server_default="academic")
    academic_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    listening_test_id: Mapped[UUID] = mapped_column(ForeignKey("tests.id", ondelete="RESTRICT"))
    reading_test_id: Mapped[UUID] = mapped_column(ForeignKey("tests.id", ondelete="RESTRICT"))
    writing_task_1_id: Mapped[UUID] = mapped_column(ForeignKey("writing_tasks.id", ondelete="RESTRICT"))
    writing_task_2_id: Mapped[UUID] = mapped_column(ForeignKey("writing_tasks.id", ondelete="RESTRICT"))
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", index=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
