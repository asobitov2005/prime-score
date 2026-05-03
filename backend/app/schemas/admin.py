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
    review_status: Literal["needs_review", "approved", "rejected"] = "needs_review"
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


class AdminUploadedAssetResponse(BaseModel):
    public_url: str
    filename: str
    content_type: str


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
    catalog: Literal["public", "gift"] = "public"
    name: str
    duration_days: int
    price: Decimal
    discount_percent: int = 0
    currency: str = "UZS"
    badge_label: str | None = None
    perks: list[str] = Field(default_factory=list)
    is_active: bool = True
    display_order: int = 0
    is_featured: bool = False


class AdminPlanUpsertRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    duration_days: int = Field(ge=1, le=3660)
    price: Decimal = Field(gt=0)
    badge_label: str | None = Field(default=None, max_length=80)
    perks: list[str] = Field(default_factory=list)
    is_active: bool = True
    display_order: int = Field(default=0, ge=0, le=5000)
    is_featured: bool = False


class AdminGiftCodeRead(BaseModel):
    id: UUID
    code: str
    plan_id: UUID | None = None
    plan_name: str = "Unknown plan"
    duration_days: int | None = None
    status: Literal["available", "paused", "redeemed", "revoked", "expired"]
    raw_status: str
    start_date: datetime | None = None
    end_date: datetime | None = None
    max_uses: int = 1
    used_count: int = 0
    remaining_uses: int | None = None
    per_user_limit: int = 1
    target_user_type: Literal["all", "premium", "free"] = "all"
    redeemed_at: datetime | None = None
    created_at: datetime | None = None
    recipient_user_id: UUID | None = None
    recipient_name: str | None = None
    recipient_username: str | None = None


class AdminGiftCodeCreateRequest(BaseModel):
    plan_id: UUID
    quantity: int = Field(default=1, ge=1, le=50)
    prefix: str | None = Field(default=None, max_length=16)
    custom_code: str | None = Field(default=None, min_length=4, max_length=50)
    start_date: datetime | None = None
    end_date: datetime | None = None
    max_uses: int = Field(default=1, ge=1, le=5000)
    per_user_limit: int = Field(default=1, ge=1, le=100)
    target_user_type: Literal["all", "premium", "free"] = "all"
    starts_paused: bool = False


class AdminGiftCodeCreateResponse(BaseModel):
    message: str
    items: list[AdminGiftCodeRead] = Field(default_factory=list)


class AdminGiftCodeUpdateRequest(BaseModel):
    status: Literal["available", "paused", "revoked"]


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
    format: str = "full"
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
    paragraphs: list[dict[str, object]] = Field(default_factory=list)
    showLabels: bool = False
    media_kind: Literal["text", "audio"]
    audio_url: str = ""
    audio_duration_seconds: int | None = None
    transcript: str = ""
    transcript_segments: list[dict[str, object]] = Field(default_factory=list)
    transcript_question_locations: list[dict[str, object]] = Field(default_factory=list)
    marker_count: int = 0


class AdminDraftContentRead(BaseModel):
    sections: list[AdminDraftContentSectionRead] = Field(default_factory=list)


class AdminDraftQuestionRead(BaseModel):
    id: UUID
    section_id: UUID | None = None
    label: str
    type_id: str | None = None
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
    question_block: str = ""
    answer_block: str = ""
    secondary_block: str = ""
    diagram_title: str = ""
    diagram_image_url: str = ""
    questions: list[AdminDraftQuestionRead] = Field(default_factory=list)


class AdminTestDraftRead(BaseModel):
    metadata: AdminDraftMetadataRead
    content: AdminDraftContentRead
    question_groups: list[AdminDraftQuestionGroupRead] = Field(default_factory=list, alias="questionGroups")
    questions: list[AdminDraftQuestionRead] = Field(default_factory=list)
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
    paragraphs: list[dict[str, object]] = Field(default_factory=list)
    showLabels: bool = False
    media_kind: Literal["text", "audio"]
    audio_url: str = ""
    audio_duration_seconds: int | None = None
    transcript: str = ""
    transcript_segments: list[dict[str, object]] = Field(default_factory=list)
    transcript_question_locations: list[dict[str, object]] = Field(default_factory=list)
    marker_count: int = 0


class AdminAudioTranscriptQuestionRequest(BaseModel):
    question_id: str | None = None
    question_label: str
    question_prompt: str
    accepted_answers: list[str] = Field(default_factory=list)


class AdminAudioTranscriptRequest(BaseModel):
    audio_url: str
    audio_filename: str | None = None
    audio_content_type: str | None = None
    section_label: str | None = None
    section_title: str | None = None
    transcript: str | None = None
    transcript_segments: list[AdminAudioTranscriptSegmentRead] = Field(default_factory=list)
    questions: list[AdminAudioTranscriptQuestionRequest] = Field(default_factory=list)


class AdminAudioTranscriptSegmentRead(BaseModel):
    id: str
    start_sec: int
    end_sec: int
    text: str


class AdminAudioTranscriptQuestionLocationRead(BaseModel):
    question_id: str | None = None
    question_label: str
    question_prompt: str
    start_sec: int
    end_sec: int
    answer_text: str
    correct_answer: str


class AdminAudioTranscriptResponse(BaseModel):
    transcript: str
    transcript_segments: list[AdminAudioTranscriptSegmentRead] = Field(default_factory=list)
    transcript_question_locations: list[AdminAudioTranscriptQuestionLocationRead] = Field(default_factory=list)


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
    question_block: str = ""
    answer_block: str = ""
    secondary_block: str = ""
    diagram_title: str = ""
    diagram_image_url: str = ""
    questions: list[AdminDraftQuestionWrite] = Field(default_factory=list)


class AdminTestDraftUpsertRequest(BaseModel):
    metadata: AdminDraftMetadataWrite
    content: list[AdminDraftContentSectionWrite] = Field(default_factory=list)
    question_groups: list[AdminDraftQuestionGroupWrite] = Field(default_factory=list)
