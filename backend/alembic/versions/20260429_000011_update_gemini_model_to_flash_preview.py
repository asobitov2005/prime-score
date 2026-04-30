"""update gemini model defaults to flash preview

Revision ID: 20260429_000011
Revises: 20260429_000010
Create Date: 2026-04-29 01:45:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260429_000011"
down_revision: str | None = "20260429_000010"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

OLD_MODEL = "gemini-3.1-pro-preview"
NEW_MODEL = "gemini-3-flash-preview"


def upgrade() -> None:
    op.alter_column(
        "admin_ai_threads",
        "model_name",
        existing_type=sa.String(length=120),
        server_default=NEW_MODEL,
        existing_nullable=False,
    )
    op.alter_column(
        "admin_ai_jobs",
        "model_name",
        existing_type=sa.String(length=120),
        server_default=NEW_MODEL,
        existing_nullable=False,
    )

    op.execute(
        sa.text(
            """
            UPDATE admin_ai_threads
            SET model_name = :new_model
            WHERE model_name = :old_model
            """
        ).bindparams(old_model=OLD_MODEL, new_model=NEW_MODEL)
    )
    op.execute(
        sa.text(
            """
            UPDATE admin_ai_jobs
            SET model_name = :new_model
            WHERE model_name = :old_model
            """
        ).bindparams(old_model=OLD_MODEL, new_model=NEW_MODEL)
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE admin_ai_jobs
            SET model_name = :old_model
            WHERE model_name = :new_model
            """
        ).bindparams(old_model=OLD_MODEL, new_model=NEW_MODEL)
    )
    op.execute(
        sa.text(
            """
            UPDATE admin_ai_threads
            SET model_name = :old_model
            WHERE model_name = :new_model
            """
        ).bindparams(old_model=OLD_MODEL, new_model=NEW_MODEL)
    )

    op.alter_column(
        "admin_ai_jobs",
        "model_name",
        existing_type=sa.String(length=120),
        server_default=OLD_MODEL,
        existing_nullable=False,
    )
    op.alter_column(
        "admin_ai_threads",
        "model_name",
        existing_type=sa.String(length=120),
        server_default=OLD_MODEL,
        existing_nullable=False,
    )
