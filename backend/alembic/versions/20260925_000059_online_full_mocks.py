"""Add real four-component online mocks and optional offline address.

Revision ID: 20260925_000059
Revises: 20260924_000058
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260925_000059"
down_revision = "20260924_000058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("offline_mock_schedules", sa.Column("address", sa.String(500), nullable=True))
    op.create_table(
        "online_full_mocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("module", sa.String(32), nullable=False, server_default="academic"),
        sa.Column("academic_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("listening_test_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tests.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("reading_test_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tests.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("writing_task_1_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("writing_tasks.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("writing_task_2_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("writing_tasks.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("module = 'academic'", name="academic_module"),
        sa.CheckConstraint("NOT is_published OR academic_confirmed", name="publish_confirmation"),
    )
    op.create_index("ix_online_full_mocks_is_published", "online_full_mocks", ["is_published"])


def downgrade() -> None:
    op.drop_table("online_full_mocks")
    op.drop_column("offline_mock_schedules", "address")
