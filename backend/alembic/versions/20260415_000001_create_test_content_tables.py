"""create test content tables

Revision ID: 20260415_000001
Revises:
Create Date: 2026-04-15 12:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260415_000001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "admins",
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admins")),
        sa.UniqueConstraint("email", name=op.f("uq_admins_email")),
        sa.UniqueConstraint("username", name=op.f("uq_admins_username")),
    )

    op.create_table(
        "tests",
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("access_type", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("source_detail", sa.String(length=255), nullable=True),
        sa.Column("exam_date", sa.Date(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("exam_time_limit_seconds", sa.Integer(), nullable=True),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payments_paused", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tests")),
    )
    op.create_index(op.f("ix_tests_access_type"), "tests", ["access_type"], unique=False)
    op.create_index(op.f("ix_tests_created_by"), "tests", ["created_by"], unique=False)
    op.create_index(op.f("ix_tests_status"), "tests", ["status"], unique=False)
    op.create_index(op.f("ix_tests_type"), "tests", ["type"], unique=False)

    op.create_table(
        "test_sections",
        sa.Column("test_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("intro", sa.Text(), nullable=True),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("audio_asset_key", sa.String(length=255), nullable=True),
        sa.Column("audio_duration_seconds", sa.Integer(), nullable=True),
        sa.Column("transcript", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"], name=op.f("fk_test_sections_test_id_tests")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_test_sections")),
    )
    op.create_index(op.f("ix_test_sections_test_id"), "test_sections", ["test_id"], unique=False)

    op.create_table(
        "question_groups",
        sa.Column("section_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("question_type", sa.String(length=64), nullable=False),
        sa.Column("question_start", sa.Integer(), nullable=False),
        sa.Column("question_end", sa.Integer(), nullable=False),
        sa.Column("shared_content", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("shared_options", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["section_id"], ["test_sections.id"], name=op.f("fk_question_groups_section_id_test_sections")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_question_groups")),
    )
    op.create_index(op.f("ix_question_groups_question_type"), "question_groups", ["question_type"], unique=False)
    op.create_index(op.f("ix_question_groups_section_id"), "question_groups", ["section_id"], unique=False)

    op.create_table(
        "questions",
        sa.Column("question_group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("explanation_reference", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("word_limit", sa.Integer(), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["question_group_id"], ["question_groups.id"], name=op.f("fk_questions_question_group_id_question_groups")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_questions")),
    )
    op.create_index(op.f("ix_questions_number"), "questions", ["number"], unique=False)
    op.create_index(op.f("ix_questions_question_group_id"), "questions", ["question_group_id"], unique=False)

    op.create_table(
        "answer_variants",
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], name=op.f("fk_answer_variants_question_id_questions")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_answer_variants")),
    )
    op.create_index(op.f("ix_answer_variants_question_id"), "answer_variants", ["question_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_answer_variants_question_id"), table_name="answer_variants")
    op.drop_table("answer_variants")
    op.drop_index(op.f("ix_questions_question_group_id"), table_name="questions")
    op.drop_index(op.f("ix_questions_number"), table_name="questions")
    op.drop_table("questions")
    op.drop_index(op.f("ix_question_groups_section_id"), table_name="question_groups")
    op.drop_index(op.f("ix_question_groups_question_type"), table_name="question_groups")
    op.drop_table("question_groups")
    op.drop_index(op.f("ix_test_sections_test_id"), table_name="test_sections")
    op.drop_table("test_sections")
    op.drop_index(op.f("ix_tests_type"), table_name="tests")
    op.drop_index(op.f("ix_tests_status"), table_name="tests")
    op.drop_index(op.f("ix_tests_created_by"), table_name="tests")
    op.drop_index(op.f("ix_tests_access_type"), table_name="tests")
    op.drop_table("tests")
    op.drop_table("admins")
