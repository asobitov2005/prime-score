"""merge divergent alembic heads before favorites/achievements

Revision ID: 20260705_000052b
Revises: 20260508_000017, 20260626_000052, f6e4399be836
Create Date: 2026-07-05
"""

from __future__ import annotations

from collections.abc import Sequence

revision = "20260705_000052b"
down_revision = ("20260508_000017", "20260626_000052", "f6e4399be836")
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
