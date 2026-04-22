"""add reviews table

Revision ID: 20260420_000003
Revises: f6e4399be836
Create Date: 2026-04-20 12:00:00.000000
"""

from collections.abc import Sequence
from datetime import datetime, timezone
from uuid import UUID

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260420_000003"
down_revision: str | None = "f6e4399be836"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reviews",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_admin_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source", sa.Enum("admin", "user", name="reviewsource", native_enum=False), nullable=False),
        sa.Column("author_name", sa.String(length=160), nullable=False),
        sa.Column("band_label", sa.String(length=32), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["created_by_admin_id"], ["admins.id"], name=op.f("fk_reviews_created_by_admin_id_admins"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_reviews_user_id_users"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reviews")),
    )
    op.create_index(op.f("ix_reviews_created_by_admin_id"), "reviews", ["created_by_admin_id"], unique=False)
    op.create_index(op.f("ix_reviews_is_visible"), "reviews", ["is_visible"], unique=False)
    op.create_index(op.f("ix_reviews_user_id"), "reviews", ["user_id"], unique=False)

    reviews = sa.table(
        "reviews",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("source", sa.String()),
        sa.column("author_name", sa.String()),
        sa.column("band_label", sa.String()),
        sa.column("body", sa.Text()),
        sa.column("is_visible", sa.Boolean()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )

    op.bulk_insert(
        reviews,
        [
            {
                "id": UUID("a1000000-0000-0000-0000-000000000001"),
                "source": "admin",
                "author_name": "Azizbek Y.",
                "band_label": "7.5",
                "body": "PrimeScore helped me get used to the computer-delivered format. The interface is exactly like the real exam!",
                "is_visible": True,
                "created_at": datetime(2026, 4, 18, 12, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 4, 18, 12, 0, tzinfo=timezone.utc),
            },
            {
                "id": UUID("a1000000-0000-0000-0000-000000000002"),
                "source": "admin",
                "author_name": "Malika T.",
                "band_label": "8.0",
                "body": "The detailed analytics showed me that I was losing points on True/False/Not Given questions. Focused practice fixed it.",
                "is_visible": True,
                "created_at": datetime(2026, 4, 13, 12, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 4, 13, 12, 0, tzinfo=timezone.utc),
            },
            {
                "id": UUID("a1000000-0000-0000-0000-000000000003"),
                "source": "admin",
                "author_name": "Sardor M.",
                "band_label": "7.0",
                "body": "Audio player for listening tests is perfectly matched with the real IELTS test. Highly recommended.",
                "is_visible": True,
                "created_at": datetime(2026, 4, 6, 12, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 4, 6, 12, 0, tzinfo=timezone.utc),
            },
            {
                "id": UUID("a1000000-0000-0000-0000-000000000004"),
                "source": "admin",
                "author_name": "Dilnoza R.",
                "band_label": "8.5",
                "body": "I loved the highlight feature in the answer review. It made understanding my mistakes so much easier.",
                "is_visible": True,
                "created_at": datetime(2026, 3, 21, 12, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 3, 21, 12, 0, tzinfo=timezone.utc),
            },
            {
                "id": UUID("a1000000-0000-0000-0000-000000000005"),
                "source": "admin",
                "author_name": "Javohir O.",
                "band_label": "7.0",
                "body": "Very smooth interface and accurate scoring. Helped me overcome my time-management issues in Reading.",
                "is_visible": True,
                "created_at": datetime(2026, 3, 19, 12, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 3, 19, 12, 0, tzinfo=timezone.utc),
            },
            {
                "id": UUID("a1000000-0000-0000-0000-000000000006"),
                "source": "admin",
                "author_name": "Shahnoza A.",
                "band_label": "7.5",
                "body": "The best platform for CDI IELTS preparation in Uzbekistan. The Premium mock tests are very challenging.",
                "is_visible": True,
                "created_at": datetime(2026, 2, 19, 12, 0, tzinfo=timezone.utc),
                "updated_at": datetime(2026, 2, 19, 12, 0, tzinfo=timezone.utc),
            },
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_reviews_user_id"), table_name="reviews")
    op.drop_index(op.f("ix_reviews_is_visible"), table_name="reviews")
    op.drop_index(op.f("ix_reviews_created_by_admin_id"), table_name="reviews")
    op.drop_table("reviews")
