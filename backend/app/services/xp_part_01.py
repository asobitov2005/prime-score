from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.xp_dependencies import *

TX_TEST_COMPLETION = "TEST_COMPLETION"

TX_SCORE_BONUS = "SCORE_BONUS"

TX_ACCURACY_BONUS = "ACCURACY_BONUS"

TX_IMPROVEMENT_BONUS = "IMPROVEMENT_BONUS"

TX_STREAK_DAILY = "STREAK_DAILY"

TX_STREAK_MILESTONE = "STREAK_MILESTONE"

TX_FULL_MOCK_COMPLETION = "FULL_MOCK_COMPLETION"

TX_PENALTY = "PENALTY"

TX_ADJUSTMENT = "ADJUSTMENT"

PERIOD_WEEKLY = "weekly"

PERIOD_MONTHLY = "monthly"

PERIOD_ALL_TIME = "all_time"

DEFAULT_DAILY_CAP = 700

FULL_MOCK_DAILY_CAP = 1000

ALL_TIME_PERIOD_START = date(1970, 1, 1)

STREAK_MILESTONES = {
    3: 30,
    7: 100,
    14: 250,
    30: 700,
}

class XPActivity:
    user_id: UUID
    activity_type: str
    source_type: str
    source_id: str | UUID | None
    skill_key: str
    test_type: str | None = None
    score: float | None = None
    accuracy: float | None = None
    duration_seconds: int | None = None
    is_full_mock: bool = False
    repeat_ordinal: int = 1
    previous_score: float | None = None
    previous_accuracy: float | None = None
    improvement_bonus_allowed: bool = True
    streak_bonus: int = 0
    streak_milestone_bonus: int = 0
    minimum_duration_met: bool = True
    minimum_content_met: bool = True
    flagged: bool = False
    flag_reasons: list[str] = field(default_factory=list)
    daily_cap_remaining: int | None = None
    metadata: dict[str, object] = field(default_factory=dict)

class XPComponent:
    transaction_type: str
    amount: int
    metadata: dict[str, object] = field(default_factory=dict)

class XPCalculationResult:
    total_xp: int
    breakdown: dict[str, object]
    components: list[XPComponent] = field(default_factory=list)

class XPAwardResult:
    total_awarded: int
    breakdown: dict[str, object]
    transactions: list[XPTransaction]
    level_before: int
    level_after: int
    current_streak: int
    best_streak: int

class LeaderboardSnapshot:
    user_id: UUID
    period_type: str
    period_start: date
    xp_total: int = 0
    score_events: int = 0
    score_total: float = 0.0
    average_score: float | None = None
    full_mock_completions: int = 0
    achieved_at: datetime | None = None
    metadata_json: dict[str, object] = field(default_factory=dict)

def calculate_level(total_xp: int) -> int:
    safe_xp = max(0, total_xp)
    return floor(sqrt(safe_xp / 100)) + 1

def level_bounds(level: int) -> tuple[int, int]:
    safe_level = max(1, level)
    current_floor = 100 * ((safe_level - 1) ** 2)
    next_floor = 100 * (safe_level**2)
    return current_floor, next_floor

def badge_for_user(*, level: int, current_streak: int, full_mock_completions: int) -> str | None:
    if level >= 30:
        return "Prime Legend"
    if level >= 20:
        return "Platinum Master"
    if current_streak >= 30:
        return "30 Day Streak"
    if full_mock_completions >= 10:
        return "Mock Master"
    if level >= 15:
        return "Gold Achiever"
    if level >= 10:
        return "Silver Scholar"
    if current_streak >= 7:
        return "Consistency Builder"
    if level >= 5:
        return "Bronze Learner"
    return None

def format_xp_message(transaction_type: str, amount: int, metadata: dict[str, object] | None = None) -> str:
    payload = metadata or {}
    activity_label = str(payload.get("activity_label") or payload.get("skill_key") or "activity").replace("_", " ").title()
    milestone_days = payload.get("milestone_days")
    if transaction_type == TX_TEST_COMPLETION:
        return f"+{amount} XP for completing {activity_label}"
    if transaction_type == TX_FULL_MOCK_COMPLETION:
        return f"+{amount} XP for completing Full Mock Test"
    if transaction_type == TX_SCORE_BONUS:
        return f"+{amount} XP score bonus"
    if transaction_type == TX_ACCURACY_BONUS:
        return f"+{amount} XP accuracy bonus"
    if transaction_type == TX_IMPROVEMENT_BONUS:
        return f"+{amount} XP improvement bonus"
    if transaction_type == TX_STREAK_DAILY:
        return f"+{amount} XP streak reward"
    if transaction_type == TX_STREAK_MILESTONE and milestone_days:
        return f"+{amount} XP {milestone_days}-day streak milestone"
    if transaction_type == TX_ADJUSTMENT:
        return f"{amount:+d} XP adjustment"
    if transaction_type == TX_PENALTY:
        return f"{amount:+d} XP penalty"
    return f"{amount:+d} XP"

def _repeat_multiplier(repeat_ordinal: int) -> float:
    if repeat_ordinal <= 1:
        return 1.0
    if repeat_ordinal == 2:
        return 0.4
    if repeat_ordinal == 3:
        return 0.15
    return 0.0

def _round_xp(value: float) -> int:
    return int(floor(value + 0.5))

def _enum_value(value: object | None) -> str:
    if value is None:
        return ""
    return str(getattr(value, "value", value))

def _score_bonus(score: float | None) -> int:
    if score is None:
        return 0
    if 8.0 <= score <= 9.0:
        return 90
    if 7.0 <= score <= 7.5:
        return 50
    if 6.0 <= score <= 6.5:
        return 25
    if 5.0 <= score <= 5.5:
        return 10
    return 0

def _accuracy_bonus(accuracy: float | None) -> int:
    if accuracy is None:
        return 0
    if 90 <= accuracy <= 100:
        return 90
    if 80 <= accuracy < 90:
        return 50
    if 70 <= accuracy < 80:
        return 25
    if 60 <= accuracy < 70:
        return 10
    return 0

def _improvement_bonus(activity: XPActivity) -> int:
    if not activity.improvement_bonus_allowed or activity.repeat_ordinal > 1:
        return 0
    if activity.score is not None and activity.previous_score is not None:
        delta = round(float(activity.score) - float(activity.previous_score), 2)
        if delta >= 1.0:
            return 100
        if delta >= 0.5:
            return 40
    if activity.accuracy is not None and activity.previous_accuracy is not None:
        delta = round(float(activity.accuracy) - float(activity.previous_accuracy), 1)
        if delta >= 20:
            return 70
        if delta >= 10:
            return 30
    return 0

def _activity_xp(activity: XPActivity) -> tuple[int, str]:
    test_type = _enum_value(activity.test_type)
    skill_key = _enum_value(activity.skill_key).lower()
    if activity.is_full_mock:
        return 250, "Full Mock Test"
    if activity.activity_type == "attempt" and test_type == "reading":
        return 80, "Reading Test"
    if activity.activity_type == "attempt" and test_type == "listening":
        return 80, "Listening Test"
    if activity.activity_type == "writing_submission" and skill_key in {"writing_task_1", "task_1"}:
        return 50, "Writing Task 1"
    if activity.activity_type == "writing_submission" and skill_key in {"writing_task_2", "task_2"}:
        return 70, "Writing Task 2"
    if activity.activity_type == "speaking_session":
        return 90, "Speaking Test"
    return 0, skill_key.replace("_", " ").title()
