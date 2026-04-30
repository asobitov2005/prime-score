from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AdminAiWorkspaceScopeRead(BaseModel):
    type: Literal["test", "plan", "user", "analytics", "general"] = "general"
    id: str | None = None
    label: str = "General workspace"
    description: str | None = None


class AdminAiWorkspaceScopeWrite(BaseModel):
    type: Literal["test", "plan", "user", "analytics", "general"] = "general"
    id: str | None = None
    label: str = "General workspace"
    description: str | None = None


class AdminAiThreadCreateRequest(BaseModel):
    title: str | None = None
    scope: AdminAiWorkspaceScopeWrite | None = None


class AdminAiThreadUpdateRequest(BaseModel):
    title: str | None = None
    status: Literal["idle", "archived"] | None = None


class AdminAiMessageCreateRequest(BaseModel):
    content: str = Field(min_length=1)
    scope: AdminAiWorkspaceScopeWrite | None = None


class AdminAiToolTraceRead(BaseModel):
    id: str
    label: str
    tool_name: str
    status: Literal["pending", "running", "completed", "failed", "cancelled"]
    started_at: str | None = None
    finished_at: str | None = None
    duration_ms: int | None = None
    input_summary: str | None = None
    output_summary: str | None = None


class AdminAiJobProgressRead(BaseModel):
    completed_steps: int = 0
    total_steps: int = 0
    label: str = "Progress"


class AdminAiJobRead(BaseModel):
    id: UUID
    title: str
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    kind: Literal["chat", "analysis", "generation", "review"] = "chat"
    summary: str
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    model: str | None = None
    error_message: str | None = None
    progress: AdminAiJobProgressRead | None = None
    traces: list[AdminAiToolTraceRead] = Field(default_factory=list)


class AdminAiMessageRead(BaseModel):
    id: str
    role: Literal["system", "user", "assistant", "tool"]
    content: str
    created_at: datetime
    status: Literal["pending", "streaming", "completed", "failed"] = "completed"
    author_label: str
    job_id: str | None = None
    tool_name: str | None = None
    error_message: str | None = None


class AdminAiThreadSummaryRead(BaseModel):
    id: UUID
    title: str
    summary: str
    status: Literal["idle", "queued", "running", "completed", "failed", "archived"]
    updated_at: datetime
    created_at: datetime
    message_count: int = 0
    last_message_preview: str = "No messages yet."
    active_job_id: str | None = None
    scope: AdminAiWorkspaceScopeRead


class AdminAiThreadDetailRead(AdminAiThreadSummaryRead):
    messages: list[AdminAiMessageRead] = Field(default_factory=list)
    jobs: list[AdminAiJobRead] = Field(default_factory=list)


class AdminAiConfigRead(BaseModel):
    provider: Literal["gemini"] = "gemini"
    model_name: str
    has_api_key: bool = False
    background_supported: bool = True
    context_window_tokens: int = 1_048_576
    notes: list[str] = Field(default_factory=list)
