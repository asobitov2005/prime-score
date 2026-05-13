from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.core.enums import NotificationType
from app.models.enums import AttemptScope as ModelAttemptScope
from app.models.enums import TestType as ModelTestType
from app.models.user import User
from app.services.attempt_repo import _should_grant_premium_bonus
from app.services.premium_bonus import grant_premium_bonus


class _FakeSession:
    def __init__(self, user: User) -> None:
        self.user = user
        self.added: list[object] = []

    async def get(self, model, item_id: UUID):
        if model is User and item_id == self.user.id:
            return self.user
        return None

    def add(self, item: object) -> None:
        self.added.append(item)


@pytest.mark.asyncio
async def test_grant_premium_bonus_extends_active_premium(monkeypatch) -> None:
    async def _fake_send_telegram_message(*args, **kwargs) -> bool:
        _ = (args, kwargs)
        return False

    monkeypatch.setattr("app.services.notification_sender.send_telegram_message", _fake_send_telegram_message)

    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=123456789,
        phone="+998901234567",
        first_name="Prime",
        is_premium=True,
        premium_until=now + timedelta(days=1),
    )
    session = _FakeSession(user)

    premium_until = await grant_premium_bonus(
        session,
        user=user,
        days=2,
        title="Test bonus activated",
        body="You completed a full Reading or Listening test. Your +2 premium days are active.",
        telegram_text="🎉 <b>Test bonus activated</b>",
        now=now,
    )

    assert premium_until == now + timedelta(days=3)
    assert user.is_premium is True
    assert user.premium_until == now + timedelta(days=3)
    assert len(session.added) == 1
    assert session.added[0].type == NotificationType.gift_received
    assert session.added[0].title == "Test bonus activated"


def test_should_grant_premium_bonus_only_for_full_reading_and_listening() -> None:
    full_reading = SimpleNamespace(scope=ModelAttemptScope.FULL, test_type=ModelTestType.READING)
    section_reading = SimpleNamespace(scope=ModelAttemptScope.SECTION, test_type=ModelTestType.READING)
    full_writing = SimpleNamespace(scope=ModelAttemptScope.FULL, test_type=ModelTestType.WRITING)

    assert _should_grant_premium_bonus(attempt=full_reading, metadata={}) is True
    assert _should_grant_premium_bonus(attempt=section_reading, metadata={}) is False
    assert _should_grant_premium_bonus(attempt=full_writing, metadata={}) is False
    assert _should_grant_premium_bonus(attempt=full_reading, metadata={"premium_bonus_granted": True}) is False
