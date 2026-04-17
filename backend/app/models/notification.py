from uuid import UUID

from sqlalchemy import Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class NotificationPreference(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "notification_preferences"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    payment_success_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    premium_expiring_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    premium_expired_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    gift_received_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    new_test_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    weekly_summary_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

