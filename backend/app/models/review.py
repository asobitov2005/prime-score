from __future__ import annotations

from uuid import UUID

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ReviewSource


class Review(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reviews"

    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by_admin_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source: Mapped[ReviewSource] = mapped_column(
        Enum(
            ReviewSource,
            name="reviewsource",
            native_enum=False,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=False,
    )
    author_name: Mapped[str] = mapped_column(String(160), nullable=False)
    band_label: Mapped[str] = mapped_column(String(32), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
