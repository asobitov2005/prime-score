from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.models.gamification import UserAchievement
from app.schemas.leaderboard import LeaderboardUserAchievementStateRead
from app.services import achievements as achievements_service


class _FakeScalarResult:
    def __init__(self, rows: list[object]) -> None:
        self._rows = rows

    def all(self) -> list[object]:
        return self._rows


class _FakeSession:
    def __init__(self, existing: list[UserAchievement]) -> None:
        self._existing = existing
        self.added: list[object] = []
        self.commits = 0

    async def scalars(self, _statement):
        return _FakeScalarResult(list(self._existing))

    def add(self, obj: object) -> None:
        self.added.append(obj)

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        self.commits += 1


def _catalog_item(achievement_id: str, *, status: str, xp_reward: int = 0) -> LeaderboardUserAchievementStateRead:
    return LeaderboardUserAchievementStateRead(
        id=achievement_id,
        title=achievement_id.replace("-", " ").title(),
        description="desc",
        category="level",
        rarity="Common",
        requirement="do the thing",
        status=status,
        xp_reward=xp_reward,
    )


@pytest.fixture()
def _capture(monkeypatch):
    xp_calls: list[dict] = []
    notify_calls: list[dict] = []

    async def _fake_xp(session, user_id, transaction_type, amount, source_type, source_id, metadata=None, **kwargs):
        xp_calls.append(
            {
                "user_id": user_id,
                "transaction_type": transaction_type,
                "amount": amount,
                "source_type": source_type,
                "source_id": source_id,
                "metadata": metadata,
            }
        )
        return SimpleNamespace(id=uuid4())

    async def _fake_notify(session, *, user_id, type, title, body, **kwargs):
        notify_calls.append({"user_id": user_id, "type": type, "title": title, "body": body})
        return SimpleNamespace(id=uuid4())

    monkeypatch.setattr(achievements_service, "create_xp_transaction", _fake_xp)
    monkeypatch.setattr(achievements_service, "create_and_send_notification", _fake_notify)
    return xp_calls, notify_calls


@pytest.mark.asyncio
async def test_newly_unlocked_persists_grants_xp_and_notifies(_capture) -> None:
    xp_calls, notify_calls = _capture
    user = SimpleNamespace(id=uuid4())
    session = _FakeSession(existing=[])
    catalog = [
        _catalog_item("first-steps", status="unlocked", xp_reward=50),
        _catalog_item("locked-goal", status="locked", xp_reward=100),
        _catalog_item("in-progress-goal", status="in_progress", xp_reward=100),
    ]

    result = await achievements_service.sync_user_achievements(session, user=user, catalog=catalog)

    # Exactly one row persisted for the unlocked achievement.
    persisted = [row for row in session.added if isinstance(row, UserAchievement)]
    assert len(persisted) == 1
    assert persisted[0].achievement_id == "first-steps"
    assert persisted[0].xp_awarded == 50
    assert persisted[0].notified is True

    # XP granted once, cap-exempt, keyed on the achievement id.
    assert len(xp_calls) == 1
    assert xp_calls[0]["amount"] == 50
    assert xp_calls[0]["source_type"] == achievements_service.SOURCE_ACHIEVEMENT
    assert xp_calls[0]["source_id"] == "first-steps"
    assert xp_calls[0]["metadata"]["cap_exempt"] is True

    # One notification sent.
    assert len(notify_calls) == 1
    assert notify_calls[0]["user_id"] == user.id

    # The catalog item now carries a stable unlocked_at.
    unlocked = next(item for item in result if item.id == "first-steps")
    assert unlocked.unlocked_at is not None
    assert session.commits == 1


@pytest.mark.asyncio
async def test_already_earned_is_sticky_and_not_regranted(_capture) -> None:
    xp_calls, notify_calls = _capture
    user = SimpleNamespace(id=uuid4())
    earned_at = datetime(2026, 1, 2, 3, 4, 5, tzinfo=UTC)
    existing = UserAchievement(
        user_id=user.id,
        achievement_id="veteran",
        unlocked_at=earned_at,
        xp_awarded=200,
        notified=True,
    )
    session = _FakeSession(existing=[existing])
    # Catalog now recomputes it as locked (e.g. a rank regression).
    catalog = [_catalog_item("veteran", status="locked", xp_reward=200)]

    result = await achievements_service.sync_user_achievements(session, user=user, catalog=catalog)

    item = result[0]
    assert item.status == "unlocked"  # sticky
    assert item.unlocked_at == earned_at  # original timestamp preserved
    assert xp_calls == []  # not re-granted
    assert notify_calls == []  # not re-notified
    assert session.commits == 0  # nothing new to commit
    assert not [row for row in session.added if isinstance(row, UserAchievement)]
