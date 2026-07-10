from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.xp_dependencies import *
from app.services.xp_part_01 import ALL_TIME_PERIOD_START, PERIOD_ALL_TIME, PERIOD_MONTHLY, PERIOD_WEEKLY, TX_ACCURACY_BONUS, TX_FULL_MOCK_COMPLETION, TX_IMPROVEMENT_BONUS, TX_SCORE_BONUS, TX_STREAK_DAILY, TX_STREAK_MILESTONE, TX_TEST_COMPLETION, XPActivity, XPAwardResult, XPCalculationResult, XPComponent, _accuracy_bonus, _activity_xp, _improvement_bonus, _repeat_multiplier, _round_xp, _score_bonus, calculate_level

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
