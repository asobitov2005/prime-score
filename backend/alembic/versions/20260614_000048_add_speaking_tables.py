"""add speaking tables

Revision ID: 20260614_000048
Revises: 20260614_000047
Create Date: 2026-06-14
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260614_000048"
down_revision: str | None = "20260614_000047"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


DEFAULT_TEST_ID = "7bfc89b8-21e3-4b5f-b1e9-783a601a1201"


def _uuid_column() -> sa.Column:
    return sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False)


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    ]


def upgrade() -> None:
    op.create_table(
        "speaking_tests",
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("access_type", sa.String(length=32), nullable=False, server_default="public"),
        sa.Column("mode_kind", sa.String(length=32), nullable=False, server_default="full"),
        sa.Column("source", sa.String(length=64), nullable=True),
        sa.Column("source_detail", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        *_timestamps(),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_tests")),
        sa.UniqueConstraint("slug", name=op.f("uq_speaking_tests_slug")),
    )
    op.create_index(op.f("ix_speaking_tests_slug"), "speaking_tests", ["slug"], unique=True)
    op.create_index(op.f("ix_speaking_tests_status"), "speaking_tests", ["status"], unique=False)
    op.create_index(op.f("ix_speaking_tests_access_type"), "speaking_tests", ["access_type"], unique=False)
    op.create_index(op.f("ix_speaking_tests_created_by"), "speaking_tests", ["created_by"], unique=False)

    op.create_table(
        "speaking_test_parts",
        sa.Column("speaking_test_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_tests.id"), nullable=False),
        sa.Column("part_number", sa.Integer(), nullable=False),
        sa.Column("selection_strategy", sa.String(length=32), nullable=False, server_default="fixed"),
        sa.Column("prompt_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("prep_seconds", sa.Integer(), nullable=True),
        sa.Column("response_target_seconds", sa.Integer(), nullable=False, server_default="120"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        *_timestamps(),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_test_parts")),
    )
    op.create_index(op.f("ix_speaking_test_parts_speaking_test_id"), "speaking_test_parts", ["speaking_test_id"], unique=False)
    op.create_index(op.f("ix_speaking_test_parts_part_number"), "speaking_test_parts", ["part_number"], unique=False)

    op.create_table(
        "speaking_topics",
        sa.Column("part_number", sa.Integer(), nullable=False),
        sa.Column("topic_title", sa.String(length=255), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("bullet_points", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("followup_group_key", sa.String(length=128), nullable=True),
        sa.Column("difficulty_label", sa.String(length=32), nullable=True),
        sa.Column("category_tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("source_kind", sa.String(length=32), nullable=False, server_default="custom"),
        sa.Column("source_note", sa.String(length=255), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("seed_rank", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        *_timestamps(),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_topics")),
    )
    op.create_index(op.f("ix_speaking_topics_part_number"), "speaking_topics", ["part_number"], unique=False)
    op.create_index(op.f("ix_speaking_topics_followup_group_key"), "speaking_topics", ["followup_group_key"], unique=False)
    op.create_index(op.f("ix_speaking_topics_active"), "speaking_topics", ["active"], unique=False)

    op.create_table(
        "speaking_topic_question_items",
        sa.Column("speaking_topic_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_topics.id"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="main"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        *_timestamps(),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_topic_question_items")),
    )
    op.create_index(op.f("ix_speaking_topic_question_items_speaking_topic_id"), "speaking_topic_question_items", ["speaking_topic_id"], unique=False)

    op.create_table(
        "speaking_sessions",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("speaking_test_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_tests.id"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("entry_mode", sa.String(length=32), nullable=False, server_default="full"),
        sa.Column("current_part", sa.Integer(), nullable=True),
        sa.Column("live_provider", sa.String(length=64), nullable=True),
        sa.Column("live_model_code", sa.String(length=128), nullable=True),
        sa.Column("live_session_id", sa.String(length=255), nullable=True),
        sa.Column("ephemeral_session_token_id", sa.String(length=255), nullable=True),
        sa.Column("warning_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("termination_reason", sa.String(length=255), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        *_timestamps(),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_sessions")),
    )
    op.create_index(op.f("ix_speaking_sessions_user_id"), "speaking_sessions", ["user_id"], unique=False)
    op.create_index(op.f("ix_speaking_sessions_speaking_test_id"), "speaking_sessions", ["speaking_test_id"], unique=False)
    op.create_index(op.f("ix_speaking_sessions_status"), "speaking_sessions", ["status"], unique=False)
    op.create_index(op.f("ix_speaking_sessions_live_session_id"), "speaking_sessions", ["live_session_id"], unique=False)

    op.create_table(
        "speaking_session_parts",
        sa.Column("speaking_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_sessions.id"), nullable=False),
        sa.Column("part_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_topics.id"), nullable=True),
        sa.Column("response_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        *_timestamps(),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_session_parts")),
    )
    op.create_index(op.f("ix_speaking_session_parts_speaking_session_id"), "speaking_session_parts", ["speaking_session_id"], unique=False)
    op.create_index(op.f("ix_speaking_session_parts_topic_id"), "speaking_session_parts", ["topic_id"], unique=False)

    op.create_table(
        "speaking_audio_assets",
        sa.Column("speaking_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_sessions.id"), nullable=False),
        sa.Column("speaking_session_part_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_session_parts.id"), nullable=True),
        sa.Column("speaker_role", sa.String(length=32), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("channel_kind", sa.String(length=32), nullable=False, server_default="full_mix"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        *_timestamps(),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_audio_assets")),
    )
    op.create_index(op.f("ix_speaking_audio_assets_speaking_session_id"), "speaking_audio_assets", ["speaking_session_id"], unique=False)
    op.create_index(op.f("ix_speaking_audio_assets_speaking_session_part_id"), "speaking_audio_assets", ["speaking_session_part_id"], unique=False)

    op.create_table(
        "speaking_turns",
        sa.Column("speaking_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_sessions.id"), nullable=False),
        sa.Column("speaking_session_part_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_session_parts.id"), nullable=True),
        sa.Column("speaker_role", sa.String(length=32), nullable=False),
        sa.Column("turn_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("text_raw", sa.Text(), nullable=False, server_default=""),
        sa.Column("text_normalized", sa.Text(), nullable=True),
        sa.Column("language_code", sa.String(length=16), nullable=True),
        sa.Column("audio_asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_audio_assets.id"), nullable=True),
        sa.Column("interruption_type", sa.String(length=64), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        *_timestamps(),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_turns")),
    )
    op.create_index(op.f("ix_speaking_turns_speaking_session_id"), "speaking_turns", ["speaking_session_id"], unique=False)
    op.create_index(op.f("ix_speaking_turns_speaking_session_part_id"), "speaking_turns", ["speaking_session_part_id"], unique=False)
    op.create_index(op.f("ix_speaking_turns_speaker_role"), "speaking_turns", ["speaker_role"], unique=False)

    op.create_table(
        "speaking_events",
        sa.Column("speaking_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_sessions.id"), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_events")),
    )
    op.create_index(op.f("ix_speaking_events_speaking_session_id"), "speaking_events", ["speaking_session_id"], unique=False)

    op.create_table(
        "speaking_evaluations",
        sa.Column("speaking_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("speaking_sessions.id"), nullable=False),
        sa.Column("overall_band", sa.Float(), nullable=True),
        sa.Column("fluency_band", sa.Float(), nullable=True),
        sa.Column("lexical_band", sa.Float(), nullable=True),
        sa.Column("grammar_band", sa.Float(), nullable=True),
        sa.Column("pronunciation_band", sa.Float(), nullable=True),
        sa.Column("integrity_penalty_applied", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("integrity_penalty_reason", sa.String(length=255), nullable=True),
        sa.Column("summary_feedback", sa.Text(), nullable=False, server_default=""),
        sa.Column("strengths", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("critical_issues", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("pronunciation_issues", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("grammar_issues", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("lexical_issues", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("improvement_actions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("deep_feedback_markdown", sa.Text(), nullable=False, server_default=""),
        sa.Column("evaluator_model", sa.String(length=128), nullable=True),
        sa.Column("rubric_version", sa.String(length=64), nullable=True),
        *_timestamps(),
        _uuid_column(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_speaking_evaluations")),
        sa.UniqueConstraint("speaking_session_id", name=op.f("uq_speaking_evaluations_speaking_session_id")),
    )
    op.create_index(op.f("ix_speaking_evaluations_speaking_session_id"), "speaking_evaluations", ["speaking_session_id"], unique=True)

    op.execute(
        sa.text(
            """
            INSERT INTO speaking_tests (
                id, title, slug, status, access_type, mode_kind, source, source_detail,
                description, estimated_minutes, version, created_at, updated_at
            )
            VALUES (
                CAST(:id AS uuid), 'IELTS Speaking Mock 1', 'ielts-speaking-mock-1', 'published',
                'public', 'full', 'custom', 'PrimeScore seed',
                'A complete IELTS Speaking practice session with AI examiner support.',
                14, 1, now(), now()
            )
            ON CONFLICT (slug) DO NOTHING
            """
        ).bindparams(sa.bindparam("id", value=DEFAULT_TEST_ID))
    )
    for part_number, response_target_seconds, prep_seconds in ((1, 300, None), (2, 120, 60), (3, 300, None)):
        op.execute(
            sa.text(
                """
                INSERT INTO speaking_test_parts (
                    id, speaking_test_id, part_number, selection_strategy, prompt_count,
                    prep_seconds, response_target_seconds, metadata, created_at, updated_at
                )
                VALUES (
                    gen_random_uuid(), CAST(:test_id AS uuid), :part_number, 'dynamic',
                    1, :prep_seconds, :response_target_seconds, '{}'::jsonb, now(), now()
                )
                """
            ).bindparams(
                sa.bindparam("test_id", value=DEFAULT_TEST_ID),
                sa.bindparam("part_number", value=part_number),
                sa.bindparam("prep_seconds", value=prep_seconds),
                sa.bindparam("response_target_seconds", value=response_target_seconds),
            )
        )


def downgrade() -> None:
    op.drop_table("speaking_evaluations")
    op.drop_table("speaking_events")
    op.drop_table("speaking_turns")
    op.drop_table("speaking_audio_assets")
    op.drop_table("speaking_session_parts")
    op.drop_table("speaking_sessions")
    op.drop_table("speaking_topic_question_items")
    op.drop_table("speaking_topics")
    op.drop_table("speaking_test_parts")
    op.drop_table("speaking_tests")

