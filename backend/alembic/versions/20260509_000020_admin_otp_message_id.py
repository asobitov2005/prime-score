"""store admin OTP telegram message id

Revision ID: 20260509_000020
Revises: 20260509_000019
Create Date: 2026-05-09 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260509_000020"
down_revision: str | None = "20260509_000019"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("admin_login_otps", sa.Column("telegram_message_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("admin_login_otps", "telegram_message_id")
