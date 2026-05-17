"""add gift code entitlements

Revision ID: 20260517_000037
Revises: 20260516_000036
Create Date: 2026-05-17
"""

from __future__ import annotations

from collections.abc import Sequence
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260517_000037"
down_revision: str | None = "20260516_000036"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO plans (
                id,
                catalog,
                name,
                duration_days,
                price_amount,
                discount_percent,
                display_order,
                badge_label,
                perks,
                is_featured,
                is_active,
                payment_paused
            )
            VALUES
                (
                    '00000000-0000-0000-0000-000000000003',
                    'gift',
                    '3 Days',
                    3,
                    15000,
                    0,
                    20,
                    NULL,
                    '[]'::jsonb,
                    false,
                    true,
                    true
                ),
                (
                    '00000000-0000-0000-0000-000000000007',
                    'gift',
                    '7 Days',
                    7,
                    25000,
                    0,
                    30,
                    NULL,
                    '[]'::jsonb,
                    false,
                    true,
                    true
                ),
                (
                    '00000000-0000-0000-0000-000000000015',
                    'gift',
                    '14 Days',
                    14,
                    39000,
                    0,
                    40,
                    NULL,
                    '[]'::jsonb,
                    false,
                    true,
                    true
                )
            ON CONFLICT (id) DO UPDATE
            SET
                catalog = EXCLUDED.catalog,
                name = EXCLUDED.name,
                duration_days = EXCLUDED.duration_days,
                price_amount = EXCLUDED.price_amount,
                discount_percent = EXCLUDED.discount_percent,
                display_order = EXCLUDED.display_order,
                payment_paused = EXCLUDED.payment_paused
            """
        )
    )

    op.create_table(
        "gift_code_entitlements",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_payment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_plan_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("gift_plan_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("gift_days", sa.Integer(), nullable=False),
        sa.Column("total_codes", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("generated_codes", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["gift_plan_id"], ["plans.id"], name=op.f("fk_gift_code_entitlements_gift_plan_id_plans")),
        sa.ForeignKeyConstraint(["source_payment_id"], ["payments.id"], name=op.f("fk_gift_code_entitlements_source_payment_id_payments"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_plan_id"], ["plans.id"], name=op.f("fk_gift_code_entitlements_source_plan_id_plans")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_gift_code_entitlements_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gift_code_entitlements")),
    )
    op.create_index(op.f("ix_gift_code_entitlements_user_id"), "gift_code_entitlements", ["user_id"], unique=False)
    op.create_index(op.f("ix_gift_code_entitlements_source_payment_id"), "gift_code_entitlements", ["source_payment_id"], unique=True)

    bind = op.get_bind()
    payment_rows = bind.execute(
        sa.text(
            """
            SELECT
                payments.user_id,
                payments.id AS source_payment_id,
                payments.plan_id AS source_plan_id,
                COALESCE(payments.paid_at, payments.updated_at, payments.created_at) AS granted_at
            FROM payments
            WHERE
                payments.user_id IS NOT NULL
                AND payments.status = 'completed'
                AND payments.plan_id IN (
                    '00000000-0000-0000-0000-000000000230',
                    '00000000-0000-0000-0000-000000000260',
                    '00000000-0000-0000-0000-000000000090'
                )
            """
        )
    ).mappings()

    entitlement_rows = []
    for row in payment_rows:
        source_plan_id = str(row["source_plan_id"])
        if source_plan_id == "00000000-0000-0000-0000-000000000230":
            gift_plan_id = "00000000-0000-0000-0000-000000000003"
            gift_days = 3
        elif source_plan_id == "00000000-0000-0000-0000-000000000260":
            gift_plan_id = "00000000-0000-0000-0000-000000000007"
            gift_days = 7
        else:
            gift_plan_id = "00000000-0000-0000-0000-000000000015"
            gift_days = 14

        entitlement_rows.append(
            {
                "id": uuid4(),
                "user_id": row["user_id"],
                "source_payment_id": row["source_payment_id"],
                "source_plan_id": row["source_plan_id"],
                "gift_plan_id": gift_plan_id,
                "gift_days": gift_days,
                "total_codes": 1,
                "generated_codes": 0,
                "created_at": row["granted_at"],
                "updated_at": row["granted_at"],
            }
        )

    if entitlement_rows:
        entitlement_table = sa.table(
            "gift_code_entitlements",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("user_id", postgresql.UUID(as_uuid=True)),
            sa.column("source_payment_id", postgresql.UUID(as_uuid=True)),
            sa.column("source_plan_id", postgresql.UUID(as_uuid=True)),
            sa.column("gift_plan_id", postgresql.UUID(as_uuid=True)),
            sa.column("gift_days", sa.Integer()),
            sa.column("total_codes", sa.Integer()),
            sa.column("generated_codes", sa.Integer()),
            sa.column("created_at", sa.DateTime(timezone=True)),
            sa.column("updated_at", sa.DateTime(timezone=True)),
        )
        op.bulk_insert(entitlement_table, entitlement_rows)


def downgrade() -> None:
    op.drop_index(op.f("ix_gift_code_entitlements_source_payment_id"), table_name="gift_code_entitlements")
    op.drop_index(op.f("ix_gift_code_entitlements_user_id"), table_name="gift_code_entitlements")
    op.drop_table("gift_code_entitlements")
