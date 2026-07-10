from __future__ import annotations

# Generated from the former monolithic admin router. Keep imports centralized
# while domain modules are gradually tightened to explicit dependencies.
# ruff: noqa: F401,F403,F405
from app.api.routes.admin_dependencies import *
from app.api.routes.admin_contracts import *
from app.api.routes.admin_common import *
from app.api.routes.admin_commerce_support import *
from app.api.routes.admin_auth_support import *
from app.api.routes.admin_user_support import *
class BulkStatusRequest(BaseModel):
    ids: List[UUID]
    access_type: str

class BulkPublishRequest(BaseModel):
    ids: List[UUID]
    status: str

class AdminUserDetailRead(BaseModel):
    id: UUID
    telegram_id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    is_premium: bool = False
    premium_until: str | None = None
    show_on_leaderboard: bool = True
    bot_contact_at: str | None = None
    first_login_at: str | None = None
    last_active_at: str | None = None
    created_at: str | None = None
    attempts_total: int = 0
    attempts_completed: int = 0
    average_band: float | None = None

class AdminTelegramUserRead(BaseModel):
    id: UUID
    telegram_id: int
    linked_user_id: UUID | None = None
    first_name: str
    last_name: str | None = None
    username: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    language_code: str | None = None
    is_bot: bool = False
    start_count: int = 0
    first_started_at: str | None = None
    last_started_at: str | None = None
    bot_contact_at: str | None = None
    first_login_at: str | None = None
    is_premium: bool = False
    created_at: str | None = None
    updated_at: str | None = None

class AdminUserAttemptRead(BaseModel):
    attempt_id: UUID
    test_id: UUID
    test_title: str | None = None
    test_type: TestType | None = None
    scope: str
    mode: str
    status: str
    score_status: str = "queued"
    raw_score: int | None = None
    band_score: Decimal | None = None
    answers_count: int = 0
    answered_slots_count: int = 0
    total_questions: int = 0
    time_spent_sec: int = 0
    started_at: datetime
    completed_at: datetime | None = None
    result: AttemptResultRead | None = None
    review: AttemptReviewRead | None = None

class AdminUserActivityRead(BaseModel):
    attempts: list[AdminUserAttemptRead]
    writing_submissions: list[AdminWritingSubmissionRead]

class AdminUserCreateRequest(BaseModel):
    telegram_id: int
    phone: str
    first_name: str
    last_name: str | None = None
    username: str | None = None
    avatar_url: str | None = None
    show_on_leaderboard: bool = True
    is_premium: bool = False
    premium_days: int = 0

class AdminFilterParams:
    def __init__(
        self,
        time_preset: str | None = Query("all_time", description="today, 7d, 30d, this_month, all_time, custom"),
        start_date: datetime | None = Query(None),
        end_date: datetime | None = Query(None),
        test_type: str | None = Query("all", description="all, reading, listening, writing")
    ):
        self.time_preset = time_preset
        self.start_date = start_date
        self.end_date = end_date
        self.test_type = test_type

def apply_admin_filters(stmt, model_class, params: AdminFilterParams, date_column="created_at"):
    if params.time_preset != "all_time":
        if params.time_preset == "today":
            start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
            stmt = stmt.where(getattr(model_class, date_column) >= start)
        elif params.time_preset == "7d":
            start = datetime.now(UTC) - timedelta(days=7)
            stmt = stmt.where(getattr(model_class, date_column) >= start)
        elif params.time_preset == "30d":
            start = datetime.now(UTC) - timedelta(days=30)
            stmt = stmt.where(getattr(model_class, date_column) >= start)
        elif params.time_preset == "this_month":
            start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            stmt = stmt.where(getattr(model_class, date_column) >= start)
        elif params.time_preset == "custom" and params.start_date and params.end_date:
            # strip timezone info if naive, or just use as is
            stmt = stmt.where(getattr(model_class, date_column) >= params.start_date)
            stmt = stmt.where(getattr(model_class, date_column) <= params.end_date)

    if getattr(model_class, "__name__", "") == "Attempt" and params.test_type and params.test_type != "all":
        stmt = stmt.where(model_class.test_type == params.test_type)

    return stmt

