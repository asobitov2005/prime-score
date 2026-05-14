"""add AI provider config and writing prompt versioning

Revision ID: 20260514_000021
Revises: 20260509_000020
Create Date: 2026-05-14 00:00:00.000000
"""

from __future__ import annotations

import os
from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from app.services.writing_anchors import ANCHORS
from app.services.writing_config import (
    DEFAULT_ANCHOR_SET_DESCRIPTION,
    DEFAULT_ANCHOR_SET_SLUG,
    DEFAULT_ANCHOR_SET_TITLE,
    DEFAULT_PROFILE_DESCRIPTION,
    DEFAULT_PROFILE_SLUG,
    DEFAULT_PROFILE_TITLE,
    DEFAULT_PROMPT_ENTRIES,
    DEFAULT_RUBRIC_VERSION,
)
from app.services.writing_rubric import IELTS_WRITING_RUBRIC_TEXT


revision: str = "20260514_000021"
down_revision: str | None = "20260509_000020"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_provider_configs",
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("api_key", sa.Text(), nullable=False, server_default=""),
        sa.Column("base_url", sa.String(length=500), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_status", sa.String(length=32), nullable=True),
        sa.Column("last_sync_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_provider_configs")),
    )
    op.create_index(op.f("ix_ai_provider_configs_provider"), "ai_provider_configs", ["provider"], unique=True)

    op.create_table(
        "ai_provider_models",
        sa.Column("provider_config_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_provider_configs.id"), nullable=False),
        sa.Column("model_id", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("family", sa.String(length=120), nullable=True),
        sa.Column("capabilities", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("context_window", sa.Integer(), nullable=True),
        sa.Column("is_accessible", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_selectable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_provider_models")),
        sa.UniqueConstraint("provider_config_id", "model_id", name="uq_ai_provider_models_provider_model"),
    )
    op.create_index(op.f("ix_ai_provider_models_provider_config_id"), "ai_provider_models", ["provider_config_id"], unique=False)

    op.create_table(
        "ai_use_case_bindings",
        sa.Column("use_case", sa.String(length=64), nullable=False),
        sa.Column("provider_config_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_provider_configs.id"), nullable=False),
        sa.Column("provider_model_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_provider_models.id"), nullable=False),
        sa.Column("settings_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ai_use_case_bindings")),
    )
    op.create_index(op.f("ix_ai_use_case_bindings_use_case"), "ai_use_case_bindings", ["use_case"], unique=True)
    op.create_index(op.f("ix_ai_use_case_bindings_provider_config_id"), "ai_use_case_bindings", ["provider_config_id"], unique=False)
    op.create_index(op.f("ix_ai_use_case_bindings_provider_model_id"), "ai_use_case_bindings", ["provider_model_id"], unique=False)

    op.create_table(
        "writing_prompt_profiles",
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("task_type_scope", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_prompt_profiles")),
    )
    op.create_index(op.f("ix_writing_prompt_profiles_slug"), "writing_prompt_profiles", ["slug"], unique=False)
    op.create_index(op.f("ix_writing_prompt_profiles_task_type_scope"), "writing_prompt_profiles", ["task_type_scope"], unique=False)
    op.create_index(op.f("ix_writing_prompt_profiles_status"), "writing_prompt_profiles", ["status"], unique=False)
    op.create_index(op.f("ix_writing_prompt_profiles_is_active"), "writing_prompt_profiles", ["is_active"], unique=False)
    op.create_index(op.f("ix_writing_prompt_profiles_created_by"), "writing_prompt_profiles", ["created_by"], unique=False)

    op.create_table(
        "writing_prompt_entries",
        sa.Column("profile_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("writing_prompt_profiles.id"), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("format", sa.String(length=16), nullable=False, server_default="text"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_prompt_entries")),
        sa.UniqueConstraint("profile_id", "key", name="uq_writing_prompt_entries_profile_key"),
    )
    op.create_index(op.f("ix_writing_prompt_entries_profile_id"), "writing_prompt_entries", ["profile_id"], unique=False)
    op.create_index(op.f("ix_writing_prompt_entries_key"), "writing_prompt_entries", ["key"], unique=False)

    op.create_table(
        "writing_rubric_versions",
        sa.Column("task_type_scope", sa.String(length=32), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_rubric_versions")),
    )
    op.create_index(op.f("ix_writing_rubric_versions_task_type_scope"), "writing_rubric_versions", ["task_type_scope"], unique=False)
    op.create_index(op.f("ix_writing_rubric_versions_status"), "writing_rubric_versions", ["status"], unique=False)
    op.create_index(op.f("ix_writing_rubric_versions_is_active"), "writing_rubric_versions", ["is_active"], unique=False)
    op.create_index(op.f("ix_writing_rubric_versions_created_by"), "writing_rubric_versions", ["created_by"], unique=False)

    op.create_table(
        "writing_anchor_sets",
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("task_type_scope", sa.String(length=32), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_anchor_sets")),
    )
    op.create_index(op.f("ix_writing_anchor_sets_slug"), "writing_anchor_sets", ["slug"], unique=False)
    op.create_index(op.f("ix_writing_anchor_sets_task_type_scope"), "writing_anchor_sets", ["task_type_scope"], unique=False)
    op.create_index(op.f("ix_writing_anchor_sets_status"), "writing_anchor_sets", ["status"], unique=False)
    op.create_index(op.f("ix_writing_anchor_sets_is_active"), "writing_anchor_sets", ["is_active"], unique=False)
    op.create_index(op.f("ix_writing_anchor_sets_created_by"), "writing_anchor_sets", ["created_by"], unique=False)

    op.create_table(
        "writing_anchor_items",
        sa.Column("anchor_set_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("writing_anchor_sets.id"), nullable=False),
        sa.Column("band", sa.Float(), nullable=False),
        sa.Column("essay", sa.Text(), nullable=False),
        sa.Column("criteria", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("rationale", sa.Text(), nullable=False, server_default=""),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_anchor_items")),
    )
    op.create_index(op.f("ix_writing_anchor_items_anchor_set_id"), "writing_anchor_items", ["anchor_set_id"], unique=False)

    op.create_table(
        "writing_config_audit_logs",
        sa.Column("actor_admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("entity_type", sa.String(length=32), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("previous_version", sa.Integer(), nullable=True),
        sa.Column("new_version", sa.Integer(), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_config_audit_logs")),
    )
    op.create_index(op.f("ix_writing_config_audit_logs_actor_admin_id"), "writing_config_audit_logs", ["actor_admin_id"], unique=False)
    op.create_index(op.f("ix_writing_config_audit_logs_entity_type"), "writing_config_audit_logs", ["entity_type"], unique=False)
    op.create_index(op.f("ix_writing_config_audit_logs_entity_id"), "writing_config_audit_logs", ["entity_id"], unique=False)

    op.add_column("writing_evaluations", sa.Column("grader_profile_version", sa.Integer(), nullable=True))
    op.add_column("writing_evaluations", sa.Column("rubric_version", sa.Integer(), nullable=True))
    op.add_column("writing_evaluations", sa.Column("anchor_set_version", sa.Integer(), nullable=True))
    op.add_column("writing_evaluations", sa.Column("roast_profile_version", sa.Integer(), nullable=True))
    op.add_column("writing_evaluations", sa.Column("improved_profile_version", sa.Integer(), nullable=True))
    op.add_column("writing_evaluations", sa.Column("annotation_profile_version", sa.Integer(), nullable=True))

    op.execute("UPDATE admin_ai_threads SET provider = 'google' WHERE provider = 'gemini'")
    op.execute("UPDATE admin_ai_jobs SET provider = 'google' WHERE provider = 'gemini'")

    _seed_initial_data()


def downgrade() -> None:
    op.drop_column("writing_evaluations", "annotation_profile_version")
    op.drop_column("writing_evaluations", "improved_profile_version")
    op.drop_column("writing_evaluations", "roast_profile_version")
    op.drop_column("writing_evaluations", "anchor_set_version")
    op.drop_column("writing_evaluations", "rubric_version")
    op.drop_column("writing_evaluations", "grader_profile_version")

    op.drop_index(op.f("ix_writing_config_audit_logs_entity_id"), table_name="writing_config_audit_logs")
    op.drop_index(op.f("ix_writing_config_audit_logs_entity_type"), table_name="writing_config_audit_logs")
    op.drop_index(op.f("ix_writing_config_audit_logs_actor_admin_id"), table_name="writing_config_audit_logs")
    op.drop_table("writing_config_audit_logs")

    op.drop_index(op.f("ix_writing_anchor_items_anchor_set_id"), table_name="writing_anchor_items")
    op.drop_table("writing_anchor_items")

    op.drop_index(op.f("ix_writing_anchor_sets_created_by"), table_name="writing_anchor_sets")
    op.drop_index(op.f("ix_writing_anchor_sets_is_active"), table_name="writing_anchor_sets")
    op.drop_index(op.f("ix_writing_anchor_sets_status"), table_name="writing_anchor_sets")
    op.drop_index(op.f("ix_writing_anchor_sets_task_type_scope"), table_name="writing_anchor_sets")
    op.drop_index(op.f("ix_writing_anchor_sets_slug"), table_name="writing_anchor_sets")
    op.drop_table("writing_anchor_sets")

    op.drop_index(op.f("ix_writing_rubric_versions_created_by"), table_name="writing_rubric_versions")
    op.drop_index(op.f("ix_writing_rubric_versions_is_active"), table_name="writing_rubric_versions")
    op.drop_index(op.f("ix_writing_rubric_versions_status"), table_name="writing_rubric_versions")
    op.drop_index(op.f("ix_writing_rubric_versions_task_type_scope"), table_name="writing_rubric_versions")
    op.drop_table("writing_rubric_versions")

    op.drop_index(op.f("ix_writing_prompt_entries_key"), table_name="writing_prompt_entries")
    op.drop_index(op.f("ix_writing_prompt_entries_profile_id"), table_name="writing_prompt_entries")
    op.drop_table("writing_prompt_entries")

    op.drop_index(op.f("ix_writing_prompt_profiles_created_by"), table_name="writing_prompt_profiles")
    op.drop_index(op.f("ix_writing_prompt_profiles_is_active"), table_name="writing_prompt_profiles")
    op.drop_index(op.f("ix_writing_prompt_profiles_status"), table_name="writing_prompt_profiles")
    op.drop_index(op.f("ix_writing_prompt_profiles_task_type_scope"), table_name="writing_prompt_profiles")
    op.drop_index(op.f("ix_writing_prompt_profiles_slug"), table_name="writing_prompt_profiles")
    op.drop_table("writing_prompt_profiles")

    op.drop_index(op.f("ix_ai_use_case_bindings_provider_model_id"), table_name="ai_use_case_bindings")
    op.drop_index(op.f("ix_ai_use_case_bindings_provider_config_id"), table_name="ai_use_case_bindings")
    op.drop_index(op.f("ix_ai_use_case_bindings_use_case"), table_name="ai_use_case_bindings")
    op.drop_table("ai_use_case_bindings")

    op.drop_index(op.f("ix_ai_provider_models_provider_config_id"), table_name="ai_provider_models")
    op.drop_table("ai_provider_models")

    op.drop_index(op.f("ix_ai_provider_configs_provider"), table_name="ai_provider_configs")
    op.drop_table("ai_provider_configs")


def _seed_initial_data() -> None:
    bind = op.get_bind()
    now = datetime.now(UTC)

    ai_provider_configs = sa.table(
        "ai_provider_configs",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("provider", sa.String()),
        sa.column("label", sa.String()),
        sa.column("api_key", sa.Text()),
        sa.column("base_url", sa.String()),
        sa.column("is_enabled", sa.Boolean()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    ai_provider_models = sa.table(
        "ai_provider_models",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("provider_config_id", postgresql.UUID(as_uuid=True)),
        sa.column("model_id", sa.String()),
        sa.column("display_name", sa.String()),
        sa.column("family", sa.String()),
        sa.column("capabilities", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("context_window", sa.Integer()),
        sa.column("is_accessible", sa.Boolean()),
        sa.column("is_selectable", sa.Boolean()),
        sa.column("sort_order", sa.Integer()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    ai_use_case_bindings = sa.table(
        "ai_use_case_bindings",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("use_case", sa.String()),
        sa.column("provider_config_id", postgresql.UUID(as_uuid=True)),
        sa.column("provider_model_id", postgresql.UUID(as_uuid=True)),
        sa.column("settings_json", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    writing_prompt_profiles = sa.table(
        "writing_prompt_profiles",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("slug", sa.String()),
        sa.column("title", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("task_type_scope", sa.String()),
        sa.column("status", sa.String()),
        sa.column("version", sa.Integer()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_by", postgresql.UUID(as_uuid=True)),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    writing_prompt_entries = sa.table(
        "writing_prompt_entries",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("profile_id", postgresql.UUID(as_uuid=True)),
        sa.column("key", sa.String()),
        sa.column("body", sa.Text()),
        sa.column("format", sa.String()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    writing_rubric_versions = sa.table(
        "writing_rubric_versions",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("task_type_scope", sa.String()),
        sa.column("version", sa.Integer()),
        sa.column("body", sa.Text()),
        sa.column("status", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_by", postgresql.UUID(as_uuid=True)),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    writing_anchor_sets = sa.table(
        "writing_anchor_sets",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("slug", sa.String()),
        sa.column("title", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("task_type_scope", sa.String()),
        sa.column("version", sa.Integer()),
        sa.column("status", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_by", postgresql.UUID(as_uuid=True)),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    writing_anchor_items = sa.table(
        "writing_anchor_items",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("anchor_set_id", postgresql.UUID(as_uuid=True)),
        sa.column("band", sa.Float()),
        sa.column("essay", sa.Text()),
        sa.column("criteria", postgresql.JSONB(astext_type=sa.Text())),
        sa.column("rationale", sa.Text()),
        sa.column("sort_order", sa.Integer()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )

    google_provider_id = uuid4()
    cerebras_provider_id = uuid4()
    google_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    cerebras_key = (os.environ.get("CEREBRAS_API_KEY") or "").strip()
    bind.execute(
        ai_provider_configs.insert(),
        [
            {
                "id": google_provider_id,
                "provider": "google",
                "label": "Google",
                "api_key": google_key,
                "base_url": None,
                "is_enabled": bool(google_key),
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": cerebras_provider_id,
                "provider": "cerebras",
                "label": "Cerebras",
                "api_key": cerebras_key,
                "base_url": None,
                "is_enabled": bool(cerebras_key),
                "created_at": now,
                "updated_at": now,
            },
        ],
    )

    google_general_model = (os.environ.get("GEMINI_MODEL") or "gemini-3-flash-preview").strip()
    google_writing_model = (os.environ.get("GEMINI_WRITING_MODEL") or google_general_model).strip()
    general_model_id = uuid4()
    writing_model_id = general_model_id if google_writing_model == google_general_model else uuid4()
    model_rows = [
        {
            "id": general_model_id,
            "provider_config_id": google_provider_id,
            "model_id": google_general_model,
            "display_name": google_general_model,
            "family": "gemini",
            "capabilities": {"generate_content": True, "vision": True, "audio_input": True},
            "context_window": None,
            "is_accessible": True,
            "is_selectable": True,
            "sort_order": 0,
            "created_at": now,
            "updated_at": now,
        }
    ]
    if writing_model_id != general_model_id:
        model_rows.append(
            {
                "id": writing_model_id,
                "provider_config_id": google_provider_id,
                "model_id": google_writing_model,
                "display_name": google_writing_model,
                "family": "gemini",
                "capabilities": {"generate_content": True, "vision": True, "audio_input": True},
                "context_window": None,
                "is_accessible": True,
                "is_selectable": True,
                "sort_order": 1,
                "created_at": now,
                "updated_at": now,
            }
        )
    bind.execute(ai_provider_models.insert(), model_rows)

    bind.execute(
        ai_use_case_bindings.insert(),
        [
            {
                "id": uuid4(),
                "use_case": "admin_chat",
                "provider_config_id": google_provider_id,
                "provider_model_id": general_model_id,
                "settings_json": {},
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid4(),
                "use_case": "writing_grader",
                "provider_config_id": google_provider_id,
                "provider_model_id": writing_model_id,
                "settings_json": {},
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid4(),
                "use_case": "writing_improver",
                "provider_config_id": google_provider_id,
                "provider_model_id": writing_model_id,
                "settings_json": {},
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid4(),
                "use_case": "writing_roast",
                "provider_config_id": google_provider_id,
                "provider_model_id": writing_model_id,
                "settings_json": {},
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid4(),
                "use_case": "writing_image_summary",
                "provider_config_id": google_provider_id,
                "provider_model_id": writing_model_id,
                "settings_json": {},
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": uuid4(),
                "use_case": "audio_transcription",
                "provider_config_id": google_provider_id,
                "provider_model_id": general_model_id,
                "settings_json": {},
                "created_at": now,
                "updated_at": now,
            },
        ],
    )

    prompt_profile_id = uuid4()
    bind.execute(
        writing_prompt_profiles.insert(),
        [
            {
                "id": prompt_profile_id,
                "slug": DEFAULT_PROFILE_SLUG,
                "title": DEFAULT_PROFILE_TITLE,
                "description": DEFAULT_PROFILE_DESCRIPTION,
                "task_type_scope": "all",
                "status": "published",
                "version": 1,
                "is_active": True,
                "created_by": None,
                "created_at": now,
                "updated_at": now,
            }
        ],
    )
    bind.execute(
        writing_prompt_entries.insert(),
        [
            {
                "id": uuid4(),
                "profile_id": prompt_profile_id,
                "key": key.value,
                "body": value,
                "format": "text",
                "created_at": now,
                "updated_at": now,
            }
            for key, value in DEFAULT_PROMPT_ENTRIES.items()
        ],
    )

    bind.execute(
        writing_rubric_versions.insert(),
        [
            {
                "id": uuid4(),
                "task_type_scope": "all",
                "version": DEFAULT_RUBRIC_VERSION,
                "body": IELTS_WRITING_RUBRIC_TEXT,
                "status": "published",
                "is_active": True,
                "created_by": None,
                "created_at": now,
                "updated_at": now,
            }
        ],
    )

    for task_type_scope in ("task_1", "task_2"):
        anchor_set_id = uuid4()
        bind.execute(
            writing_anchor_sets.insert(),
            [
                {
                    "id": anchor_set_id,
                    "slug": DEFAULT_ANCHOR_SET_SLUG,
                    "title": DEFAULT_ANCHOR_SET_TITLE,
                    "description": DEFAULT_ANCHOR_SET_DESCRIPTION,
                    "task_type_scope": task_type_scope,
                    "version": 1,
                    "status": "published",
                    "is_active": True,
                    "created_by": None,
                    "created_at": now,
                    "updated_at": now,
                }
            ],
        )
        bind.execute(
            writing_anchor_items.insert(),
            [
                {
                    "id": uuid4(),
                    "anchor_set_id": anchor_set_id,
                    "band": float(item.get("band") or 0),
                    "essay": str(item.get("essay") or ""),
                    "criteria": dict(item.get("criteria") or {}),
                    "rationale": str(item.get("rationale") or ""),
                    "sort_order": index,
                    "created_at": now,
                    "updated_at": now,
                }
                for index, item in enumerate(ANCHORS.get(task_type_scope, []))
            ],
        )

    op.execute(
        """
        UPDATE writing_evaluations
        SET grader_profile_version = 1,
            rubric_version = 1,
            anchor_set_version = 1,
            roast_profile_version = 1,
            improved_profile_version = 1,
            annotation_profile_version = 1
        """
    )
