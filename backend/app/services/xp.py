from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from math import floor, sqrt
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.gamification import LeaderboardEntry, Streak, XPTransaction
from app.models.speaking import SpeakingEvaluation, SpeakingSession, SpeakingTest
from app.models.user import User
from app.models.writing import WritingEvaluation, WritingSubmission, WritingTask
from app.services.runtime_store import band_for_raw_score

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


@dataclass(slots=True)
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


@dataclass(slots=True)
class XPComponent:
    transaction_type: str
    amount: int
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(slots=True)
class XPCalculationResult:
    total_xp: int
    breakdown: dict[str, object]
    components: list[XPComponent] = field(default_factory=list)


@dataclass(slots=True)
class XPAwardResult:
    total_awarded: int
    breakdown: dict[str, object]
    transactions: list[XPTransaction]
    level_before: int
    level_after: int
    current_streak: int
    best_streak: int


@dataclass(slots=True)
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


def calculate_xp_for_activity(activity: XPActivity) -> XPCalculationResult:
    repeat_multiplier = _repeat_multiplier(activity.repeat_ordinal)
    activity_xp, activity_label = _activity_xp(activity)

    content_eligible = activity.minimum_duration_met and activity.minimum_content_met
    base_activity_xp = activity_xp if content_eligible else 0
    base_score_bonus = _score_bonus(activity.score) if content_eligible else 0
    base_accuracy_bonus = _accuracy_bonus(activity.accuracy) if content_eligible else 0
    base_improvement_bonus = _improvement_bonus(activity) if content_eligible else 0

    activity_award = _round_xp(base_activity_xp * repeat_multiplier)
    score_award = _round_xp(base_score_bonus * repeat_multiplier)
    accuracy_award = _round_xp(base_accuracy_bonus * repeat_multiplier)
    improvement_award = base_improvement_bonus
    streak_award = activity.streak_bonus if content_eligible else 0
    streak_milestone_award = activity.streak_milestone_bonus if content_eligible else 0

    components: list[XPComponent] = []
    if activity.is_full_mock:
        components.append(
            XPComponent(
                transaction_type=TX_FULL_MOCK_COMPLETION,
                amount=activity_award,
                metadata={
                    "activity_label": activity_label,
                    "skill_key": activity.skill_key,
                    "score_value": activity.score,
                    "full_mock_completed": True,
                },
            )
        )
    else:
        components.append(
            XPComponent(
                transaction_type=TX_TEST_COMPLETION,
                amount=activity_award,
                metadata={
                    "activity_label": activity_label,
                    "skill_key": activity.skill_key,
                    "score_value": activity.score,
                    "full_mock_completed": False,
                },
            )
        )
    if score_award > 0:
        components.append(
            XPComponent(
                transaction_type=TX_SCORE_BONUS,
                amount=score_award,
                metadata={
                    "activity_label": activity_label,
                    "skill_key": activity.skill_key,
                    "score_value": activity.score,
                },
            )
        )
    if accuracy_award > 0:
        components.append(
            XPComponent(
                transaction_type=TX_ACCURACY_BONUS,
                amount=accuracy_award,
                metadata={
                    "activity_label": activity_label,
                    "skill_key": activity.skill_key,
                    "accuracy_value": activity.accuracy,
                },
            )
        )
    if improvement_award > 0:
        components.append(
            XPComponent(
                transaction_type=TX_IMPROVEMENT_BONUS,
                amount=improvement_award,
                metadata={
                    "activity_label": activity_label,
                    "skill_key": activity.skill_key,
                    "score_value": activity.score,
                    "previous_score": activity.previous_score,
                    "previous_accuracy": activity.previous_accuracy,
                    "accuracy_value": activity.accuracy,
                },
            )
        )
    if streak_award > 0:
        components.append(
            XPComponent(
                transaction_type=TX_STREAK_DAILY,
                amount=streak_award,
                metadata={
                    "skill_key": activity.skill_key,
                    "activity_label": activity_label,
                },
            )
        )
    if streak_milestone_award > 0:
        components.append(
            XPComponent(
                transaction_type=TX_STREAK_MILESTONE,
                amount=streak_milestone_award,
                metadata={
                    "skill_key": activity.skill_key,
                    "activity_label": activity_label,
                },
            )
        )

    total = sum(component.amount for component in components)
    if activity.daily_cap_remaining is not None and total > activity.daily_cap_remaining:
        total = activity.daily_cap_remaining

    return XPCalculationResult(
        total_xp=total,
        components=components,
        breakdown={
            "activity_xp": activity_award,
            "score_bonus": score_award,
            "accuracy_bonus": accuracy_award,
            "improvement_bonus": improvement_award,
            "streak_bonus": streak_award + streak_milestone_award,
            "repeat_multiplier": repeat_multiplier,
            "cap_applied": activity.daily_cap_remaining is not None and total < sum(component.amount for component in components),
            "content_eligible": content_eligible,
            "flagged": activity.flagged,
            "total": total,
        },
    )


def calculateXpForActivity(activity: XPActivity) -> XPCalculationResult:
    return calculate_xp_for_activity(activity)


