"""add admin telegram otp auth

Revision ID: 20260509_000019
Revises: 20260508_000018
Create Date: 2026-05-09 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260509_000019"
down_revision: str | None = "20260508_000018"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("admins", sa.Column("phone_number", sa.String(length=32), nullable=True))
    op.add_column("admins", sa.Column("telegram_id", sa.BigInteger(), nullable=True))
    op.create_index(op.f("ix_admins_phone_number"), "admins", ["phone_number"], unique=True)
    op.create_index(op.f("ix_admins_telegram_id"), "admins", ["telegram_id"], unique=True)

    op.create_table(
        "admin_login_otps",
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("phone_number", sa.String(length=32), nullable=False),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("otp_code", sa.String(length=5), nullable=False),
        sa.Column("purpose", sa.String(length=40), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["admin_id"], ["admins.id"], name=op.f("fk_admin_login_otps_admin_id_admins"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_login_otps")),
    )
    op.create_index(op.f("ix_admin_login_otps_admin_id"), "admin_login_otps", ["admin_id"], unique=False)
    op.create_index(op.f("ix_admin_login_otps_expires_at"), "admin_login_otps", ["expires_at"], unique=False)
    op.create_index(op.f("ix_admin_login_otps_phone_number"), "admin_login_otps", ["phone_number"], unique=False)
    op.create_index(op.f("ix_admin_login_otps_purpose"), "admin_login_otps", ["purpose"], unique=False)
    op.create_index(op.f("ix_admin_login_otps_telegram_id"), "admin_login_otps", ["telegram_id"], unique=False)
    op.create_index(op.f("ix_admin_login_otps_used_at"), "admin_login_otps", ["used_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_admin_login_otps_used_at"), table_name="admin_login_otps")
    op.drop_index(op.f("ix_admin_login_otps_telegram_id"), table_name="admin_login_otps")
    op.drop_index(op.f("ix_admin_login_otps_purpose"), table_name="admin_login_otps")
    op.drop_index(op.f("ix_admin_login_otps_phone_number"), table_name="admin_login_otps")
    op.drop_index(op.f("ix_admin_login_otps_expires_at"), table_name="admin_login_otps")
    op.drop_index(op.f("ix_admin_login_otps_admin_id"), table_name="admin_login_otps")
    op.drop_table("admin_login_otps")

    op.drop_index(op.f("ix_admins_telegram_id"), table_name="admins")
    op.drop_index(op.f("ix_admins_phone_number"), table_name="admins")
    op.drop_column("admins", "telegram_id")
    op.drop_column("admins", "phone_number")
