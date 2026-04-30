"""expand gift code rules

Revision ID: 20260426_000004
Revises: 20260420_000003
Create Date: 2026-04-26 19:30:00.000000
"""

from collections.abc import Sequence
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260426_000004"
down_revision: str | None = "20260420_000003"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


gift_code_redemptions = sa.table(
    "gift_code_redemptions",
    sa.column("gift_code_id", postgresql.UUID(as_uuid=True)),
    sa.column("user_id", postgresql.UUID(as_uuid=True)),
    sa.column("redeemed_at", sa.DateTime(timezone=True)),
    sa.column("premium_starts_at", sa.DateTime(timezone=True)),
    sa.column("premium_until", sa.DateTime(timezone=True)),
    sa.column("id", postgresql.UUID(as_uuid=True)),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)


def upgrade() -> None:
    op.add_column("gift_codes", sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("gift_codes", sa.Column("max_uses", sa.Integer(), nullable=False, server_default=sa.text("1")))
    op.add_column("gift_codes", sa.Column("used_count", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("gift_codes", sa.Column("per_user_limit", sa.Integer(), nullable=False, server_default=sa.text("1")))
    op.add_column("gift_codes", sa.Column("target_user_type", sa.String(length=16), nullable=False, server_default=sa.text("'all'")))

    op.execute(
        """
        UPDATE gift_codes
        SET used_count = CASE
            WHEN redeemed_at IS NOT NULL OR recipient_user_id IS NOT NULL OR status = 'COMPLETED' THEN 1
            ELSE 0
        END
        """
    )

    op.create_table(
        "gift_code_redemptions",
        sa.Column("gift_code_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("premium_starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("premium_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["gift_code_id"], ["gift_codes.id"], name=op.f("fk_gift_code_redemptions_gift_code_id_gift_codes"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_gift_code_redemptions_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gift_code_redemptions")),
    )
    op.create_index(op.f("ix_gift_code_redemptions_gift_code_id"), "gift_code_redemptions", ["gift_code_id"], unique=False)
    op.create_index(op.f("ix_gift_code_redemptions_user_id"), "gift_code_redemptions", ["user_id"], unique=False)

    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT
                gift_codes.id AS gift_code_id,
                gift_codes.recipient_user_id AS user_id,
                COALESCE(gift_codes.redeemed_at, gift_codes.updated_at, gift_codes.created_at) AS redeemed_at,
                COALESCE(gift_codes.redeemed_at, gift_codes.updated_at, gift_codes.created_at) AS premium_starts_at,
                COALESCE(users.premium_until, gift_codes.redeemed_at, gift_codes.updated_at, gift_codes.created_at) AS premium_until
            FROM gift_codes
            JOIN users ON users.id = gift_codes.recipient_user_id
            WHERE gift_codes.recipient_user_id IS NOT NULL
            """
        )
    ).mappings().all()

    if rows:
        op.bulk_insert(
            gift_code_redemptions,
            [
                {
                    "gift_code_id": row["gift_code_id"],
                    "user_id": row["user_id"],
                    "redeemed_at": row["redeemed_at"],
                    "premium_starts_at": row["premium_starts_at"],
                    "premium_until": row["premium_until"],
                    "id": uuid4(),
                    "created_at": row["redeemed_at"],
                    "updated_at": row["redeemed_at"],
                }
                for row in rows
            ],
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_gift_code_redemptions_user_id"), table_name="gift_code_redemptions")
    op.drop_index(op.f("ix_gift_code_redemptions_gift_code_id"), table_name="gift_code_redemptions")
    op.drop_table("gift_code_redemptions")
    op.drop_column("gift_codes", "target_user_type")
    op.drop_column("gift_codes", "per_user_limit")
    op.drop_column("gift_codes", "used_count")
    op.drop_column("gift_codes", "max_uses")
    op.drop_column("gift_codes", "starts_at")
