from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_premium_bonus_dependencies import *
from tests.test_premium_bonus_part_01 import _GiftEntitlementSession, _SubmitAttemptSession, _build_submit_attempt

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