def _period_start(period_type: str, occurred_at: datetime) -> date:
    occurred_date = occurred_at.date()
    if period_type == PERIOD_WEEKLY:
        return occurred_date - timedelta(days=occurred_date.weekday())
    if period_type == PERIOD_MONTHLY:
        return occurred_date.replace(day=1)
    return ALL_TIME_PERIOD_START


def _period_end(period_type: str, period_start: date) -> date | None:
    if period_type == PERIOD_WEEKLY:
        return period_start + timedelta(days=7)
    if period_type == PERIOD_MONTHLY:
        next_month = period_start.replace(day=28) + timedelta(days=4)
        return next_month.replace(day=1)
    return None


def _period_datetime_bounds(period_type: str, occurred_at: datetime) -> tuple[date, datetime | None, datetime | None]:
    period_start = _period_start(period_type, occurred_at)
    if period_type == PERIOD_ALL_TIME:
        return period_start, None, None

    period_end = _period_end(period_type, period_start)
    start_at = datetime.combine(period_start, time.min, tzinfo=UTC)
    end_at = datetime.combine(period_end, time.min, tzinfo=UTC) if period_end is not None else None
    return period_start, start_at, end_at


async def _get_or_create_streak(session: AsyncSession, user_id: UUID) -> Streak:
    streak = await session.get(Streak, user_id)
    if streak is None:
        streak = Streak(user_id=user_id)
        session.add(streak)
        await session.flush()
    return streak


async def _ensure_user(session: AsyncSession, user_id: UUID) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise ValueError("user_not_found")
    return user


async def _current_day_transactions(session: AsyncSession, user_id: UUID, occurred_at: datetime) -> list[XPTransaction]:
    day_start = datetime.combine(occurred_at.date(), time.min, tzinfo=UTC)
    day_end = day_start + timedelta(days=1)
    rows = await session.scalars(
        select(XPTransaction)
        .where(
            XPTransaction.user_id == user_id,
            XPTransaction.created_at >= day_start,
            XPTransaction.created_at < day_end,
        )
        .order_by(XPTransaction.created_at.asc())
    )
    return list(rows.all())


async def _existing_transactions_for_source(
    session: AsyncSession,
    *,
    user_id: UUID,
    source_type: str,
    source_id: str | UUID | None,
) -> list[XPTransaction]:
    if source_id is None:
        return []
    rows = await session.scalars(
        select(XPTransaction)
        .where(
            XPTransaction.user_id == user_id,
            XPTransaction.source_type == source_type,
            XPTransaction.source_id == str(source_id),
        )
        .order_by(XPTransaction.created_at.asc())
    )
    return list(rows.all())


async def _existing_transaction_for_component(
    session: AsyncSession,
    *,
    user_id: UUID,
    transaction_type: str,
    source_type: str,
    source_id: str | UUID | None,
) -> XPTransaction | None:
    if source_id is None:
        return None
    return (
        await session.execute(
            select(XPTransaction).where(
                XPTransaction.user_id == user_id,
                XPTransaction.transaction_type == transaction_type,
                XPTransaction.source_type == source_type,
                XPTransaction.source_id == str(source_id),
            )
        )
    ).scalar_one_or_none()


def _award_result_from_existing(
    *,
    user: User,
    rows: list[XPTransaction],
) -> XPAwardResult:
    return XPAwardResult(
        total_awarded=sum(int(row.xp_amount or 0) for row in rows),
        breakdown={
            "activity_xp": sum(int(row.xp_amount or 0) for row in rows if row.transaction_type in {TX_TEST_COMPLETION, TX_FULL_MOCK_COMPLETION}),
            "score_bonus": sum(int(row.xp_amount or 0) for row in rows if row.transaction_type == TX_SCORE_BONUS),
            "accuracy_bonus": sum(int(row.xp_amount or 0) for row in rows if row.transaction_type == TX_ACCURACY_BONUS),
            "improvement_bonus": sum(int(row.xp_amount or 0) for row in rows if row.transaction_type == TX_IMPROVEMENT_BONUS),
            "streak_bonus": sum(int(row.xp_amount or 0) for row in rows if row.transaction_type in {TX_STREAK_DAILY, TX_STREAK_MILESTONE}),
            "repeat_multiplier": None,
            "cap_applied": any(bool((row.metadata_json or {}).get("cap_applied")) for row in rows),
            "content_eligible": True,
            "flagged": any(bool((row.metadata_json or {}).get("flagged")) for row in rows),
            "total": sum(int(row.xp_amount or 0) for row in rows),
            "idempotent_replay": True,
        },
        transactions=rows,
        level_before=int(user.current_level or calculate_level(int(user.total_xp or 0))),
        level_after=int(user.current_level or calculate_level(int(user.total_xp or 0))),
        current_streak=int(user.current_streak or 0),
        best_streak=int(user.best_streak or 0),
    )


def _transaction_cap_exempt(transaction_type: str, amount: int, metadata: dict[str, object]) -> bool:
    if amount <= 0:
        return True
    if transaction_type == TX_ADJUSTMENT:
        return True
    return bool(metadata.get("cap_exempt"))


