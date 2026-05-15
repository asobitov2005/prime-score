"""add public test slugs

Revision ID: 20260515_000031
Revises: 20260515_000030
Create Date: 2026-05-15
"""

from __future__ import annotations

from collections.abc import Sequence
import re
import unicodedata

from alembic import op
import sqlalchemy as sa


revision: str = "20260515_000031"
down_revision: str | None = "20260515_000030"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


_SLUG_SEPARATOR_RE = re.compile(r"[^a-z0-9]+")


def _slugify(title: str | None, fallback: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(title or ""))
    ascii_title = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = _SLUG_SEPARATOR_RE.sub("-", ascii_title).strip("-")
    return slug or fallback


def _unique_slug(base: str, used: set[str]) -> str:
    base = base[:300].strip("-") or "test"
    candidate = base
    suffix = 2
    while candidate in used:
        suffix_text = f"-{suffix}"
        candidate = f"{base[:320 - len(suffix_text)]}{suffix_text}".strip("-")
        suffix += 1
    used.add(candidate)
    return candidate


def upgrade() -> None:
    op.add_column("tests", sa.Column("slug", sa.String(length=320), nullable=True))
    op.create_table(
        "test_slug_redirects",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("slug", sa.String(length=320), nullable=False),
        sa.Column("test_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_test_slug_redirects_slug"),
    )
    op.create_index("ix_test_slug_redirects_slug", "test_slug_redirects", ["slug"], unique=False)
    op.create_index("ix_test_slug_redirects_test_id", "test_slug_redirects", ["test_id"], unique=False)

    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT id, title, type
            FROM tests
            ORDER BY created_at NULLS LAST, id
            """
        )
    ).mappings().all()

    used: set[str] = set()
    for row in rows:
        raw_type = str(row["type"] or "test")
        base = _slugify(row["title"], fallback=f"{raw_type}-test")
        slug = _unique_slug(base, used)
        bind.execute(
            sa.text("UPDATE tests SET slug = :slug WHERE id = :id"),
            {"slug": slug, "id": row["id"]},
        )

    op.alter_column("tests", "slug", existing_type=sa.String(length=320), nullable=False)
    op.create_unique_constraint("uq_tests_slug", "tests", ["slug"])
    op.create_index("ix_tests_slug", "tests", ["slug"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tests_slug", table_name="tests")
    op.drop_constraint("uq_tests_slug", "tests", type_="unique")
    op.drop_table("test_slug_redirects")
    op.drop_column("tests", "slug")
