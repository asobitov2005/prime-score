from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.core.enums import AttemptStatus as CoreAttemptStatus
from app.models.commerce import GiftCodeEntitlement, Plan
from app.models.enums import AttemptMode as ModelAttemptMode
from app.models.enums import AttemptScope as ModelAttemptScope
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.enums import TestType as ModelTestType
from app.models.user import User
from app.services.attempt_repo import _should_grant_premium_bonus, submit_attempt_in_db
from app.services.gift_entitlements import (
    FriendGiftOffer,
    generate_user_gift_code,
    get_friend_gift_offer_for_plan,
    grant_payment_gift_entitlement,
)
from app.services.plan_catalog import (
    PUBLIC_30_DAY_PLAN,
    PUBLIC_PLAN_DEFINITIONS,
    get_public_plan_definition_for_granted_days,
)
from app.services.premium_access import reconcile_user_premium_status
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


class _GiftEntitlementSession:
    def __init__(self, *, entitlement: GiftCodeEntitlement | None = None, gift_plan=None) -> None:
        self.entitlement = entitlement
        self.gift_plan = gift_plan
        self.added: list[object] = []
        self.flushes = 0

    async def scalar(self, _query):
        return self.entitlement

    async def get(self, _model, _item_id):
        return self.gift_plan

    def add(self, item: object) -> None:
        self.added.append(item)

    async def flush(self) -> None:
        self.flushes += 1


class _PremiumAccessSession(_FakeSession):
    def __init__(self, user: User) -> None:
        super().__init__(user)
        self.commits = 0
        self.refreshes = 0

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, item) -> None:
        _ = item
        self.refreshes += 1


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
    notification_calls: list[tuple[str, str, str | None]] = []

    async def _fake_create_and_send_notification(_session, *, user_id, type, title, body, telegram_text=None, inline_keyboard=None):
        _ = (_session, user_id, type, body, inline_keyboard)
        notification_calls.append((str(user_id), title, telegram_text))
        return SimpleNamespace(sent_telegram=True)

    monkeypatch.setattr("app.services.premium_bonus.create_and_send_notification", _fake_create_and_send_notification)

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
    assert session.added == []
    assert notification_calls == [
        (
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "Test bonus activated",
            "🎉 <b>Test bonus activated</b>",
        )
    ]


@pytest.mark.asyncio
async def test_reconcile_user_premium_status_removes_expired_premium() -> None:
    now = datetime(2026, 5, 17, 12, 0, tzinfo=UTC)
    user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=123456789,
        phone="+998901234567",
        first_name="Prime",
        is_premium=True,
        premium_until=now - timedelta(minutes=5),
    )
    session = _PremiumAccessSession(user)

    changed = await reconcile_user_premium_status(session, user=user, now=now)

    assert changed is True
    assert user.is_premium is False
    assert user.premium_until is None
    assert session.commits == 1
    assert session.refreshes == 1


@pytest.mark.asyncio
async def test_reconcile_user_premium_status_restores_future_premium_flag() -> None:
    now = datetime(2026, 5, 17, 12, 0, tzinfo=UTC)
    user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=123456789,
        phone="+998901234567",
        first_name="Prime",
        is_premium=False,
        premium_until=now + timedelta(days=2),
    )
    session = _PremiumAccessSession(user)

    changed = await reconcile_user_premium_status(session, user=user, now=now)

    assert changed is True
    assert user.is_premium is True
    assert user.premium_until == now + timedelta(days=2)
    assert session.commits == 1
    assert session.refreshes == 1


def test_public_premium_plans_map_to_expected_friend_gifts() -> None:
    month_1 = PUBLIC_30_DAY_PLAN
    month_2 = next(item for item in PUBLIC_PLAN_DEFINITIONS if item.duration_days == 60)
    month_3 = next(item for item in PUBLIC_PLAN_DEFINITIONS if item.duration_days == 90)

    assert month_1.friend_gift_days == 3
    assert month_1.friend_gift_count == 1

    assert month_2.friend_gift_days == 7
    assert month_2.friend_gift_count == 1

    assert month_3.friend_gift_days == 14
    assert month_3.friend_gift_count == 1


def test_granted_premium_days_resolve_to_expected_friend_gift_plan() -> None:
    month_1 = get_public_plan_definition_for_granted_days(30)
    month_2 = get_public_plan_definition_for_granted_days(60)
    month_3 = get_public_plan_definition_for_granted_days(90)

    assert month_1 is not None
    assert month_1.friend_gift_days == 3

    assert month_2 is not None
    assert month_2.friend_gift_days == 7

    assert month_3 is not None
    assert month_3.friend_gift_days == 14