async def _daily_cap_limit(
    session: AsyncSession,
    *,
    user_id: UUID,
    occurred_at: datetime,
    daily_cap_override: int | None = None,
) -> int:
    if daily_cap_override is not None:
        return daily_cap_override
    rows = await _current_day_transactions(session, user_id, occurred_at)
    for row in rows:
        payload = row.metadata_json or {}
        if row.transaction_type == TX_FULL_MOCK_COMPLETION or payload.get("elevates_daily_cap"):
            return FULL_MOCK_DAILY_CAP
    return DEFAULT_DAILY_CAP


async def _daily_cap_consumed(session: AsyncSession, *, user_id: UUID, occurred_at: datetime) -> int:
    consumed = 0
    for row in await _current_day_transactions(session, user_id, occurred_at):
        payload = row.metadata_json or {}
        if _transaction_cap_exempt(row.transaction_type, int(row.xp_amount or 0), payload):
            continue
        consumed += max(0, int(row.xp_amount or 0))
    return consumed


async def _update_leaderboard_cache(
    session: AsyncSession,
    *,
    user_id: UUID,
    occurred_at: datetime,
    xp_amount: int,
    metadata: dict[str, object],
    counts_toward_leaderboard: bool,
) -> None:
    if xp_amount == 0 or not counts_toward_leaderboard:
        return

    for period_type in (PERIOD_WEEKLY, PERIOD_MONTHLY, PERIOD_ALL_TIME):
        period_start = _period_start(period_type, occurred_at)
        row = (
            await session.execute(
                select(LeaderboardEntry).where(
                    LeaderboardEntry.user_id == user_id,
                    LeaderboardEntry.period_type == period_type,
                    LeaderboardEntry.period_start == period_start,
                )
            )
        ).scalar_one_or_none()
        if row is None:
            row = LeaderboardEntry(
                user_id=user_id,
                period_type=period_type,
                period_start=period_start,
                xp_total=0,
                score_events=0,
                score_total=0.0,
                average_score=None,
                full_mock_completions=0,
                achieved_at=occurred_at,
                metadata_json={},
            )
            session.add(row)

        row.xp_total = max(0, int(row.xp_total or 0) + xp_amount)
        row.achieved_at = occurred_at
        score_value = metadata.get("score_value")
        if score_value is not None and metadata.get("track_score"):
            row.score_events = int(row.score_events or 0) + 1
            row.score_total = float(row.score_total or 0.0) + float(score_value)
            row.average_score = round(row.score_total / row.score_events, 2) if row.score_events > 0 else None
        if metadata.get("full_mock_completed"):
            row.full_mock_completions = int(row.full_mock_completions or 0) + 1
        row.metadata_json = {
            **(row.metadata_json or {}),
            "last_transaction_type": metadata.get("transaction_type"),
        }


async def create_xp_transaction(
    session: AsyncSession,
    user_id: UUID,
    transaction_type: str,
    amount: int,
    source_type: str,
    source_id: str | UUID | None,
    metadata: dict[str, object] | None = None,
    *,
    occurred_at: datetime | None = None,
    daily_cap_override: int | None = None,
) -> XPTransaction:
    occurred_at = occurred_at or datetime.now(UTC)
    payload = dict(metadata or {})
    payload["transaction_type"] = transaction_type

    existing = await _existing_transaction_for_component(
        session,
        user_id=user_id,
        transaction_type=transaction_type,
        source_type=source_type,
        source_id=source_id,
    )
    if existing is not None:
        return existing

    awarded_amount = int(amount)
    if not _transaction_cap_exempt(transaction_type, awarded_amount, payload):
        cap_limit = await _daily_cap_limit(
            session,
            user_id=user_id,
            occurred_at=occurred_at,
            daily_cap_override=daily_cap_override,
        )
        consumed = await _daily_cap_consumed(session, user_id=user_id, occurred_at=occurred_at)
        remaining = max(0, cap_limit - consumed)
        raw_amount = awarded_amount
        awarded_amount = min(raw_amount, remaining)
        payload["daily_cap_limit"] = cap_limit
        payload["daily_cap_consumed_before"] = consumed
        payload["daily_cap_remaining_before"] = remaining
        payload["raw_amount"] = raw_amount
        payload["cap_applied"] = awarded_amount < raw_amount
    else:
        payload["cap_applied"] = False

    flagged = bool(payload.get("flagged"))
    counts_toward_leaderboard = bool(payload.get("counts_toward_leaderboard", not flagged))
    transaction = XPTransaction(
        user_id=user_id,
        transaction_type=transaction_type,
        source_type=source_type,
        source_id=str(source_id) if source_id is not None else None,
        xp_amount=awarded_amount,
        counts_toward_leaderboard=counts_toward_leaderboard,
        metadata_json=payload,
        created_at=occurred_at,
    )
    session.add(transaction)

    user = await _ensure_user(session, user_id)
    current_total = max(0, int(user.total_xp or 0))
    level_before = int(user.current_level or calculate_level(current_total))
    next_total = max(0, current_total + awarded_amount)
    user.total_xp = next_total
    user.current_level = calculate_level(next_total)
    await _update_leaderboard_cache(
        session,
        user_id=user_id,
        occurred_at=occurred_at,
        xp_amount=awarded_amount,
        metadata=payload,
        counts_toward_leaderboard=counts_toward_leaderboard,
    )
    payload["level_before"] = level_before
    payload["level_after"] = int(user.current_level or 1)
    payload["message"] = format_xp_message(transaction_type, awarded_amount, payload)
    transaction.metadata_json = payload
    await session.flush()
    return transaction


