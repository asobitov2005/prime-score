from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.core.enums import NotificationType
from app.core.enums import AttemptStatus as CoreAttemptStatus
from app.models.enums import AttemptMode as ModelAttemptMode
from app.models.enums import AttemptScope as ModelAttemptScope
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.enums import TestType as ModelTestType
from app.models.user import User
from app.services.attempt_repo import _should_grant_premium_bonus, submit_attempt_in_db
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


class _SubmitAttemptSession(_FakeSession):
    def __init__(self, user: User, attempt: SimpleNamespace, answers: list[SimpleNamespace], answer_key: dict[str, dict[str, object]]) -> None:
        super().__init__(user)
        self.attempt = attempt
        self.answers = answers
        self.answer_key = answer_key
        self.commits = 0

    async def get(self, model, item_id: UUID):
        if model.__name__ == "Attempt" and item_id == self.attempt.id:
            return self.attempt
        return await super().get(model, item_id)

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, item) -> None:
        _ = item


def _build_submit_attempt() -> tuple[SimpleNamespace, SimpleNamespace, list[SimpleNamespace], dict[str, dict[str, object]]]:
    now = datetime(2026, 5, 8, 12, 0, tzinfo=UTC)
    question_id = UUID("eee10c17-4108-529c-80fe-aadbd729034c")
    user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=123456789,
        phone="+998901234567",
        first_name="Prime",
        is_premium=False,
    )
    attempt = SimpleNamespace(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        user_id=user.id,
        test_id=UUID("11111111-1111-1111-1111-111111111111"),
        test_type=ModelTestType.READING,
        mode=ModelAttemptMode.PRACTICE,
        scope=ModelAttemptScope.FULL,
        status=ModelAttemptStatus.IN_PROGRESS,
        section_id=None,
        started_at=now,
        created_at=now,
        updated_at=now,
        submitted_at=None,
        raw_score=None,
        max_score=40,
        band_score=None,
        time_limit_seconds=3600,
        attempt_metadata={"score_status": "draft"},
        test_snapshot={
            "title": "Sample Reading",
            "test_type": "reading",
            "scope": "full",
            "version": 1,
            "total_questions": 40,
            "time_limit_seconds": 3600,
            "questions": [
                {
                    "question_id": str(question_id),
                    "question_number": 1,
                    "section_id": "11111111-1111-1111-1111-111111111112",
                    "section_title": "Passage 1",
                    "group_title": "Questions 1-13",
                    "question_type": "reading_true_false_not_given",
                    "prompt": "The sky is blue.",
                    "label": "Q1",
                }
            ],
        },
    )
    answers = [
        SimpleNamespace(
            question_id=question_id,
            value={"value": "TRUE"},
            updated_at=now,
            created_at=now,
        )
    ]
    answer_key = {str(question_id): {"accepted_answers": ["TRUE"], "explanation": ""}}
    return attempt, user, answers, answer_key


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
    full_reading = SimpleNamespace(scope=ModelAttemptScope.FULL, test_type=ModelTestType.READING, status=ModelAttemptStatus.IN_PROGRESS)
    section_reading = SimpleNamespace(scope=ModelAttemptScope.SECTION, test_type=ModelTestType.READING, status=ModelAttemptStatus.IN_PROGRESS)
    full_writing = SimpleNamespace(scope=ModelAttemptScope.FULL, test_type=ModelTestType.WRITING, status=ModelAttemptStatus.IN_PROGRESS)

    assert _should_grant_premium_bonus(attempt=full_reading, metadata={"answers_count": 1}) is True
    assert _should_grant_premium_bonus(attempt=full_reading, metadata={"answers_count": 0}) is False
    assert _should_grant_premium_bonus(attempt=section_reading, metadata={"answers_count": 1}) is False
    assert _should_grant_premium_bonus(attempt=full_writing, metadata={"answers_count": 1}) is False
    assert _should_grant_premium_bonus(attempt=full_reading, metadata={"premium_bonus_granted": True}) is False


@pytest.mark.asyncio
async def test_submit_attempt_grants_bonus_once_for_real_work(monkeypatch) -> None:
    attempt, user, answers, answer_key = _build_submit_attempt()
    session = _SubmitAttemptSession(user, attempt, answers, answer_key)

    async def _fake_load_answers(_session, _attempt_id):
        return answers

    async def _fake_db_answer_key(_session, _question_ids):
        return answer_key

    def _fake_score_answer(*args, **kwargs):
        _ = (args, kwargs)
        return SimpleNamespace(is_correct=True, max_score=1, awarded_score=1)

    bonus_calls: list[tuple[int, str, str]] = []

    async def _fake_grant_premium_bonus(_session, *, user, days, title, body, telegram_text=None, now=None):
        bonus_calls.append((days, title, body))
        user.is_premium = True
        user.premium_until = (now or datetime.now(UTC)) + timedelta(days=days)
        return user.premium_until

    monkeypatch.setattr("app.services.attempt_repo._load_answers", _fake_load_answers)
    monkeypatch.setattr("app.services.attempt_repo._db_answer_key", _fake_db_answer_key)
    monkeypatch.setattr("app.services.attempt_repo.score_answer", _fake_score_answer)
    monkeypatch.setattr("app.services.attempt_repo.grant_premium_bonus", _fake_grant_premium_bonus)

    submitted = await submit_attempt_in_db(session, attempt_id=attempt.id)
    assert submitted.status == CoreAttemptStatus.completed
    assert attempt.attempt_metadata["premium_bonus_granted"] is True
    assert user.is_premium is True
    assert len(bonus_calls) == 1
    assert session.commits == 1

    repeat = await submit_attempt_in_db(session, attempt_id=attempt.id)
    assert repeat.status == CoreAttemptStatus.completed
    assert len(bonus_calls) == 1
    assert session.commits == 1


@pytest.mark.asyncio
async def test_submit_attempt_does_not_grant_bonus_for_blank_submit(monkeypatch) -> None:
    attempt, user, _answers, answer_key = _build_submit_attempt()
    session = _SubmitAttemptSession(user, attempt, [], answer_key)

    async def _fake_load_answers(_session, _attempt_id):
        return []

    async def _fake_db_answer_key(_session, _question_ids):
        return answer_key

    def _fake_score_answer(*args, **kwargs):
        _ = (args, kwargs)
        return SimpleNamespace(is_correct=False, max_score=1, awarded_score=0)

    bonus_calls: list[tuple[int, str, str]] = []

    async def _fake_grant_premium_bonus(*args, **kwargs):
        _ = (args, kwargs)
        bonus_calls.append((2, "Test bonus activated", "You completed a full Reading or Listening test. Your +2 premium days are active."))
        return datetime.now(UTC)

    monkeypatch.setattr("app.services.attempt_repo._load_answers", _fake_load_answers)
    monkeypatch.setattr("app.services.attempt_repo._db_answer_key", _fake_db_answer_key)
    monkeypatch.setattr("app.services.attempt_repo.score_answer", _fake_score_answer)
    monkeypatch.setattr("app.services.attempt_repo.grant_premium_bonus", _fake_grant_premium_bonus)

    submitted = await submit_attempt_in_db(session, attempt_id=attempt.id)
    assert submitted.status == CoreAttemptStatus.completed
    assert "premium_bonus_granted" not in attempt.attempt_metadata
    assert user.is_premium is False
    assert bonus_calls == []
