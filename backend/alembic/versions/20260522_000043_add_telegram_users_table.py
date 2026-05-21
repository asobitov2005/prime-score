"""add telegram users table

Revision ID: 20260522_000043
Revises: 20260522_000042
Create Date: 2026-05-22
"""

from __future__ import annotations

from collections.abc import Sequence
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260522_000043"
down_revision: str | None = "20260522_000042"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "telegram_users",
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("linked_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=True),
        sa.Column("username", sa.String(length=50), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("language_code", sa.String(length=20), nullable=True),
        sa.Column("is_bot", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("start_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("first_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bot_contact_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["linked_user_id"], ["users.id"], name=op.f("fk_telegram_users_linked_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_telegram_users")),
        sa.UniqueConstraint("linked_user_id", name=op.f("uq_telegram_users_linked_user_id")),
        sa.UniqueConstraint("telegram_id", name=op.f("uq_telegram_users_telegram_id")),
    )
    op.create_index(op.f("ix_telegram_users_linked_user_id"), "telegram_users", ["linked_user_id"], unique=False)
    op.create_index(op.f("ix_telegram_users_phone"), "telegram_users", ["phone"], unique=False)
    op.create_index(op.f("ix_telegram_users_telegram_id"), "telegram_users", ["telegram_id"], unique=False)

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            """
            SELECT
                id,
                telegram_id,
                phone,
                first_name,
                last_name,
                username,
                avatar_url,
                bot_contact_at,
                first_login_at,
                created_at,
                updated_at
            FROM users
            WHERE deleted_at IS NULL
            """
        )
    ).mappings().all()
    telegram_users = sa.table(
        "telegram_users",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("telegram_id", sa.BigInteger()),
        sa.column("linked_user_id", postgresql.UUID(as_uuid=True)),
        sa.column("phone", sa.String(length=20)),
        sa.column("first_name", sa.String(length=100)),
        sa.column("last_name", sa.String(length=100)),
        sa.column("username", sa.String(length=50)),
        sa.column("avatar_url", sa.String()),
        sa.column("is_bot", sa.Boolean()),
        sa.column("start_count", sa.Integer()),
        sa.column("first_started_at", sa.DateTime(timezone=True)),
        sa.column("last_started_at", sa.DateTime(timezone=True)),
        sa.column("bot_contact_at", sa.DateTime(timezone=True)),
        sa.column("first_login_at", sa.DateTime(timezone=True)),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    if rows:
        op.bulk_insert(
            telegram_users,
            [
                {
                    "id": uuid4(),
                    "telegram_id": row["telegram_id"],
                    "linked_user_id": row["id"],
                    "phone": row["phone"],
                    "first_name": row["first_name"],
                    "last_name": row["last_name"],
                    "username": row["username"],
                    "avatar_url": row["avatar_url"],
                    "is_bot": False,
                    "start_count": 1,
                    "first_started_at": row["bot_contact_at"] or row["first_login_at"] or row["created_at"],
                    "last_started_at": row["bot_contact_at"] or row["first_login_at"] or row["created_at"],
                    "bot_contact_at": row["bot_contact_at"],
                    "first_login_at": row["first_login_at"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                }
                for row in rows
            ],
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_telegram_users_telegram_id"), table_name="telegram_users")
    op.drop_index(op.f("ix_telegram_users_phone"), table_name="telegram_users")
    op.drop_index(op.f("ix_telegram_users_linked_user_id"), table_name="telegram_users")
    op.drop_table("telegram_users")
