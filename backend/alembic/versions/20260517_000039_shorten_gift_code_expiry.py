"""shorten active gift code expiry

Revision ID: 20260517_000039
Revises: 20260517_000038
Create Date: 2026-05-17
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260517_000039"
down_revision: str | None = "20260517_000038"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE gift_codes
            SET expires_at = starts_at + INTERVAL '3 days'
            WHERE
                purchaser_user_id IS NOT NULL
                AND code LIKE 'PRIME-FRIEND-%'
                AND redeemed_at IS NULL
                AND used_count = 0
                AND max_uses = 1
                AND starts_at IS NOT NULL
                AND expires_at > starts_at + INTERVAL '3 days'
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE gift_codes
            SET expires_at = starts_at + INTERVAL '30 days'
            WHERE
                purchaser_user_id IS NOT NULL
                AND code LIKE 'PRIME-FRIEND-%'
                AND redeemed_at IS NULL
                AND used_count = 0
                AND max_uses = 1
                AND starts_at IS NOT NULL
                AND expires_at = starts_at + INTERVAL '3 days'
            """
        )
    )
