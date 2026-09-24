from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.models.commerce import Payment, PaymentCard, Plan
from app.models.user import User
from app.services.payment_service import create_plan_payment
from app.services import payment_service


class _FakeScalarResult:
    def __init__(self, items: list[object]) -> None:
        self._items = items

    def all(self) -> list[object]:
        return list(self._items)


class _FakeExecuteResult:
    def __init__(self, items: list[object]) -> None:
        self._items = items

    def scalars(self) -> _FakeScalarResult:
        return _FakeScalarResult(self._items)


class _FakeSession:
    def __init__(self, active_card: PaymentCard) -> None:
        self._active_card = active_card
        self.added: list[object] = []
        self.execute_calls = 0
        self.scalar_calls = 0

    async def execute(self, _statement):
        self.execute_calls += 1
        return _FakeExecuteResult([])

    async def scalar(self, _statement):
        self.scalar_calls += 1
        if self.scalar_calls == 1:
            return None
        if self.scalar_calls == 2:
            return self._active_card
        return None

    def add(self, item: object) -> None:
        self.added.append(item)

    async def flush(self) -> None:
        return None


@pytest.mark.asyncio
async def test_create_plan_payment_keeps_full_normalized_card_number() -> None:
    user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=123456789,
        phone="+998901234567",
        first_name="Aziz",
        is_premium=False,
    )
    plan = Plan(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        catalog="public",
        name="1 Month",
        duration_days=30,
        price_amount=Decimal("59000"),
        perks=[],
        is_active=True,
    )
    active_card = PaymentCard(
        id=UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        label="Main HUMO",
        card_number="8600 1234 1234 5678",
        card_type="humo",
        is_active=True,
    )
    session = _FakeSession(active_card)

    payment = await create_plan_payment(session, user=user, plan=plan)

    assert payment.card_number == "8600123412345678"
    assert payment.amount == Decimal("59000")
    assert payment.discount_amount == Decimal("0")
    assert payment.meta["support_contact"] == "@TheBugCreator"


@pytest.mark.asyncio
async def test_click_invoice_needs_no_payment_card(monkeypatch) -> None:
    monkeypatch.setattr(
        payment_service,
        "get_settings",
        lambda: SimpleNamespace(
            click_service_id=123,
            click_merchant_id=456,
            click_secret_key="test-only-secret",
            payment_paused=False,
        ),
    )
    user = User(id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), telegram_id=123456789, first_name="Aziz")
    plan = Plan(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        catalog="public",
        name="1 Month",
        duration_days=30,
        price_amount=Decimal("59000"),
        perks=[],
        is_active=True,
        payment_paused=False,
    )

    class ClickSession(_FakeSession):
        async def scalar(self, _statement):
            return None

    session = ClickSession(None)
    payment = await create_plan_payment(session, user=user, plan=plan)
    assert payment.provider == "click"
    assert payment.card_id is None
    assert payment.card_number is None
    assert payment.amount == Decimal("59000")


@pytest.mark.asyncio
async def test_click_replaces_old_manual_invoice(monkeypatch) -> None:
    monkeypatch.setattr(
        payment_service,
        "get_settings",
        lambda: SimpleNamespace(
            click_service_id=123,
            click_merchant_id=456,
            click_secret_key="test-only-secret",
            payment_paused=False,
        ),
    )
    user = User(id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), telegram_id=123456789, first_name="Aziz")
    plan = Plan(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        catalog="public",
        name="1 Month",
        duration_days=30,
        price_amount=Decimal("59000"),
        perks=[],
        is_active=True,
        payment_paused=False,
    )
    old = Payment(user_id=user.id, plan_id=plan.id, provider="card_transfer", status="pending")

    class ClickSession(_FakeSession):
        async def scalar(self, _statement):
            self.scalar_calls += 1
            return old if self.scalar_calls == 1 else None

    session = ClickSession(None)
    payment = await create_plan_payment(session, user=user, plan=plan)
    assert old.status == "canceled"
    assert old.archived_at is not None
    assert payment.provider == "click"


@pytest.mark.asyncio
async def test_click_replaces_pending_invoice_after_plan_price_change(monkeypatch) -> None:
    monkeypatch.setattr(
        payment_service,
        "get_settings",
        lambda: SimpleNamespace(
            click_service_id=123,
            click_merchant_id=456,
            click_secret_key="test-only-secret",
            payment_paused=False,
        ),
    )
    user = User(id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), telegram_id=123456789, first_name="Aziz")
    plan = Plan(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        catalog="public",
        name="1 Month",
        duration_days=30,
        price_amount=Decimal("5000"),
        perks=[],
        is_active=True,
        payment_paused=False,
    )
    old = Payment(
        user_id=user.id,
        plan_id=plan.id,
        provider="click",
        amount=Decimal("69000"),
        status="pending",
    )

    class ClickSession(_FakeSession):
        async def scalar(self, _statement):
            self.scalar_calls += 1
            return old if self.scalar_calls == 1 else None

    session = ClickSession(None)
    payment = await create_plan_payment(session, user=user, plan=plan)
    assert old.status == "canceled"
    assert old.archived_at is not None
    assert payment is not old
    assert payment.amount == Decimal("5000")
    assert payment.base_amount == Decimal("5000")


@pytest.mark.asyncio
async def test_click_keeps_pending_invoice_when_price_is_unchanged(monkeypatch) -> None:
    monkeypatch.setattr(
        payment_service,
        "get_settings",
        lambda: SimpleNamespace(
            click_service_id=123,
            click_merchant_id=456,
            click_secret_key="test-only-secret",
            payment_paused=False,
        ),
    )
    user = User(id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), telegram_id=123456789, first_name="Aziz")
    plan = Plan(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        catalog="public",
        name="1 Month",
        duration_days=30,
        price_amount=Decimal("5000"),
        perks=[],
        is_active=True,
        payment_paused=False,
    )
    old = Payment(user_id=user.id, plan_id=plan.id, provider="click", amount=Decimal("5000"), status="pending")

    class ClickSession(_FakeSession):
        async def scalar(self, _statement):
            return old

    session = ClickSession(None)
    payment = await create_plan_payment(session, user=user, plan=plan)
    assert payment is old
    assert old.status == "pending"
    assert session.added == []


@pytest.mark.asyncio
async def test_click_does_not_replace_prepared_invoice_after_price_change(monkeypatch) -> None:
    monkeypatch.setattr(
        payment_service,
        "get_settings",
        lambda: SimpleNamespace(
            click_service_id=123,
            click_merchant_id=456,
            click_secret_key="test-only-secret",
            payment_paused=False,
        ),
    )
    user = User(id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), telegram_id=123456789, first_name="Aziz")
    plan = Plan(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        catalog="public",
        name="1 Month",
        duration_days=30,
        price_amount=Decimal("5000"),
        perks=[],
        is_active=True,
        payment_paused=False,
    )
    old = Payment(
        user_id=user.id,
        plan_id=plan.id,
        provider="click",
        provider_reference="123456789",
        amount=Decimal("69000"),
        status="pending",
    )

    class ClickSession(_FakeSession):
        async def scalar(self, _statement):
            return old

    session = ClickSession(None)
    with pytest.raises(ValueError, match="already being processed"):
        await create_plan_payment(session, user=user, plan=plan)
    assert old.status == "pending"
    assert session.added == []