def test_friend_gift_offer_for_public_plan_uses_expected_mapping() -> None:
    month_1 = Plan(id=PUBLIC_30_DAY_PLAN.id, catalog="public", name="1 Month", duration_days=30, price_amount=59000)
    month_2_definition = next(item for item in PUBLIC_PLAN_DEFINITIONS if item.duration_days == 60)
    month_2 = Plan(id=month_2_definition.id, catalog="public", name="2 Months", duration_days=60, price_amount=79000)
    month_3_definition = next(item for item in PUBLIC_PLAN_DEFINITIONS if item.duration_days == 90)
    month_3 = Plan(id=month_3_definition.id, catalog="public", name="3 Months", duration_days=90, price_amount=109000)

    assert get_friend_gift_offer_for_plan(month_1) == FriendGiftOffer(gift_days=3, gift_count=1)
    assert get_friend_gift_offer_for_plan(month_2) == FriendGiftOffer(gift_days=7, gift_count=1)
    assert get_friend_gift_offer_for_plan(month_3) == FriendGiftOffer(gift_days=14, gift_count=1)


def test_should_grant_premium_bonus_only_for_full_reading_and_listening() -> None:
    full_reading = SimpleNamespace(scope=ModelAttemptScope.FULL, test_type=ModelTestType.READING, status=ModelAttemptStatus.IN_PROGRESS)
    section_reading = SimpleNamespace(scope=ModelAttemptScope.SECTION, test_type=ModelTestType.READING, status=ModelAttemptStatus.IN_PROGRESS)
    full_writing = SimpleNamespace(scope=ModelAttemptScope.FULL, test_type=ModelTestType.WRITING, status=ModelAttemptStatus.IN_PROGRESS)

    assert _should_grant_premium_bonus(attempt=full_reading, metadata={"answers_count": 1}) is True
    assert _should_grant_premium_bonus(attempt=full_reading, metadata={"answers_count": 0}) is False
    assert _should_grant_premium_bonus(attempt=section_reading, metadata={"answers_count": 1}) is False
    assert _should_grant_premium_bonus(attempt=full_writing, metadata={"answers_count": 1}) is False
    assert _should_grant_premium_bonus(attempt=full_reading, metadata={"premium_bonus_granted": True}) is False


def test_user_can_receive_full_test_premium_bonus_only_once() -> None:
    from app.services.attempt_repo import _user_can_receive_full_test_premium_bonus

    fresh_user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=123456789,
        phone="+998901234567",
        first_name="Prime",
        full_test_premium_bonus_granted_at=None,
    )
    used_user = User(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        telegram_id=123456780,
        phone="+998901234560",
        first_name="Done",
        full_test_premium_bonus_granted_at=datetime(2026, 5, 20, 10, 0, tzinfo=UTC),
    )

    assert _user_can_receive_full_test_premium_bonus(fresh_user) is True
    assert _user_can_receive_full_test_premium_bonus(used_user) is False
    assert _user_can_receive_full_test_premium_bonus(None) is False


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

    async def _fake_award_xp_for_attempt(_session, _attempt):
        return SimpleNamespace(total_awarded=0, breakdown={}, level_after=1, current_streak=0)

    monkeypatch.setattr("app.services.attempt_repo._load_answers", _fake_load_answers)
    monkeypatch.setattr("app.services.attempt_repo._db_answer_key", _fake_db_answer_key)
    monkeypatch.setattr("app.services.attempt_repo.score_answer", _fake_score_answer)
    monkeypatch.setattr("app.services.attempt_repo.grant_premium_bonus", _fake_grant_premium_bonus)
    monkeypatch.setattr("app.services.attempt_repo.award_xp_for_attempt", _fake_award_xp_for_attempt)

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
    assert user.full_test_premium_bonus_granted_at is not None


