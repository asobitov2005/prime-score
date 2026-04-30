"""make public plans dynamic

Revision ID: 20260426_000005
Revises: 20260426_000004
Create Date: 2026-04-26 22:40:00.000000
"""

from __future__ import annotations

import json
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260426_000005"
down_revision: str | None = "20260426_000004"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


PUBLIC_PLANS = (
    {
        "id": "00000000-0000-0000-0000-000000000230",
        "name": "1 Month",
        "duration_days": 30,
        "price_amount": "49000",
        "display_order": 10,
        "badge_label": "Premium Plan",
        "is_featured": False,
        "perks": [
            "Full access to all IELTS mock tests",
            "Detailed test analysis after each test",
            "Advanced performance dashboard & analytics",
            "AI Writing Evaluation with deep feedback",
            "5 Writing checks per day",
            "Gift 3 premium days to a friend",
        ],
    },
    {
        "id": "00000000-0000-0000-0000-000000000260",
        "name": "2 Months",
        "duration_days": 60,
        "price_amount": "69000",
        "display_order": 20,
        "badge_label": "Most Popular",
        "is_featured": True,
        "perks": [
            "Full access to all IELTS mock tests",
            "Detailed test analysis after each test",
            "Advanced performance dashboard & analytics",
            "AI Writing Evaluation with deep feedback",
            "10 Writing checks per day",
            "Gift 7 premium days to a friend",
        ],
    },
    {
        "id": "00000000-0000-0000-0000-000000000090",
        "name": "3 Months",
        "duration_days": 90,
        "price_amount": "99000",
        "display_order": 30,
        "badge_label": "Best Value",
        "is_featured": False,
        "perks": [
            "Full access to all IELTS mock tests",
            "Detailed test analysis after each test",
            "Advanced performance dashboard & analytics",
            "AI Writing Evaluation with priority processing",
            "Unlimited Writing Checks (Fair Usage Policy applies)",
            "Gift 14 premium days to a friend",
        ],
    },
)

GIFT_PLANS = (
    {"id": "00000000-0000-0000-0000-000000000001", "name": "1 Day", "duration_days": 1, "price_amount": "9000", "display_order": 10},
    {"id": "00000000-0000-0000-0000-000000000003", "name": "3 Days", "duration_days": 3, "price_amount": "15000", "display_order": 20},
    {"id": "00000000-0000-0000-0000-000000000007", "name": "7 Days", "duration_days": 7, "price_amount": "25000", "display_order": 30},
    {"id": "00000000-0000-0000-0000-000000000015", "name": "15 Days", "duration_days": 15, "price_amount": "39000", "display_order": 40},
    {"id": "00000000-0000-0000-0000-000000000030", "name": "30 Days", "duration_days": 30, "price_amount": "49000", "display_order": 50},
    {"id": "00000000-0000-0000-0000-000000000060", "name": "60 Days", "duration_days": 60, "price_amount": "79000", "display_order": 60},
)


def upgrade() -> None:
    op.add_column("plans", sa.Column("catalog", sa.String(length=16), nullable=False, server_default=sa.text("'public'")))
    op.add_column("plans", sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")))
    op.add_column("plans", sa.Column("badge_label", sa.String(length=80), nullable=True))
    op.add_column("plans", sa.Column("perks", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")))
    op.add_column("plans", sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index(op.f("ix_plans_catalog"), "plans", ["catalog"], unique=False)

    bind = op.get_bind()

    for plan in PUBLIC_PLANS:
        bind.execute(
            sa.text(
                """
                UPDATE plans
                SET
                    catalog = 'public',
                    name = :name,
                    duration_days = :duration_days,
                    price_amount = :price_amount,
                    discount_percent = 0,
                    display_order = :display_order,
                    badge_label = :badge_label,
                    perks = CAST(:perks AS jsonb),
                    is_featured = :is_featured,
                    is_active = TRUE
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                **plan,
                "perks": json.dumps(plan["perks"]),
            },
        )

    for plan in GIFT_PLANS:
        bind.execute(
            sa.text(
                """
                UPDATE plans
                SET
                    catalog = 'gift',
                    name = :name,
                    duration_days = :duration_days,
                    price_amount = :price_amount,
                    discount_percent = 0,
                    display_order = :display_order,
                    badge_label = NULL,
                    perks = '[]'::jsonb,
                    is_featured = FALSE
                WHERE id = CAST(:id AS uuid)
                """
            ),
            plan,
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_plans_catalog"), table_name="plans")
    op.drop_column("plans", "is_featured")
    op.drop_column("plans", "perks")
    op.drop_column("plans", "badge_label")
    op.drop_column("plans", "display_order")
    op.drop_column("plans", "catalog")
