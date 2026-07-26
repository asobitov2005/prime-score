from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Favorite(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "test_id", name="uq_favorites_user_id_test_id"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    test_id: Mapped[UUID] = mapped_column(
        ForeignKey("tests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