@pytest.mark.asyncio
async def test_submit_attempt_does_not_grant_bonus_when_user_already_used_it(monkeypatch) -> None:
    attempt, user, answers, answer_key = _build_submit_attempt()
    user.full_test_premium_bonus_granted_at = datetime(2026, 5, 7, 12, 0, tzinfo=UTC)
    session = _SubmitAttemptSession(user, attempt, answers, answer_key)

    async def _fake_load_answers(_session, _attempt_id):
        return answers

    async def _fake_db_answer_key(_session, _question_ids):
        return answer_key

    def _fake_score_answer(*args, **kwargs):
        _ = (args, kwargs)
        return SimpleNamespace(is_correct=True, max_score=1, awarded_score=1)

    bonus_calls: list[tuple[int, str, str]] = []

    async def _fake_grant_premium_bonus(*args, **kwargs):
        _ = (args, kwargs)
        bonus_calls.append((2, "Test bonus activated", "You completed a full Reading or Listening test. Your +2 premium days are active."))
        return datetime.now(UTC)

    async def _fake_award_xp_for_attempt(_session, _attempt):
        return SimpleNamespace(total_awarded=0, breakdown={}, level_after=1, current_streak=0)

    monkeypatch.setattr("app.services.attempt_repo._load_answers", _fake_load_answers)
    monkeypatch.setattr("app.services.attempt_repo._db_answer_key", _fake_db_answer_key)
    monkeypatch.setattr("app.services.attempt_repo.score_answer", _fake_score_answer)
    monkeypatch.setattr("app.services.attempt_repo.grant_premium_bonus", _fake_grant_premium_bonus)
    monkeypatch.setattr("app.services.attempt_repo.award_xp_for_attempt", _fake_award_xp_for_attempt)

    submitted = await submit_attempt_in_db(session, attempt_id=attempt.id)
    assert submitted.status == CoreAttemptStatus.completed
    assert "premium_bonus_granted" not in attempt.attempt_metadata
    assert bonus_calls == []


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

    async def _fake_award_xp_for_attempt(_session, _attempt):
        return SimpleNamespace(total_awarded=0, breakdown={}, level_after=1, current_streak=0)

    monkeypatch.setattr("app.services.attempt_repo._load_answers", _fake_load_answers)
    monkeypatch.setattr("app.services.attempt_repo._db_answer_key", _fake_db_answer_key)
    monkeypatch.setattr("app.services.attempt_repo.score_answer", _fake_score_answer)
    monkeypatch.setattr("app.services.attempt_repo.grant_premium_bonus", _fake_grant_premium_bonus)
    monkeypatch.setattr("app.services.attempt_repo.award_xp_for_attempt", _fake_award_xp_for_attempt)

    submitted = await submit_attempt_in_db(session, attempt_id=attempt.id)
    assert submitted.status == CoreAttemptStatus.completed
    assert "premium_bonus_granted" not in attempt.attempt_metadata
    assert user.is_premium is False
    assert bonus_calls == []


@pytest.mark.asyncio
async def test_grant_payment_gift_entitlement_creates_entitlement_for_supported_plan(monkeypatch) -> None:
    async def _fake_ensure_default_plans(_session):
        return []

    monkeypatch.setattr("app.services.gift_entitlements.ensure_default_plans", _fake_ensure_default_plans)

    now = datetime(2026, 5, 17, 10, 0, tzinfo=UTC)
    user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=123456789,
        phone="+998901234567",
        first_name="Prime",
    )
    payment = SimpleNamespace(id=UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"))
    plan = SimpleNamespace(id=UUID("00000000-0000-0000-0000-000000000260"), catalog="public")
    session = _GiftEntitlementSession()

    entitlement = await grant_payment_gift_entitlement(
        session,
        user=user,
        payment=payment,
        plan=plan,
        now=now,
    )

    assert entitlement is not None
    assert entitlement.user_id == user.id
    assert entitlement.source_payment_id == payment.id
    assert entitlement.gift_days == 7
    assert entitlement.total_codes == 1
    assert entitlement.generated_codes == 0
    assert str(entitlement.gift_plan_id) == "00000000-0000-0000-0000-000000000007"
    assert session.flushes == 1
    assert session.added == [entitlement]


@pytest.mark.asyncio
async def test_generate_user_gift_code_consumes_available_entitlement(monkeypatch) -> None:
    async def _fake_ensure_default_plans(_session):
        return []

    async def _fake_build_unique_gift_code(_session):
        return "PRIME-FRIEND-ABCD-EFGH"

    monkeypatch.setattr("app.services.gift_entitlements.ensure_default_plans", _fake_ensure_default_plans)
    monkeypatch.setattr("app.services.gift_entitlements.build_unique_gift_code", _fake_build_unique_gift_code)

    now = datetime(2026, 5, 17, 11, 30, tzinfo=UTC)
    user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=123456789,
        phone="+998901234567",
        first_name="Prime",
    )
    entitlement = GiftCodeEntitlement(
        id=UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
        user_id=user.id,
        source_payment_id=UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
        source_plan_id=UUID("00000000-0000-0000-0000-000000000260"),
        gift_plan_id=UUID("00000000-0000-0000-0000-000000000007"),
        gift_days=7,
        total_codes=1,
        generated_codes=0,
    )
    gift_plan = SimpleNamespace(id=UUID("00000000-0000-0000-0000-000000000007"))
    session = _GiftEntitlementSession(entitlement=entitlement, gift_plan=gift_plan)

    gift_code = await generate_user_gift_code(
        session,
        user=user,
        gift_days=7,
        now=now,
    )

    assert gift_code.code == "PRIME-FRIEND-ABCD-EFGH"
    assert gift_code.purchaser_user_id == user.id
    assert gift_code.plan_id == gift_plan.id
    assert gift_code.status == "pending"
    assert gift_code.expires_at == now + timedelta(days=3)
    assert entitlement.generated_codes == 1
    assert entitlement.last_generated_at == now
    assert session.flushes == 1
    assert session.added == [gift_code]
