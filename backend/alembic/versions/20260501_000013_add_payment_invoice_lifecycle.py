"""add payment invoice lifecycle

Revision ID: 20260501_000013
Revises: 20260501_000012
Create Date: 2026-05-01 22:10:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260501_000013"
down_revision: str | None = "20260501_000012"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "payment_cards",
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("card_number", sa.String(length=32), nullable=False),
        sa.Column("card_type", sa.String(length=24), nullable=False, server_default=sa.text("'humo'")),
        sa.Column("holder_name", sa.String(length=120), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("bot_source", sa.String(length=32), nullable=False, server_default=sa.text("'HUMOcardbot'")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payment_cards")),
    )
    op.create_index(op.f("ix_payment_cards_card_number"), "payment_cards", ["card_number"], unique=True)
    op.create_index(op.f("ix_payment_cards_is_active"), "payment_cards", ["is_active"], unique=False)

    op.create_table(
        "payment_settings",
        sa.Column("telegram_api_id", sa.String(length=32), nullable=True),
        sa.Column("telegram_api_hash", sa.String(length=128), nullable=True),
        sa.Column("phone_number", sa.String(length=24), nullable=True),
        sa.Column("active_bot", sa.String(length=32), nullable=False, server_default=sa.text("'HUMOcardbot'")),
        sa.Column("support_contact", sa.String(length=120), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("poll_fallback_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payment_settings")),
    )

    op.add_column("payments", sa.Column("card_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("payments", sa.Column("invoice_code", sa.String(length=32), nullable=True))
    op.add_column("payments", sa.Column("base_amount", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")))
    op.add_column("payments", sa.Column("compare_at_amount", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")))
    op.add_column("payments", sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")))
    op.add_column("payments", sa.Column("currency", sa.String(length=8), nullable=False, server_default=sa.text("'UZS'")))
    op.add_column("payments", sa.Column("card_label", sa.String(length=120), nullable=True))
    op.add_column("payments", sa.Column("card_number", sa.String(length=32), nullable=True))
    op.add_column("payments", sa.Column("wheel_options", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column("payments", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("matched_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("granted_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("payments", sa.Column("status_reason", sa.String(length=255), nullable=True))
    op.add_column("payments", sa.Column("detected_message_id", sa.String(length=64), nullable=True))
    op.add_column("payments", sa.Column("detected_message_text", sa.Text(), nullable=True))
    op.add_column("payments", sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")))

    op.execute("ALTER TABLE payments ALTER COLUMN status TYPE VARCHAR(24) USING lower(status::text)")
    op.execute("ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'pending'")

    op.execute(
        sa.text(
            """
            UPDATE payments
            SET
                invoice_code = COALESCE(invoice_code, 'LEGACY-' || upper(substr(replace(id::text, '-', ''), 1, 8))),
                base_amount = CASE WHEN base_amount = 0 THEN amount ELSE base_amount END,
                compare_at_amount = CASE WHEN compare_at_amount = 0 THEN amount ELSE compare_at_amount END
            """
        )
    )
    op.alter_column("payments", "invoice_code", nullable=False)

    op.create_foreign_key(
        op.f("fk_payments_card_id_payment_cards"),
        "payments",
        "payment_cards",
        ["card_id"],
        ["id"],
    )
    op.create_index(op.f("ix_payments_card_id"), "payments", ["card_id"], unique=False)
    op.create_index(op.f("ix_payments_invoice_code"), "payments", ["invoice_code"], unique=True)
    op.create_index(op.f("ix_payments_status"), "payments", ["status"], unique=False)
    op.create_index(op.f("ix_payments_expires_at"), "payments", ["expires_at"], unique=False)
    op.create_index(op.f("ix_payments_archived_at"), "payments", ["archived_at"], unique=False)
    op.create_index(
        "uq_payments_active_amount",
        "payments",
        ["amount"],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL AND status IN ('pending', 'matched')"),
    )


def downgrade() -> None:
    op.drop_index("uq_payments_active_amount", table_name="payments")
    op.drop_index(op.f("ix_payments_archived_at"), table_name="payments")
    op.drop_index(op.f("ix_payments_expires_at"), table_name="payments")
    op.drop_index(op.f("ix_payments_status"), table_name="payments")
    op.drop_index(op.f("ix_payments_invoice_code"), table_name="payments")
    op.drop_index(op.f("ix_payments_card_id"), table_name="payments")
    op.drop_constraint(op.f("fk_payments_card_id_payment_cards"), "payments", type_="foreignkey")

    op.execute("ALTER TABLE payments ALTER COLUMN status TYPE VARCHAR(24)")
    op.execute("ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'paused'")

    op.drop_column("payments", "meta")
    op.drop_column("payments", "detected_message_text")
    op.drop_column("payments", "detected_message_id")
    op.drop_column("payments", "status_reason")
    op.drop_column("payments", "granted_until")
    op.drop_column("payments", "archived_at")
    op.drop_column("payments", "matched_at")
    op.drop_column("payments", "expires_at")
    op.drop_column("payments", "wheel_options")
    op.drop_column("payments", "card_number")
    op.drop_column("payments", "card_label")
    op.drop_column("payments", "currency")
    op.drop_column("payments", "discount_amount")
    op.drop_column("payments", "compare_at_amount")
    op.drop_column("payments", "base_amount")
    op.drop_column("payments", "invoice_code")
    op.drop_column("payments", "card_id")

    op.drop_table("payment_settings")
    op.drop_index(op.f("ix_payment_cards_is_active"), table_name="payment_cards")
    op.drop_index(op.f("ix_payment_cards_card_number"), table_name="payment_cards")
    op.drop_table("payment_cards")