async def createXpTransaction(
    session: AsyncSession,
    userId: UUID,
    type: str,
    amount: int,
    sourceType: str,
    sourceId: str | UUID | None,
    metadata: dict[str, object] | None = None,
) -> XPTransaction:
    return await create_xp_transaction(
        session,
        user_id=userId,
        transaction_type=type,
        amount=amount,
        source_type=sourceType,
        source_id=sourceId,
        metadata=metadata,
    )


async def _register_meaningful_activity(
    session: AsyncSession,
    *,
    user_id: UUID,
    occurred_at: datetime,
) -> tuple[int, int, int, int]:
    streak = await _get_or_create_streak(session, user_id)
    activity_date = occurred_at.date()
    current_streak = int(streak.current_streak or 0)
    best_streak = int(streak.best_streak or 0)
    awarded = list(streak.awarded_milestones or [])

    if streak.last_activity_date == activity_date:
        return 0, 0, current_streak, best_streak

    if streak.last_activity_date == activity_date - timedelta(days=1):
        current_streak += 1
    else:
        current_streak = 1

    best_streak = max(best_streak, current_streak)
    milestone_bonus = 0
    if current_streak in STREAK_MILESTONES and current_streak not in awarded:
        milestone_bonus = STREAK_MILESTONES[current_streak]
        awarded.append(current_streak)

    streak.current_streak = current_streak
    streak.best_streak = best_streak
    streak.last_activity_date = activity_date
    streak.last_activity_at = occurred_at
    streak.awarded_milestones = sorted(set(int(item) for item in awarded))

    user = await _ensure_user(session, user_id)
    user.current_streak = current_streak
    user.best_streak = best_streak
    await session.flush()
    return 25, milestone_bonus, current_streak, best_streak


async def _improvement_bonus_already_awarded(
    session: AsyncSession,
    *,
    user_id: UUID,
    occurred_at: datetime,
    skill_key: str,
) -> bool:
    for row in await _current_day_transactions(session, user_id, occurred_at):
        if row.transaction_type != TX_IMPROVEMENT_BONUS:
            continue
        if str((row.metadata_json or {}).get("skill_key") or "") == skill_key:
            return True
    return False


async def _get_latest_attempt_for_skill(
    session: AsyncSession,
    *,
    user_id: UUID,
    test_type: object,
    exclude_attempt_id: UUID,
    before: datetime | None = None,
) -> Attempt | None:
    filters = [
        Attempt.user_id == user_id,
        Attempt.id != exclude_attempt_id,
        Attempt.test_type == test_type,
        Attempt.submitted_at.is_not(None),
    ]
    if before is not None:
        filters.append(Attempt.submitted_at < before)
    rows = await session.scalars(
        select(Attempt)
        .where(*filters)
        .order_by(Attempt.submitted_at.desc(), Attempt.created_at.desc())
        .limit(1)
    )
    return rows.first()


async def _get_latest_writing_submission_for_skill(
    session: AsyncSession,
    *,
    user_id: UUID,
    task_type: object,
    exclude_submission_id: UUID,
    before: datetime | None = None,
) -> tuple[WritingSubmission, WritingEvaluation] | None:
    filters = [
        WritingSubmission.user_id == user_id,
        WritingSubmission.id != exclude_submission_id,
        WritingSubmission.task_type == task_type,
    ]
    if before is not None:
        filters.append(WritingSubmission.submitted_at < before)
    rows = (
        await session.execute(
            select(WritingSubmission, WritingEvaluation)
            .join(WritingEvaluation, WritingEvaluation.submission_id == WritingSubmission.id)
            .where(*filters)
            .order_by(WritingSubmission.submitted_at.desc(), WritingSubmission.created_at.desc())
            .limit(1)
        )
    ).all()
    return rows[0] if rows else None


def _score_from_attempt(attempt: Attempt | None) -> float | None:
    if attempt is None:
        return None
    scope = _enum_value(getattr(attempt, "scope", None))
    if attempt.band_score is not None and scope == "full":
        return float(attempt.band_score)
    if attempt.raw_score is None:
        return None
    return float(band_for_raw_score(attempt.test_type, int(attempt.raw_score)))


def _accuracy_from_attempt(attempt: Attempt | None) -> float | None:
    if attempt is None or attempt.raw_score is None or not attempt.max_score:
        return None
    if int(attempt.max_score or 0) <= 0:
        return None
    return round((float(attempt.raw_score) / float(attempt.max_score)) * 100, 1)


