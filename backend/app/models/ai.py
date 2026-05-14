from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.enum_values import EnumValueString
from app.models.enums import (
    AdminAiJobStatus,
    AdminAiMessageRole,
    AdminAiThreadStatus,
    AiProvider,
    AiUseCase,
)


class AiProviderConfig(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_provider_configs"

    provider: Mapped[AiProvider] = mapped_column(
        EnumValueString(AiProvider), unique=True, index=True
    )
    label: Mapped[str] = mapped_column(String(120))
    api_key: Mapped[str] = mapped_column(Text, default="")
    base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)


class AiProviderModel(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_provider_models"
    __table_args__ = (
        UniqueConstraint("provider_config_id", "model_id", name="uq_ai_provider_models_provider_model"),
    )

    provider_config_id: Mapped[UUID] = mapped_column(
        ForeignKey("ai_provider_configs.id"), index=True
    )
    model_id: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(255))
    family: Mapped[str | None] = mapped_column(String(120), nullable=True)
    capabilities: Mapped[dict] = mapped_column(JSONB, default=dict)
    context_window: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_accessible: Mapped[bool] = mapped_column(Boolean, default=True)
    is_selectable: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class AiUseCaseBinding(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_use_case_bindings"

    use_case: Mapped[AiUseCase] = mapped_column(
        EnumValueString(AiUseCase), unique=True, index=True
    )
    provider_config_id: Mapped[UUID] = mapped_column(
        ForeignKey("ai_provider_configs.id"), index=True
    )
    provider_model_id: Mapped[UUID] = mapped_column(
        ForeignKey("ai_provider_models.id"), index=True
    )
    settings_json: Mapped[dict] = mapped_column(JSONB, default=dict)


class AiUsageEvent(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_usage_events"

    provider_config_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("ai_provider_configs.id"), nullable=True, index=True
    )
    provider_model_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("ai_provider_models.id"), nullable=True, index=True
    )
    provider: Mapped[AiProvider] = mapped_column(EnumValueString(AiProvider), index=True)
    use_case: Mapped[AiUseCase] = mapped_column(EnumValueString(AiUseCase), index=True)
    model_id: Mapped[str] = mapped_column(String(255), index=True)
    operation: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), index=True, default="success")
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cached_prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    thoughts_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requested_output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    effective_output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    request_characters: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_characters: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)


class AdminAiThread(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "admin_ai_threads"

    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="New AI task")
    summary: Mapped[str | None] = mapped_column(Text(), nullable=True)
    provider: Mapped[str] = mapped_column(String(32), default="google")
    model_name: Mapped[str] = mapped_column(String(120), default="gemini-3-flash-preview")
    task_kind: Mapped[str] = mapped_column(String(64), default="test_builder")
    status: Mapped[AdminAiThreadStatus] = mapped_column(
        EnumValueString(AdminAiThreadStatus),
        default=AdminAiThreadStatus.ACTIVE,
    )
    last_job_status: Mapped[AdminAiJobStatus | None] = mapped_column(
        EnumValueString(AdminAiJobStatus),
        nullable=True,
    )
    context: Mapped[dict] = mapped_column(JSONB, default=dict)


class AdminAiMessage(UUIDMixin, Base):
    __tablename__ = "admin_ai_messages"

    thread_id: Mapped[UUID] = mapped_column(ForeignKey("admin_ai_threads.id"), index=True)
    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id"), index=True)
    role: Mapped[AdminAiMessageRole] = mapped_column(EnumValueString(AdminAiMessageRole))
    content: Mapped[str] = mapped_column(Text(), default="")
    tool_calls: Mapped[list] = mapped_column(JSONB, default=list)
    extra_payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AdminAiJob(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "admin_ai_jobs"

    thread_id: Mapped[UUID] = mapped_column(ForeignKey("admin_ai_threads.id"), index=True)
    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id"), index=True)
    user_message_id: Mapped[UUID | None] = mapped_column(ForeignKey("admin_ai_messages.id"), nullable=True)
    assistant_message_id: Mapped[UUID | None] = mapped_column(ForeignKey("admin_ai_messages.id"), nullable=True)
    provider: Mapped[str] = mapped_column(String(32), default="google")
    model_name: Mapped[str] = mapped_column(String(120), default="gemini-3-flash-preview")
    broker_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    task_kind: Mapped[str] = mapped_column(String(64), default="test_builder")
    status: Mapped[AdminAiJobStatus] = mapped_column(
        EnumValueString(AdminAiJobStatus),
        default=AdminAiJobStatus.QUEUED,
        index=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_background: Mapped[bool] = mapped_column(Boolean, default=True)
    tool_trace: Mapped[list] = mapped_column(JSONB, default=list)
    result_payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
