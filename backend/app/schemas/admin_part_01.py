from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.schemas.admin_dependencies import *

class AdminQuickStatsRead(BaseModel):
    fastest_completion_min: float | None = None
    average_accuracy: float = 0
    highest_band_achieved: float | None = None

class AdminDashboardRead(BaseModel):
    users_total: int = 0
    users_new_today: int = 0
    active_users_7d: int = 0
    premium_users: int = 0
    tests_total: int = 0
    tests_published: int = 0
    tests_draft: int = 0
    tests_archived: int = 0
    attempts_total: int = 0
    attempts_completed: int = 0
    attempts_today: int = 0
    payments_pending: int = 0
    payments_completed: int = 0
    revenue_total: float = 0
    average_band: float | None = None
    completion_rate: float = 0
    premium_rate: float = 0
    recent_activity: list[str] = Field(default_factory=list)
    revenue_trend: list["AdminTrendPointRead"] = Field(default_factory=list)
    registration_trend: list["AdminTrendPointRead"] = Field(default_factory=list)
    attempts_by_day: list["AdminTrendPointRead"] = Field(default_factory=list)
    type_split: "AdminTypeSplitRead | None" = None
    band_distribution: list["AdminBandDistributionPointRead"] = Field(default_factory=list)
    top_active_users: list["AdminTopActiveUserRead"] = Field(default_factory=list)
    avg_time_per_test: "AdminAvgTimePerTestRead | None" = None
    payment_method_split: list["AdminLabelValuePointRead"] = Field(default_factory=list)
    attempt_status_split: list["AdminLabelValuePointRead"] = Field(default_factory=list)
    quick_stats: AdminQuickStatsRead | None = None

class AdminTrendPointRead(BaseModel):
    date: str
    value: float = 0

class AdminTypeSplitRead(BaseModel):
    reading: int = 0
    listening: int = 0

class AdminBandDistributionPointRead(BaseModel):
    band: str
    count: int = 0

class AdminTopActiveUserRead(BaseModel):
    name: str
    attempt_count: int = 0
    last_active: str | None = None

class AdminAvgTimePerTestRead(BaseModel):
    reading_avg_min: float | None = None
    listening_avg_min: float | None = None

class AdminAnalyticsPointRead(BaseModel):
    label: str
    value: float

class AdminLabelValuePointRead(BaseModel):
    label: str
    value: float

class AdminAnalyticsTopTestRead(BaseModel):
    title: str
    count: int

class AdminAnalyticsQuestionTypeRead(BaseModel):
    type: str
    error_rate: str

class AdminAnalyticsReportRead(BaseModel):
    dau: int = 0
    wau: int = 0
    mau: int = 0
    conversion_rate: str = "0%"
    churn_rate: str = "0%"
    activity_points: list[AdminAnalyticsPointRead] = Field(default_factory=list)
    top_tests: list[AdminAnalyticsTopTestRead] = Field(default_factory=list)
    hardest_question_types: list[AdminAnalyticsQuestionTypeRead] = Field(default_factory=list)
    dau_trend: list[AdminTrendPointRead] = Field(default_factory=list)
    completion_funnel: "AdminCompletionFunnelRead | None" = None
    avg_score_by_test: list["AdminAvgScoreByTestRead"] = Field(default_factory=list)
    hourly_distribution: list[AdminAnalyticsPointRead] = Field(default_factory=list)
    user_segmentation: "AdminUserSegmentationRead | None" = None
    weekday_activity: list[AdminAnalyticsPointRead] = Field(default_factory=list)

class AdminCompletionFunnelRead(BaseModel):
    started: int = 0
    completed: int = 0
    rate: float = 0

class AdminAvgScoreByTestRead(BaseModel):
    test_title: str
    avg_band: float
    attempt_count: int = 0

class AdminUserSegmentRead(BaseModel):
    count: int = 0
    avg_attempts: float = 0

class AdminUserSegmentationRead(BaseModel):
    free: AdminUserSegmentRead = Field(default_factory=AdminUserSegmentRead)
    premium: AdminUserSegmentRead = Field(default_factory=AdminUserSegmentRead)

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
    slug: str = ""
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
    telegram_id: int = 0
    first_name: str
    last_name: str | None = None
    username: str | None = None
    email: str | None = None
    phone_number: str | None = None
    role: Literal["super_admin", "admin"] | None = None
    is_premium: bool = False
    show_on_leaderboard: bool = True
    is_active: bool = True

class AdminAccountCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=5, max_length=255)
    phone_number: str = Field(min_length=6, max_length=32)
    telegram_id: int = Field(gt=0)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["super_admin", "admin"] = "admin"
    is_active: bool = True

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
    custom_code: str | None = Field(default=None, min_length=7, max_length=50)
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
