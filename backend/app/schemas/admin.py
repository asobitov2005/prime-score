from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import AccessType, NotificationType, PaymentMethod, PaymentStatus, TestSource, TestStatus, TestType, UserRole


class AdminDashboardRead(BaseModel):
    users_total: int = 0
    premium_users: int = 0
    tests_total: int = 0
    tests_published: int = 0
    tests_draft: int = 0
    tests_archived: int = 0
    attempts_total: int = 0
    attempts_completed: int = 0
    payments_pending: int = 0
    revenue_total: Decimal = Decimal("0")
    average_band: float | None = None


class AdminTestUpsertRequest(BaseModel):
    title: str
    test_type: TestType
    access_type: AccessType
    source: TestSource | None = None
    source_detail: str | None = None
    description: str | None = None
    exam_date: date | None = None
    exam_time_limit_min: int
    total_questions: int = 40


class AdminTestRead(AdminTestUpsertRequest):
    id: UUID
    format: str | None = None
    status: TestStatus = TestStatus.draft
    version: int = 1
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AdminContentCreateRequest(BaseModel):
    payload: dict[str, object] = Field(default_factory=dict)


class CreatedEntityResponse(BaseModel):
    resource: str
    id: UUID
    payload: dict[str, object] = Field(default_factory=dict)


class AdminUploadUrlRequest(BaseModel):
    filename: str
    content_type: str


class AdminUploadUrlResponse(BaseModel):
    upload_url: str
    public_url: str
    expires_in_seconds: int = 3600
    fields: dict[str, str] = Field(default_factory=dict)


class AdminUserRead(BaseModel):
    id: UUID
    telegram_id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    is_premium: bool = False
    show_on_leaderboard: bool = True


class AdminPlanRead(BaseModel):
    id: UUID
    name: str
    duration_days: int
    price: Decimal
    discount_percent: int = 0
    currency: str = "UZS"
    is_active: bool = True
    display_order: int = 0


class AdminPromoCodeRead(BaseModel):
    id: UUID
    code: str
    discount_percent: int
    max_uses: int | None = None
    current_uses: int = 0
    is_active: bool = True


class AdminAuditLogRead(BaseModel):
    id: UUID
    admin_id: UUID
    action: str
    entity_type: str
    entity_id: UUID
    changes: dict[str, object] = Field(default_factory=dict)
    created_at: datetime | None = None


class AdminDraftDecisionRead(BaseModel):
    label: str
    state: str
    detail: str


class AdminDraftDecisionsRead(BaseModel):
    question_bank: AdminDraftDecisionRead
    payment: AdminDraftDecisionRead
    listening_timer: AdminDraftDecisionRead


class AdminDraftMetadataRead(BaseModel):
    title: str
    type: Literal["reading", "listening"]
    source: Literal["cambridge", "real_exam", "custom"]
    source_detail: str
    access_type: Literal["public", "premium"]
    status: Literal["draft", "published", "archived"]
    version: int
    time_limit_label: str


class AdminDraftContentSectionRead(BaseModel):
    id: UUID
    label: str
    title: str
    subtitle: str
    content: str
    media_kind: Literal["text", "audio"]
    marker_count: int = 0


class AdminDraftContentRead(BaseModel):
    sections: list[AdminDraftContentSectionRead] = Field(default_factory=list)


class AdminDraftQuestionRead(BaseModel):
    id: UUID
    section_id: UUID
    label: str
    type_id: str
    prompt: str
    accepted_answers: list[str] = Field(default_factory=list)
    explanation: str
    variants: list[str] = Field(default_factory=list)


class AdminDraftChecklistItemRead(BaseModel):
    id: str
    label: str
    status: Literal["ready", "draft", "blocked"]
    detail: str


class AdminDraftReviewRead(BaseModel):
    checklist: list[AdminDraftChecklistItemRead] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class AdminDraftQuestionGroupRead(BaseModel):
    id: UUID
    section_id: UUID
    title: str
    instructions: str
    type_id: str
    question_start: int
    question_end: int
    shared_options: list[str] = Field(default_factory=list)
    questions: list[AdminDraftQuestionRead] = Field(default_factory=list)


class AdminTestDraftRead(BaseModel):
    metadata: AdminDraftMetadataRead
    content: AdminDraftContentRead
    question_groups: list[AdminDraftQuestionGroupRead] = Field(default_factory=list, alias="question_groups")
    review: AdminDraftReviewRead
    decisions: AdminDraftDecisionsRead
    
    model_config = ConfigDict(populate_by_name=True)


class AdminDraftMetadataWrite(BaseModel):
    title: str
    type: Literal["reading", "listening"]
    format: str = "full"
    source: Literal["cambridge", "real_exam", "custom"]
    source_detail: str = ""
    access_type: Literal["public", "premium"]
    time_limit_label: str


class AdminDraftContentSectionWrite(BaseModel):
    id: UUID | None = None
    label: str
    title: str
    subtitle: str
    content: str
    media_kind: Literal["text", "audio"]
    marker_count: int = 0


class AdminDraftQuestionWrite(BaseModel):
    id: UUID | None = None
    label: str
    prompt: str
    accepted_answers: list[str] = Field(default_factory=list)
    explanation: str = ""
    variants: list[str] = Field(default_factory=list)


class AdminDraftQuestionGroupWrite(BaseModel):
    id: UUID | None = None
    section_id: UUID
    title: str
    instructions: str
    type_id: str
    question_start: int
    question_end: int
    shared_options: list[str] = Field(default_factory=list)
    questions: list[AdminDraftQuestionWrite] = Field(default_factory=list)


class AdminTestDraftUpsertRequest(BaseModel):
    metadata: AdminDraftMetadataWrite
    content: list[AdminDraftContentSectionWrite] = Field(default_factory=list)
    question_groups: list[AdminDraftQuestionGroupWrite] = Field(default_factory=list)
