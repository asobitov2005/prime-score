from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AdminAiJobStatus, AdminAiMessageRole, AdminAiThreadStatus


class AdminAiThread(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "admin_ai_threads"

    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="New AI task")
    summary: Mapped[str | None] = mapped_column(Text(), nullable=True)
    provider: Mapped[str] = mapped_column(String(32), default="gemini")
    model_name: Mapped[str] = mapped_column(String(120), default="gemini-3-flash-preview")
    task_kind: Mapped[str] = mapped_column(String(64), default="test_builder")
    status: Mapped[AdminAiThreadStatus] = mapped_column(
        Enum(AdminAiThreadStatus, native_enum=False),
        default=AdminAiThreadStatus.ACTIVE,
    )
    last_job_status: Mapped[AdminAiJobStatus | None] = mapped_column(
        Enum(AdminAiJobStatus, native_enum=False),
        nullable=True,
    )
    context: Mapped[dict] = mapped_column(JSONB, default=dict)


class AdminAiMessage(UUIDMixin, Base):
    __tablename__ = "admin_ai_messages"

    thread_id: Mapped[UUID] = mapped_column(ForeignKey("admin_ai_threads.id"), index=True)
    admin_id: Mapped[UUID] = mapped_column(ForeignKey("admins.id"), index=True)
    role: Mapped[AdminAiMessageRole] = mapped_column(Enum(AdminAiMessageRole, native_enum=False))
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
    provider: Mapped[str] = mapped_column(String(32), default="gemini")
    model_name: Mapped[str] = mapped_column(String(120), default="gemini-3-flash-preview")
    broker_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    task_kind: Mapped[str] = mapped_column(String(64), default="test_builder")
    status: Mapped[AdminAiJobStatus] = mapped_column(
        Enum(AdminAiJobStatus, native_enum=False),
        default=AdminAiJobStatus.QUEUED,
        index=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_background: Mapped[bool] = mapped_column(Boolean, default=True)
    tool_trace: Mapped[list] = mapped_column(JSONB, default=list)
    result_payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
