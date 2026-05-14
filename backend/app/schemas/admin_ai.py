from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import AiProvider, AiUseCase, WritingConfigStatus, WritingPromptFormat, WritingPromptKey, WritingTaskTypeScope


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
    provider: str = "google"
    model_name: str
    has_api_key: bool = False
    background_supported: bool = True
    context_window_tokens: int = 1_048_576
    notes: list[str] = Field(default_factory=list)


class AdminAiProviderConfigRead(BaseModel):
    id: UUID
    provider: AiProvider
    label: str
    api_key_masked: str | None = None
    has_api_key: bool = False
    base_url: str | None = None
    is_enabled: bool = False
    last_sync_at: datetime | None = None
    last_sync_status: str | None = None
    last_sync_error: str | None = None


class AdminAiProviderConfigUpdateRequest(BaseModel):
    label: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    is_enabled: bool | None = None


class AdminAiProviderValidationRequest(BaseModel):
    api_key: str | None = None
    base_url: str | None = None


class AdminAiProviderValidationRead(BaseModel):
    ok: bool
    provider: AiProvider
    message: str
    models_seen: int | None = None


class AdminAiProviderModelRead(BaseModel):
    id: UUID
    model_id: str
    display_name: str
    family: str | None = None
    capabilities: dict = Field(default_factory=dict)
    context_window: int | None = None
    is_accessible: bool = True
    is_selectable: bool = True
    sort_order: int = 0


class AdminAiUseCaseBindingRead(BaseModel):
    id: UUID | None = None
    use_case: AiUseCase
    provider_config_id: UUID | None = None
    provider: AiProvider | None = None
    provider_label: str | None = None
    provider_model_id: UUID | None = None
    model_id: str | None = None
    model_display_name: str | None = None
    settings_json: dict = Field(default_factory=dict)
    resolved_source: str = "missing"


class AdminAiUseCaseBindingUpdateRequest(BaseModel):
    provider_config_id: UUID
    provider_model_id: UUID
    settings_json: dict = Field(default_factory=dict)


class AdminWritingPromptEntryInput(BaseModel):
    key: WritingPromptKey
    body: str
    format: WritingPromptFormat = WritingPromptFormat.TEXT


class AdminWritingPromptProfileCreateRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    task_type_scope: WritingTaskTypeScope = WritingTaskTypeScope.ALL
    entries: list[AdminWritingPromptEntryInput] = Field(default_factory=list)


class AdminWritingPromptProfileUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    entries: list[AdminWritingPromptEntryInput] | None = None


class AdminWritingPromptEntryRead(BaseModel):
    id: UUID
    key: WritingPromptKey
    body: str
    format: WritingPromptFormat


class AdminWritingPromptProfileRead(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str | None = None
    task_type_scope: WritingTaskTypeScope
    status: WritingConfigStatus
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    entries: list[AdminWritingPromptEntryRead] = Field(default_factory=list)


class AdminWritingRubricCreateRequest(BaseModel):
    task_type_scope: WritingTaskTypeScope = WritingTaskTypeScope.ALL
    body: str = Field(min_length=1)


class AdminWritingRubricUpdateRequest(BaseModel):
    body: str | None = None


class AdminWritingRubricRead(BaseModel):
    id: UUID
    task_type_scope: WritingTaskTypeScope
    version: int
    body: str
    status: WritingConfigStatus
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdminWritingAnchorItemInput(BaseModel):
    band: float
    essay: str
    criteria: dict = Field(default_factory=dict)
    rationale: str = ""


class AdminWritingAnchorSetCreateRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    task_type_scope: WritingTaskTypeScope
    items: list[AdminWritingAnchorItemInput] = Field(default_factory=list)


class AdminWritingAnchorSetUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    items: list[AdminWritingAnchorItemInput] | None = None


class AdminWritingAnchorItemRead(BaseModel):
    id: UUID
    band: float
    essay: str
    criteria: dict = Field(default_factory=dict)
    rationale: str = ""
    sort_order: int = 0


class AdminWritingAnchorSetRead(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str | None = None
    task_type_scope: WritingTaskTypeScope
    version: int
    status: WritingConfigStatus
    is_active: bool
    created_at: datetime
    updated_at: datetime
    items: list[AdminWritingAnchorItemRead] = Field(default_factory=list)


class AdminWritingPromptPreviewRequest(BaseModel):
    task_type: WritingTaskTypeScope
    task_prompt_text: str = ""
    image_summary: str = ""
    essay_text: str = ""


class AdminWritingPromptPreviewRead(BaseModel):
    grader_system: str
    grader_user: str
    improved_version: str
    roast_system: str
    roast_user: str


class AdminWritingConfigAuditRead(BaseModel):
    id: UUID
    actor_admin_id: UUID | None = None
    entity_type: str
    entity_id: UUID
    action: str
    previous_version: int | None = None
    new_version: int | None = None
    metadata_json: dict = Field(default_factory=dict)
    created_at: datetime
