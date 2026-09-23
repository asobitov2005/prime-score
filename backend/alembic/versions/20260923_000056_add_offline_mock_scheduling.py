"""Add offline mock schedules and reservations.

Revision ID: 20260923_000056
Revises: 20260705_000055
Create Date: 2026-09-23
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260923_000056"
down_revision: str | None = "20260705_000055"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "offline_mock_schedules",
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("price_amount", sa.Numeric(12, 2), server_default="100000", nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("capacity > 0", name="ck_offline_mock_schedules_capacity_positive"),
        sa.CheckConstraint("price_amount >= 0", name="ck_offline_mock_schedules_price_nonnegative"),
        sa.PrimaryKeyConstraint("id", name="pk_offline_mock_schedules"),
    )
    op.create_index("ix_offline_mock_schedules_starts_at", "offline_mock_schedules", ["starts_at"])
    op.create_index("ix_offline_mock_schedules_is_published", "offline_mock_schedules", ["is_published"])

    op.create_table(
        "offline_mock_bookings",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("schedule_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["schedule_id"], ["offline_mock_schedules.id"], ondelete="RESTRICT", name="fk_offline_mock_bookings_schedule_id_offline_mock_schedules"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE", name="fk_offline_mock_bookings_user_id_users"),
        sa.PrimaryKeyConstraint("id", name="pk_offline_mock_bookings"),
        sa.UniqueConstraint("user_id", "schedule_id", name="uq_offline_mock_booking_user_schedule"),
    )
    op.create_index("ix_offline_mock_bookings_user_id", "offline_mock_bookings", ["user_id"])
    op.create_index("ix_offline_mock_bookings_schedule_id", "offline_mock_bookings", ["schedule_id"])


def downgrade() -> None:
    op.drop_index("ix_offline_mock_bookings_schedule_id", table_name="offline_mock_bookings")
    op.drop_index("ix_offline_mock_bookings_user_id", table_name="offline_mock_bookings")
    op.drop_table("offline_mock_bookings")
    op.drop_index("ix_offline_mock_schedules_is_published", table_name="offline_mock_schedules")
    op.drop_index("ix_offline_mock_schedules_starts_at", table_name="offline_mock_schedules")
    op.drop_table("offline_mock_schedules")
