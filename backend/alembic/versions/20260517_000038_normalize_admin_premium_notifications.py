"""normalize admin premium notifications

Revision ID: 20260517_000038
Revises: 20260517_000037
Create Date: 2026-05-17
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260517_000038"
down_revision: str | None = "20260517_000037"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE notifications
            SET
                type = 'payment_success',
                body = regexp_replace(
                    body,
                    '^You''ve been gifted ([0-9]+) days of Premium! Valid until (.+)\\.$',
                    '\\1 days of Premium activated. Valid until \\2.'
                )
            WHERE
                title = 'Premium activated!'
                AND body LIKE 'You''ve been gifted % days of Premium! Valid until %.'
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE notifications
            SET
                type = 'gift_received',
                body = regexp_replace(
                    body,
                    '^([0-9]+) days of Premium activated\\. Valid until (.+)\\.$',
                    'You''ve been gifted \\1 days of Premium! Valid until \\2.'
                )
            WHERE
                title = 'Premium activated!'
                AND body LIKE '% days of Premium activated. Valid until %.'
            """
        )
    )
