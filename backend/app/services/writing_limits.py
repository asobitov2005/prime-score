from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.commerce import GiftCode, GiftCodeRedemption, Payment, Plan
from app.models.user import User
from app.models.writing import WritingSubmission
from app.schemas.common import DebugPrincipal


SHORT_PREMIUM_DAILY_WRITING_LIMIT = 3
MONTHLY_PREMIUM_DAILY_WRITING_LIMIT = 5
TWO_MONTH_PREMIUM_DAILY_WRITING_LIMIT = 10


@dataclass(frozen=True)
class WritingLimitStatus:
    is_premium: bool
    premium_until: datetime | None
    daily_limit: int | None
    used_today: int
    remaining_today: int | None
    can_submit: bool
    reset_at: datetime
    plan_name: str | None = None


def _app_timezone() -> ZoneInfo:
    try:
        return ZoneInfo(get_settings().timezone)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _current_day_window(now: datetime) -> tuple[datetime, datetime]:
    timezone = _app_timezone()
    local_now = now.astimezone(timezone)
    local_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    local_end = local_start + timedelta(days=1)
    return local_start.astimezone(UTC), local_end.astimezone(UTC)


def _limit_for_duration(duration_days: int | None) -> int | None:
    if duration_days is None:
        return SHORT_PREMIUM_DAILY_WRITING_LIMIT
    if duration_days >= 90:
        return None
    if duration_days >= 60:
        return TWO_MONTH_PREMIUM_DAILY_WRITING_LIMIT
    if duration_days >= 30:
        return MONTHLY_PREMIUM_DAILY_WRITING_LIMIT
    return SHORT_PREMIUM_DAILY_WRITING_LIMIT


async def _active_paid_plan(session: AsyncSession, user_id: UUID, now: datetime) -> Plan | None:
    row = (
        await session.execute(
            select(Plan)
            .join(Payment, Payment.plan_id == Plan.id)
            .where(
                Payment.user_id == user_id,
                Payment.status == "completed",
                Payment.granted_until.is_not(None),
                Payment.granted_until > now,
            )
            .order_by(Payment.paid_at.desc().nullslast(), Payment.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return row


async def _active_gift_plan(session: AsyncSession, user_id: UUID, now: datetime) -> Plan | None:
    row = (
        await session.execute(
            select(Plan)
            .join(GiftCode, GiftCode.plan_id == Plan.id)
            .join(GiftCodeRedemption, GiftCodeRedemption.gift_code_id == GiftCode.id)
            .where(
                GiftCodeRedemption.user_id == user_id,
                GiftCodeRedemption.premium_until > now,
            )
            .order_by(GiftCodeRedemption.redeemed_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return row


async def resolve_writing_limit_status(
    session: AsyncSession,
    *,
    principal: DebugPrincipal,
    now: datetime | None = None,
) -> WritingLimitStatus:
    current_time = now or datetime.now(UTC)
    day_start, day_end = _current_day_window(current_time)
    reset_at = day_end

    user = await session.get(User, principal.id)
    premium_until = user.premium_until if user is not None else principal.premium_until
    is_premium_flag = bool(user.is_premium if user is not None else principal.is_premium)
    is_premium = bool(is_premium_flag and (premium_until is None or premium_until > current_time))

    used_today = int(
        await session.scalar(
            select(func.count())
            .select_from(WritingSubmission)
            .where(
                WritingSubmission.user_id == principal.id,
                WritingSubmission.submitted_at >= day_start,
                WritingSubmission.submitted_at < day_end,
            )
        )
        or 0
    )

    if not is_premium:
        return WritingLimitStatus(
            is_premium=False,
            premium_until=premium_until,
            daily_limit=0,
            used_today=used_today,
            remaining_today=0,
            can_submit=False,
            reset_at=reset_at,
        )

    plan = await _active_paid_plan(session, principal.id, current_time)
    if plan is None:
        plan = await _active_gift_plan(session, principal.id, current_time)

    daily_limit = _limit_for_duration(plan.duration_days if plan is not None else None)
    remaining_today = None if daily_limit is None else max(0, daily_limit - used_today)
    can_submit = daily_limit is None or used_today < daily_limit

    return WritingLimitStatus(
        is_premium=True,
        premium_until=premium_until,
        daily_limit=daily_limit,
        used_today=used_today,
        remaining_today=remaining_today,
        can_submit=can_submit,
        reset_at=reset_at,
        plan_name=plan.name if plan is not None else "Starter premium",
    )