def _serialize_admin_attempt_result(attempt) -> AttemptResultRead:
    snapshot = attempt.test_snapshot
    answered_slots_count = _count_answered_slots(snapshot, attempt.answers)
    diagram_groups = _extract_diagram_groups(snapshot)
    effective_band_score = _effective_band_score(
        snapshot,
        attempt.raw_score,
        attempt.band_score,
        attempt.total_questions,
    )
    return AttemptResultRead(
        attempt_id=attempt.attempt_id,
        status=attempt.status,
        test_id=attempt.test_id,
        test_type=snapshot.get("test_type", TestType.reading),
        test_format=str(snapshot.get("format") or "full"),
        source=snapshot.get("source"),
        source_detail=(str(snapshot.get("source_detail")) if snapshot.get("source_detail") is not None else None),
        test_title=str(snapshot.get("title")),
        raw_score=attempt.raw_score,
        band_score=effective_band_score,
        answers_count=_count_answered_values(attempt.answers),
        answered_slots_count=answered_slots_count,
        total_questions=attempt.total_questions,
        time_spent_sec=attempt.time_spent_sec,
        score_status=str(attempt.metadata.get("score_status", "queued")),
        completed_at=attempt.completed_at,
        section_breakdown=[
            AttemptBreakdownItemRead(label=item["title"], correct=item["correct"], total=item["total"])
            for item in attempt.section_breakdown
        ],
        question_type_breakdown=[
            AttemptBreakdownItemRead(
                label=str(item["question_type"]),
                correct=item["correct"],
                total=item["total"],
            )
            for item in attempt.question_type_breakdown
        ],
        diagram_groups=diagram_groups,
    )

def _serialize_admin_attempt_review(attempt, *, can_show_explanations: bool) -> AttemptReviewRead:
    diagram_groups = _extract_diagram_groups(attempt.test_snapshot)
    question_labels = _extract_question_labels(attempt.test_snapshot)
    items = [
        AttemptReviewItemRead(
            question_id=item["question_id"],
            question_number=item["question_number"],
            question_label=str(item.get("question_label") or question_labels.get(str(item["question_id"])) or ""),
            prompt=str(item["prompt"]),
            section_title=str(item["section_title"]),
            group_title=str(item["group_title"]),
            question_type=str(item["question_type"]),
            options=[str(option) for option in item.get("options", [])],
            answer_value=item["answer_value"],
            is_correct=item["is_correct"],
            correct_answers=list(item["correct_answers"]),
            explanation=item.get("explanation") if can_show_explanations else None,
            explanation_reference=item.get("explanation_reference") if can_show_explanations else None,
        )
        for item in attempt.scoring_items
    ]
    return AttemptReviewRead(
        attempt_id=attempt.attempt_id,
        test_title=str(attempt.test_snapshot.get("title")),
        test_type=attempt.test_snapshot.get("test_type"),
        can_show_explanations=can_show_explanations,
        diagram_groups=diagram_groups,
        items=items,
    )

class BulkPremiumRequest(BaseModel):
    user_ids: List[UUID]
    days: int = 30

class AdminSettingsRead(BaseModel):
    project_name: str
    environment: str
    timezone: str
    payment_paused: bool
    admin_username: str
    admin_email: str
    admin_phone_number: str | None = None
    max_sessions: int = 2
    telegram_bot_connected: bool = False
    total_users: int = 0
    total_tests: int = 0
    total_attempts: int = 0

class AdminSettingsUpdate(BaseModel):
    payment_paused: bool | None = None
    max_sessions: int | None = None

class AdminSecurityUpdateRequest(BaseModel):
    current_password: str
    phone_number: str | None = None
    new_password: str | None = None

class BroadcastNotificationRequest(BaseModel):
    title: str
    body: str
    telegram_text: str | None = None

__all__ = [name for name in globals() if not name.startswith('__')]