def _attempt_answer_fingerprint(attempt: Attempt) -> str | None:
    items = (attempt.attempt_metadata or {}).get("scoring_items") or []
    if not isinstance(items, list) or not items:
        return None
    parts: list[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        parts.append(f"{item.get('question_id')}={str(item.get('answer_value') or '').strip()}")
    if not parts:
        return None
    return "|".join(parts)


def _attempt_min_duration_met(attempt: Attempt) -> bool:
    metadata = attempt.attempt_metadata or {}
    time_spent = int(metadata.get("time_spent_sec") or 0)
    time_limit = int(attempt.time_limit_seconds or 0)
    if _enum_value(attempt.test_type) == "reading":
        minimum = max(600, int(time_limit * 0.25) if time_limit else 600)
    else:
        minimum = max(480, int(time_limit * 0.25) if time_limit else 480)
    return time_spent >= minimum


async def award_xp_for_attempt(session: AsyncSession, attempt: Attempt) -> XPAwardResult:
    user = await _ensure_user(session, attempt.user_id)
    level_before = int(user.current_level or calculate_level(int(user.total_xp or 0)))
    occurred_at = attempt.submitted_at or datetime.now(UTC)
    existing_rows = await _existing_transactions_for_source(
        session,
        user_id=attempt.user_id,
        source_type="attempt",
        source_id=attempt.id,
    )
    if existing_rows:
        return _award_result_from_existing(user=user, rows=existing_rows)
    duration_ok = _attempt_min_duration_met(attempt)
    prior_same_test_count = (
        len(
            (
                await session.scalars(
                    select(Attempt.id).where(
                        Attempt.user_id == attempt.user_id,
                        Attempt.test_id == attempt.test_id,
                        Attempt.id != attempt.id,
                        Attempt.submitted_at.is_not(None),
                        Attempt.submitted_at < occurred_at,
                    )
                )
            ).all()
        )
        + 1
    )
    previous_attempt = await _get_latest_attempt_for_skill(
        session,
        user_id=attempt.user_id,
        test_type=attempt.test_type,
        exclude_attempt_id=attempt.id,
        before=occurred_at,
    )
    current_accuracy = _accuracy_from_attempt(attempt)
    previous_accuracy = _accuracy_from_attempt(previous_attempt)
    current_score = _score_from_attempt(attempt)
    previous_score = _score_from_attempt(previous_attempt)
    answer_fingerprint = _attempt_answer_fingerprint(attempt)
    suspicious = False
    if previous_attempt is not None and answer_fingerprint:
        suspicious = answer_fingerprint == _attempt_answer_fingerprint(previous_attempt)

    current_streak = int(user.current_streak or 0)
    best_streak = int(user.best_streak or 0)
    if duration_ok:
        daily_streak_bonus, milestone_bonus, current_streak, best_streak = await _register_meaningful_activity(
            session,
            user_id=attempt.user_id,
            occurred_at=occurred_at,
        )
    else:
        daily_streak_bonus, milestone_bonus = 0, 0
    if await _improvement_bonus_already_awarded(
        session,
        user_id=attempt.user_id,
        occurred_at=occurred_at,
        skill_key=_enum_value(attempt.test_type),
    ):
        improvement_allowed = False
    else:
        improvement_allowed = True

    activity = XPActivity(
        user_id=attempt.user_id,
        activity_type="attempt",
        source_type="attempt",
        source_id=attempt.id,
        skill_key=_enum_value(attempt.test_type),
        test_type=_enum_value(attempt.test_type),
        score=current_score,
        accuracy=current_accuracy,
        duration_seconds=int((attempt.attempt_metadata or {}).get("time_spent_sec") or 0),
        is_full_mock=bool((attempt.attempt_metadata or {}).get("is_full_mock")),
        repeat_ordinal=prior_same_test_count,
        previous_score=previous_score,
        previous_accuracy=previous_accuracy,
        improvement_bonus_allowed=improvement_allowed,
        streak_bonus=daily_streak_bonus,
        streak_milestone_bonus=milestone_bonus,
        minimum_duration_met=duration_ok,
        minimum_content_met=True,
        flagged=suspicious,
        flag_reasons=["same_answer_pattern"] if suspicious else [],
        metadata={
            "test_id": str(attempt.test_id),
            "answer_fingerprint": answer_fingerprint,
        },
    )
    calculation = calculate_xp_for_activity(activity)
    transactions: list[XPTransaction] = []
    daily_cap_override = FULL_MOCK_DAILY_CAP if activity.is_full_mock else None
    for component in calculation.components:
        metadata = {
            **component.metadata,
            **activity.metadata,
            "flagged": activity.flagged,
            "flag_reasons": activity.flag_reasons,
            "repeat_ordinal": activity.repeat_ordinal,
            "repeat_multiplier": calculation.breakdown["repeat_multiplier"],
            "elevates_daily_cap": activity.is_full_mock,
            "counts_toward_leaderboard": not activity.flagged,
            "track_score": component.transaction_type in {TX_TEST_COMPLETION, TX_FULL_MOCK_COMPLETION},
        }
        if component.transaction_type == TX_STREAK_MILESTONE and milestone_bonus > 0:
            metadata["milestone_days"] = current_streak
        transaction = await create_xp_transaction(
            session,
            user_id=attempt.user_id,
            transaction_type=component.transaction_type,
            amount=component.amount,
            source_type="attempt",
            source_id=attempt.id,
            metadata=metadata,
            occurred_at=occurred_at,
            daily_cap_override=daily_cap_override,
        )
        transactions.append(transaction)

    await session.flush()
    return XPAwardResult(
        total_awarded=sum(int(item.xp_amount or 0) for item in transactions),
        breakdown=calculation.breakdown,
        transactions=transactions,
        level_before=level_before,
        level_after=int(user.current_level or level_before),
        current_streak=current_streak,
        best_streak=best_streak,
    )


def _writing_min_content_met(submission: WritingSubmission, task: WritingTask) -> bool:
    minimum_words = max(100, int(task.word_minimum * 0.65))
    return int(submission.word_count or 0) >= minimum_words


async def award_xp_for_writing_submission(
    session: AsyncSession,
    submission: WritingSubmission,
    evaluation: WritingEvaluation,
    task: WritingTask,
) -> XPAwardResult:
    user = await _ensure_user(session, submission.user_id)
    level_before = int(user.current_level or calculate_level(int(user.total_xp or 0)))
    occurred_at = submission.submitted_at or evaluation.graded_at or datetime.now(UTC)
    existing_rows = await _existing_transactions_for_source(
        session,
        user_id=submission.user_id,
        source_type="writing_submission",
        source_id=submission.id,
    )
    if existing_rows:
        return _award_result_from_existing(user=user, rows=existing_rows)
    content_ok = _writing_min_content_met(submission, task)
    duration_ok = int(submission.time_spent_seconds or 0) >= 600
    prior_same_task_count = (
        len(
            (
                await session.scalars(
                    select(WritingSubmission.id).where(
                        WritingSubmission.user_id == submission.user_id,
                        WritingSubmission.task_id == submission.task_id,
                        WritingSubmission.id != submission.id,
                        WritingSubmission.submitted_at < occurred_at,
                    )
                )
            ).all()
        )
        + 1
    )
    previous_pair = await _get_latest_writing_submission_for_skill(
        session,
        user_id=submission.user_id,
        task_type=submission.task_type,
        exclude_submission_id=submission.id,
        before=occurred_at,
    )
    previous_score = float(previous_pair[1].overall_band) if previous_pair else None
    current_streak = int(user.current_streak or 0)
    best_streak = int(user.best_streak or 0)
    if duration_ok and content_ok:
        daily_streak_bonus, milestone_bonus, current_streak, best_streak = await _register_meaningful_activity(
            session,
            user_id=submission.user_id,
            occurred_at=occurred_at,
        )
    else:
        daily_streak_bonus, milestone_bonus = 0, 0
    improvement_allowed = not await _improvement_bonus_already_awarded(
        session,
        user_id=submission.user_id,
        occurred_at=occurred_at,
        skill_key=_enum_value(submission.task_type),
    )
    suspicious = bool(previous_pair and previous_pair[0].essay_hash == submission.essay_hash)
    activity = XPActivity(
        user_id=submission.user_id,
        activity_type="writing_submission",
        source_type="writing_submission",
        source_id=submission.id,
        skill_key=_enum_value(submission.task_type),
        test_type="writing",
        score=float(evaluation.overall_band),
        accuracy=None,
        duration_seconds=int(submission.time_spent_seconds or 0),
        repeat_ordinal=prior_same_task_count,
        previous_score=previous_score,
        improvement_bonus_allowed=improvement_allowed,
        streak_bonus=daily_streak_bonus,
        streak_milestone_bonus=milestone_bonus,
        minimum_duration_met=duration_ok,
        minimum_content_met=content_ok,
        flagged=suspicious,
        flag_reasons=["same_essay_hash"] if suspicious else [],
        metadata={
            "task_id": str(submission.task_id),
            "essay_hash": submission.essay_hash,
        },
    )
    calculation = calculate_xp_for_activity(activity)
    transactions: list[XPTransaction] = []
    for component in calculation.components:
        metadata = {
            **component.metadata,
            **activity.metadata,
            "flagged": activity.flagged,
            "flag_reasons": activity.flag_reasons,
            "repeat_ordinal": activity.repeat_ordinal,
            "repeat_multiplier": calculation.breakdown["repeat_multiplier"],
            "counts_toward_leaderboard": not activity.flagged,
            "track_score": component.transaction_type == TX_TEST_COMPLETION,
        }
        if component.transaction_type == TX_STREAK_MILESTONE and milestone_bonus > 0:
            metadata["milestone_days"] = current_streak
        transaction = await create_xp_transaction(
            session,
            user_id=submission.user_id,
            transaction_type=component.transaction_type,
            amount=component.amount,
            source_type="writing_submission",
            source_id=submission.id,
            metadata=metadata,
            occurred_at=occurred_at,
        )
        transactions.append(transaction)

    await session.flush()
    return XPAwardResult(
        total_awarded=sum(int(item.xp_amount or 0) for item in transactions),
        breakdown=calculation.breakdown,
        transactions=transactions,
        level_before=level_before,
        level_after=int(user.current_level or level_before),
        current_streak=current_streak,
        best_streak=best_streak,
    )


async def award_xp_for_speaking_session(
    session: AsyncSession,
    speaking_session: SpeakingSession,
    evaluation: SpeakingEvaluation,
    speaking_test: SpeakingTest | None = None,
) -> XPAwardResult:
    user = await _ensure_user(session, speaking_session.user_id)
    level_before = int(user.current_level or calculate_level(int(user.total_xp or 0)))
    prior_same_test_count = (
        len(
            (
                await session.scalars(
                    select(SpeakingSession.id).where(
                        SpeakingSession.user_id == speaking_session.user_id,
                        SpeakingSession.speaking_test_id == speaking_session.speaking_test_id,
                        SpeakingSession.id != speaking_session.id,
                        SpeakingSession.graded_at.is_not(None),
                    )
                )
            ).all()
        )
        + 1
    )
    improvement_allowed = not await _improvement_bonus_already_awarded(
        session,
        user_id=speaking_session.user_id,
        occurred_at=speaking_session.graded_at or speaking_session.ended_at or datetime.now(UTC),
        skill_key="speaking",
    )
    duration_seconds = 0
    if speaking_session.started_at and speaking_session.ended_at:
        duration_seconds = max(0, int((speaking_session.ended_at - speaking_session.started_at).total_seconds()))

    current_streak = int(user.current_streak or 0)
    best_streak = int(user.best_streak or 0)
    if duration_seconds >= 180:
        daily_streak_bonus, milestone_bonus, current_streak, best_streak = await _register_meaningful_activity(
            session,
            user_id=speaking_session.user_id,
            occurred_at=speaking_session.graded_at or speaking_session.ended_at or datetime.now(UTC),
        )
    else:
        daily_streak_bonus, milestone_bonus = 0, 0

    activity = XPActivity(
        user_id=speaking_session.user_id,
        activity_type="speaking_session",
        source_type="speaking_session",
        source_id=speaking_session.id,
        skill_key="speaking",
        test_type="speaking",
        score=float(evaluation.overall_band) if evaluation.overall_band is not None else None,
        duration_seconds=duration_seconds,
        repeat_ordinal=prior_same_test_count,
        previous_score=None,
        improvement_bonus_allowed=improvement_allowed,
        streak_bonus=daily_streak_bonus,
        streak_milestone_bonus=milestone_bonus,
        minimum_duration_met=duration_seconds >= 180,
        minimum_content_met=True,
        flagged=bool(evaluation.integrity_penalty_applied),
        flag_reasons=[str(evaluation.integrity_penalty_reason)] if evaluation.integrity_penalty_reason else [],
        metadata={
            "speaking_test_id": str(speaking_session.speaking_test_id),
            "speaking_test_title": getattr(speaking_test, "title", None),
        },
    )
    calculation = calculate_xp_for_activity(activity)
    transactions: list[XPTransaction] = []
    occurred_at = speaking_session.graded_at or speaking_session.ended_at or datetime.now(UTC)
    for component in calculation.components:
        metadata = {
            **component.metadata,
            **activity.metadata,
            "flagged": activity.flagged,
            "flag_reasons": activity.flag_reasons,
            "repeat_ordinal": activity.repeat_ordinal,
            "repeat_multiplier": calculation.breakdown["repeat_multiplier"],
            "counts_toward_leaderboard": not activity.flagged,
            "track_score": component.transaction_type == TX_TEST_COMPLETION,
        }
        if component.transaction_type == TX_STREAK_MILESTONE and milestone_bonus > 0:
            metadata["milestone_days"] = current_streak
        transaction = await create_xp_transaction(
            session,
            user_id=speaking_session.user_id,
            transaction_type=component.transaction_type,
            amount=component.amount,
            source_type="speaking_session",
            source_id=speaking_session.id,
            metadata=metadata,
            occurred_at=occurred_at,
        )
        transactions.append(transaction)

    await session.flush()
    return XPAwardResult(
        total_awarded=sum(int(item.xp_amount or 0) for item in transactions),
        breakdown=calculation.breakdown,
        transactions=transactions,
        level_before=level_before,
        level_after=int(user.current_level or level_before),
        current_streak=current_streak,
        best_streak=best_streak,
    )


async def list_user_xp_transactions(
    session: AsyncSession,
    *,
    user_id: UUID,
    limit: int = 50,
) -> list[XPTransaction]:
    rows = await session.scalars(
        select(XPTransaction)
        .where(XPTransaction.user_id == user_id)
        .order_by(XPTransaction.created_at.desc(), XPTransaction.updated_at.desc())
        .limit(limit)
    )
    return list(rows.all())


async def get_user_period_xp(session: AsyncSession, *, user_id: UUID, period_type: str, occurred_at: datetime | None = None) -> int:
    occurred_at = occurred_at or datetime.now(UTC)
    period_start, start_at, end_at = _period_datetime_bounds(period_type, occurred_at)
    if period_type == PERIOD_ALL_TIME:
        total_xp = (
            await session.execute(
                select(User.total_xp).where(User.id == user_id, User.deleted_at.is_(None))
            )
        ).scalar_one_or_none()
        if total_xp is not None:
            return max(0, int(total_xp or 0))

    filters = [
        XPTransaction.user_id == user_id,
        XPTransaction.counts_toward_leaderboard.is_(True),
    ]
    if start_at is not None:
        filters.append(XPTransaction.created_at >= start_at)
    if end_at is not None:
        filters.append(XPTransaction.created_at < end_at)

    live_total = (
        await session.execute(
            select(func.coalesce(func.sum(XPTransaction.xp_amount), 0)).where(*filters)
        )
    ).scalar_one()
    if int(live_total or 0) > 0:
        return max(0, int(live_total or 0))

    row = (
        await session.execute(
            select(LeaderboardEntry.xp_total).where(
                LeaderboardEntry.user_id == user_id,
                LeaderboardEntry.period_type == period_type,
                LeaderboardEntry.period_start == period_start,
            )
        )
    ).scalar_one_or_none()
    if row is not None:
        return int(row or 0)
    return max(0, int(live_total or 0))


async def _leaderboard_rows_from_transactions(
    session: AsyncSession,
    *,
    period_type: str,
    occurred_at: datetime,
) -> list[tuple[LeaderboardSnapshot, User]]:
    period_start, start_at, end_at = _period_datetime_bounds(period_type, occurred_at)
    filters = [
        XPTransaction.counts_toward_leaderboard.is_(True),
        User.deleted_at.is_(None),
    ]
    if start_at is not None:
        filters.append(XPTransaction.created_at >= start_at)
    if end_at is not None:
        filters.append(XPTransaction.created_at < end_at)

    rows = (
        await session.execute(
            select(XPTransaction, User)
            .join(User, User.id == XPTransaction.user_id)
            .where(*filters)
            .order_by(XPTransaction.created_at.asc())
        )
    ).all()

    snapshots: dict[UUID, tuple[LeaderboardSnapshot, User]] = {}
    for transaction, user in rows:
        snapshot, _ = snapshots.setdefault(
            user.id,
            (
                LeaderboardSnapshot(
                    user_id=user.id,
                    period_type=period_type,
                    period_start=period_start,
                ),
                user,
            ),
        )
        xp_amount = int(transaction.xp_amount or 0)
        snapshot.xp_total += xp_amount
        snapshot.achieved_at = transaction.created_at

        metadata = transaction.metadata_json or {}
        score_value = metadata.get("score_value")
        if score_value is not None and metadata.get("track_score"):
            snapshot.score_events += 1
            snapshot.score_total += float(score_value)
            snapshot.average_score = round(snapshot.score_total / snapshot.score_events, 2)
        if metadata.get("full_mock_completed"):
            snapshot.full_mock_completions += 1
        snapshot.metadata_json = {
            **snapshot.metadata_json,
            "last_transaction_type": metadata.get("transaction_type"),
        }

    result: list[tuple[LeaderboardSnapshot, User]] = []
    for snapshot, user in snapshots.values():
        snapshot.xp_total = max(0, int(snapshot.xp_total or 0))
        if snapshot.xp_total > 0:
            result.append((snapshot, user))
    return result


async def _all_time_leaderboard_rows_from_users(
    session: AsyncSession,
) -> list[tuple[LeaderboardSnapshot, User]]:
    users = (
        await session.scalars(
            select(User)
            .where(User.deleted_at.is_(None), User.total_xp > 0)
            .order_by(User.total_xp.desc())
        )
    ).all()
    if not users:
        return []

    transaction_rows = (
        await session.execute(
            select(XPTransaction, User)
            .join(User, User.id == XPTransaction.user_id)
            .where(
                XPTransaction.counts_toward_leaderboard.is_(True),
                User.deleted_at.is_(None),
                User.total_xp > 0,
            )
            .order_by(XPTransaction.created_at.asc())
        )
    ).all()

    snapshots: dict[UUID, LeaderboardSnapshot] = {
        user.id: LeaderboardSnapshot(
            user_id=user.id,
            period_type=PERIOD_ALL_TIME,
            period_start=ALL_TIME_PERIOD_START,
            xp_total=max(0, int(user.total_xp or 0)),
        )
        for user in users
    }
    users_by_id = {user.id: user for user in users}

    for transaction, user in transaction_rows:
        snapshot = snapshots.get(user.id)
        if snapshot is None:
            continue
        snapshot.achieved_at = transaction.created_at
        metadata = transaction.metadata_json or {}
        score_value = metadata.get("score_value")
        if score_value is not None and metadata.get("track_score"):
            snapshot.score_events += 1
            snapshot.score_total += float(score_value)
            snapshot.average_score = round(snapshot.score_total / snapshot.score_events, 2)
        if metadata.get("full_mock_completed"):
            snapshot.full_mock_completions += 1
        snapshot.metadata_json = {
            **snapshot.metadata_json,
            "last_transaction_type": metadata.get("transaction_type"),
        }

    return [(snapshot, users_by_id[user_id]) for user_id, snapshot in snapshots.items()]


async def leaderboard_rows(
    session: AsyncSession,
    *,
    period_type: str,
    occurred_at: datetime | None = None,
) -> list[tuple[LeaderboardEntry | LeaderboardSnapshot, User]]:
    occurred_at = occurred_at or datetime.now(UTC)
    if period_type == PERIOD_ALL_TIME:
        live_all_time_rows = await _all_time_leaderboard_rows_from_users(session)
        if live_all_time_rows:
            return live_all_time_rows

    period_start = _period_start(period_type, occurred_at)
    rows = (
        await session.execute(
            select(LeaderboardEntry, User)
            .join(User, User.id == LeaderboardEntry.user_id)
            .where(
                LeaderboardEntry.period_type == period_type,
                LeaderboardEntry.period_start == period_start,
                User.deleted_at.is_(None),
            )
        )
    ).all()
    live_rows = await _leaderboard_rows_from_transactions(session, period_type=period_type, occurred_at=occurred_at)
    if live_rows:
        return live_rows
    return list(rows)
