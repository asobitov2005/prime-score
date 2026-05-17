from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID

from app.schemas.common import DebugPrincipal
from app.services.writing_limits import resolve_writing_limit_status


USER_ID = UUID("33333333-3333-3333-3333-333333333333")


class _ExecuteResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _FakeSession:
    def __init__(self, *, user, used_today: int = 0, plan=None) -> None:
        self.user = user
        self.used_today = used_today
        self.plan = plan
        self.execute_calls = 0

    async def get(self, _model, _identity):
        return self.user

    async def scalar(self, _statement):
        return self.used_today

    async def execute(self, _statement):
        self.execute_calls += 1
        return _ExecuteResult(self.plan if self.execute_calls == 1 else None)


def _principal(*, premium: bool = True) -> DebugPrincipal:
    return DebugPrincipal(
        id=USER_ID,
        first_name="Azizbek",
        role="user",
        is_premium=premium,
    )


def _user(*, premium: bool, premium_until: datetime | None):
    return SimpleNamespace(
        id=USER_ID,
        is_premium=premium,
        premium_until=premium_until,
    )


async def test_short_premium_has_three_writing_checks_per_day() -> None:
    now = datetime(2026, 5, 17, 8, tzinfo=UTC)
    session = _FakeSession(
        user=_user(premium=True, premium_until=now + timedelta(days=1)),
        used_today=2,
    )

    status = await resolve_writing_limit_status(session, principal=_principal(), now=now)

    assert status.daily_limit == 3
    assert status.used_today == 2
    assert status.remaining_today == 1
    assert status.can_submit is True


async def test_short_premium_blocks_after_three_writing_checks() -> None:
    now = datetime(2026, 5, 17, 8, tzinfo=UTC)
    session = _FakeSession(
        user=_user(premium=True, premium_until=now + timedelta(days=2)),
        used_today=3,
    )

    status = await resolve_writing_limit_status(session, principal=_principal(), now=now)

    assert status.daily_limit == 3
    assert status.remaining_today == 0
    assert status.can_submit is False


async def test_paid_plan_writing_limits_follow_plan_duration() -> None:
    now = datetime(2026, 5, 17, 8, tzinfo=UTC)
    session = _FakeSession(
        user=_user(premium=True, premium_until=now + timedelta(days=30)),
        used_today=4,
        plan=SimpleNamespace(name="1 Month", duration_days=30),
    )

    status = await resolve_writing_limit_status(session, principal=_principal(), now=now)

    assert status.plan_name == "1 Month"
    assert status.daily_limit == 5
    assert status.remaining_today == 1
    assert status.can_submit is True


async def test_long_paid_plan_has_unlimited_writing_checks() -> None:
    now = datetime(2026, 5, 17, 8, tzinfo=UTC)
    session = _FakeSession(
        user=_user(premium=True, premium_until=now + timedelta(days=90)),
        used_today=12,
        plan=SimpleNamespace(name="3 Months", duration_days=90),
    )

    status = await resolve_writing_limit_status(session, principal=_principal(), now=now)

    assert status.daily_limit is None
    assert status.remaining_today is None
    assert status.can_submit is True


async def test_non_premium_cannot_submit_writing() -> None:
    now = datetime(2026, 5, 17, 8, tzinfo=UTC)
    session = _FakeSession(
        user=_user(premium=False, premium_until=None),
        used_today=0,
    )

    status = await resolve_writing_limit_status(session, principal=_principal(premium=False), now=now)

    assert status.is_premium is False
    assert status.daily_limit == 0
    assert status.remaining_today == 0
    assert status.can_submit is False
