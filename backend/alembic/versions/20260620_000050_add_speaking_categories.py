"""add speaking categories

Revision ID: 20260620_000050
Revises: 20260614_000049
Create Date: 2026-06-20
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260620_000050"
down_revision: str | None = "20260614_000049"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

PART1_CATEGORIES = [
    "accommodation",
    "hometown",
    "work_study",
    "daily_routine",
    "hobbies_leisure",
    "food_cooking",
    "friends_social_life",
    "travel_holidays",
    "weather_seasons",
    "sport_fitness",
    "shopping",
    "music",
    "reading_news",
    "mobile_phones_apps",
    "clothes_fashion",
]

CROSS_PART_CATEGORIES = [
    "education",
    "technology",
    "health",
    "environment",
    "work_careers",
    "society_community",
    "travel_tourism",
    "culture_traditions",
    "media_communication",
    "economy_public_policy",
]


def upgrade() -> None:
    op.create_table(
        "speaking_categories",
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=True),
        sa.Column("scope", sa.String(length=32), nullable=False, server_default="custom"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_categories")),
        sa.UniqueConstraint("slug", name=op.f("uq_speaking_categories_slug")),
    )
    op.create_index(op.f("ix_speaking_categories_slug"), "speaking_categories", ["slug"], unique=True)
    op.create_index(op.f("ix_speaking_categories_scope"), "speaking_categories", ["scope"], unique=False)
    op.create_index(op.f("ix_speaking_categories_active"), "speaking_categories", ["active"], unique=False)

    seed_rows: list[dict[str, object]] = []
    for slug in PART1_CATEGORIES:
        seed_rows.append({"slug": slug, "label": None, "scope": "part1", "active": True})
    for slug in CROSS_PART_CATEGORIES:
        seed_rows.append({"slug": slug, "label": None, "scope": "cross_part", "active": True})

    if seed_rows:
        for row in seed_rows:
            op.execute(
                sa.text(
                    """
                    INSERT INTO speaking_categories (id, slug, label, scope, active, created_at, updated_at)
                    VALUES (gen_random_uuid(), :slug, NULL, :scope, true, now(), now())
                    ON CONFLICT (slug) DO NOTHING
                    """
                ).bindparams(slug=row["slug"], scope=row["scope"])
            )

    op.execute(
        """
        INSERT INTO speaking_categories (id, slug, label, scope, active, created_at, updated_at)
        SELECT gen_random_uuid(), tag, NULL, 'custom', true, now(), now()
        FROM (
            SELECT DISTINCT jsonb_array_elements_text(category_tags) AS tag
            FROM speaking_topics
        ) AS topic_tags
        WHERE tag <> ''
          AND NOT EXISTS (
            SELECT 1 FROM speaking_categories sc WHERE sc.slug = topic_tags.tag
          )
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_speaking_categories_active"), table_name="speaking_categories")
    op.drop_index(op.f("ix_speaking_categories_scope"), table_name="speaking_categories")
    op.drop_index(op.f("ix_speaking_categories_slug"), table_name="speaking_categories")
    op.drop_table("speaking_categories")
