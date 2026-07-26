"""add users.equipped_achievement_id

Stores a user's manually chosen leaderboard badge. NULL means "auto" — the
most recently unlocked achievement is shown. A non-null value pins the user's
explicit pick so a newer unlock does not override it.

Revision ID: 20260705_000055
Revises: 20260705_000054
Create Date: 2026-07-05
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260705_000055"
down_revision: str | None = "20260705_000054"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("equipped_achievement_id", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "equipped_achievement_id")
