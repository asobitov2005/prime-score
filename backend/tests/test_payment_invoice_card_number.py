from __future__ import annotations

from decimal import Decimal
from uuid import UUID

import pytest

from app.models.commerce import PaymentCard, Plan
from app.models.user import User
from app.services.payment_service import create_plan_payment


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
