"""Remove payment detector fields.

Revision ID: 20260515_000032
Revises: 20260515_000031
Create Date: 2026-05-15 00:32:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260515_000032"
down_revision: str | None = "20260515_000031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("payments") as batch_op:
        batch_op.drop_column("detected_message_text")
        batch_op.drop_column("detected_message_id")
        batch_op.drop_column("wheel_options")

    with op.batch_alter_table("payment_cards") as batch_op:
        batch_op.drop_column("bot_source")

    with op.batch_alter_table("payment_settings") as batch_op:
        batch_op.drop_column("poll_fallback_enabled")
        batch_op.drop_column("is_enabled")
        batch_op.drop_column("active_bot")
        batch_op.drop_column("phone_number")
        batch_op.drop_column("telegram_api_hash")
        batch_op.drop_column("telegram_api_id")


def downgrade() -> None:
    with op.batch_alter_table("payment_settings") as batch_op:
        batch_op.add_column(sa.Column("telegram_api_id", sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column("telegram_api_hash", sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column("phone_number", sa.String(length=24), nullable=True))
        batch_op.add_column(sa.Column("active_bot", sa.String(length=32), server_default=sa.text("'HUMOcardbot'"), nullable=False))
        batch_op.add_column(sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False))
        batch_op.add_column(sa.Column("poll_fallback_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False))

    with op.batch_alter_table("payment_cards") as batch_op:
        batch_op.add_column(sa.Column("bot_source", sa.String(length=32), server_default=sa.text("'HUMOcardbot'"), nullable=False))

    with op.batch_alter_table("payments") as batch_op:
        batch_op.add_column(
            sa.Column(
                "wheel_options",
                postgresql.JSONB(astext_type=sa.Text()),
                server_default=sa.text("'[]'::jsonb"),
                nullable=False,
            )
        )
        batch_op.add_column(sa.Column("detected_message_id", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("detected_message_text", sa.Text(), nullable=True))
