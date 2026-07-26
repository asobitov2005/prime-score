"""add favorites and user_achievements tables

Adds durable storage for test bookmarks (``favorites``) and unlocked
achievements (``user_achievements``), plus the ``achievement_unlocked``
notification enum value used when an achievement is earned.

Revision ID: 20260705_000053
Revises: 20260626_000052
Create Date: 2026-07-05
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260705_000053"
down_revision: str | None = "20260705_000052b"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.create_table(
        "favorites",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("test_id", postgresql.UUID(as_uuid=True), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_favorites_user_id_users"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["test_id"], ["tests.id"], name=op.f("fk_favorites_test_id_tests"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_favorites")),
        sa.UniqueConstraint("user_id", "test_id", name="uq_favorites_user_id_test_id"),
    )
    op.create_index(op.f("ix_favorites_user_id"), "favorites", ["user_id"], unique=False)
    op.create_index(op.f("ix_favorites_test_id"), "favorites", ["test_id"], unique=False)

    op.create_table(
        "user_achievements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("achievement_id", sa.String(length=128), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("xp_awarded", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_user_achievements_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_achievements")),
        sa.UniqueConstraint(
            "user_id", "achievement_id", name="uq_user_achievements_user_id_achievement_id"
        ),
    )
    op.create_index(op.f("ix_user_achievements_user_id"), "user_achievements", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_user_achievements_achievement_id"), "user_achievements", ["achievement_id"], unique=False
    )

    # notification_type is a native PG enum; PG 16 allows ADD VALUE inside the
    # migration transaction as long as the value is not used in the same tx.
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'achievement_unlocked'")


def downgrade() -> None:
    op.drop_index(op.f("ix_user_achievements_achievement_id"), table_name="user_achievements")
    op.drop_index(op.f("ix_user_achievements_user_id"), table_name="user_achievements")
    op.drop_table("user_achievements")
    op.drop_index(op.f("ix_favorites_test_id"), table_name="favorites")
    op.drop_index(op.f("ix_favorites_user_id"), table_name="favorites")
    op.drop_table("favorites")
    # Postgres cannot drop a single enum value; leaving 'achievement_unlocked'
    # in place on downgrade is harmless.
