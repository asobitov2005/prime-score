from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.schemas.admin_dependencies import *

class AdminPromoCodeRead(BaseModel):
    id: UUID
    code: str
    discount_percent: int
    max_uses: int | None = None
    current_uses: int = 0
    is_active: bool = True
    expires_at: datetime | None = None

class AdminPromoCodeCreateRequest(BaseModel):
    code: str = Field(min_length=3, max_length=50)
    discount_percent: int = Field(ge=1, le=100)
    max_uses: int = Field(default=1, ge=1, le=5000)
    expires_at: datetime | None = None
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
    start_sec: float
    end_sec: float
    text: str
    speaker: str | None = None
    confidence: float | None = None
    drift_start_sec: float | None = None
    drift_end_sec: float | None = None
    needs_review: bool | None = None

class AdminAudioTranscriptQuestionLocationRead(BaseModel):
    question_id: str | None = None
    question_label: str
    question_prompt: str
    start_sec: float
    end_sec: float
    answer_text: str
    correct_answer: str

class AdminAudioTranscriptResponse(BaseModel):
    transcript: str
    transcript_segments: list[AdminAudioTranscriptSegmentRead] = Field(default_factory=list)
    transcript_question_locations: list[AdminAudioTranscriptQuestionLocationRead] = Field(default_factory=list)

class AdminAudioTranscriptJobCreateResponse(BaseModel):
    job_id: str
    status: str

class AdminAudioTranscriptJobRead(BaseModel):
    job_id: str
    status: str
    created_at: str
    updated_at: str
    result: AdminAudioTranscriptResponse | None = None
    error: str | None = None

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
