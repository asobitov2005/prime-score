from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from app.api.routes.me import _serialize_me_payment
from app.models.commerce import Payment, Plan


def _build_plan() -> Plan:
    return Plan(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        catalog="public",
        name="1 Month",
        duration_days=30,
        price_amount=Decimal("59000"),
        perks=[],
        is_active=True,
    )


def _build_payment(*, status: str) -> Payment:
    return Payment(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        invoice_code="INV-TEST123",
        provider="card_transfer",
        amount=Decimal("56500"),
        base_amount=Decimal("59000"),
        compare_at_amount=Decimal("59000"),
        discount_amount=Decimal("2500"),
        currency="UZS",
        status=status,
        card_label="Main HUMO",
        card_number="8600123412345678",
        meta={"support_contact": "@TheBugCreator"},
    )


def test_serialize_me_payment_keeps_card_for_active_invoice() -> None:
    payload = _serialize_me_payment(_build_payment(status="pending"), _build_plan())

    assert payload.card_label == "Main HUMO"
    assert payload.card_number == "8600123412345678"
    assert payload.support_contact == "@TheBugCreator"


def test_serialize_me_payment_hides_card_after_completion() -> None:
    payload = _serialize_me_payment(_build_payment(status="completed"), _build_plan())

    assert payload.card_label is None
    assert payload.card_number is None


def test_serialize_me_payment_handles_legacy_null_metadata() -> None:
    payment = _build_payment(status="expired")
    payment.meta = None

    payload = _serialize_me_payment(payment, None)

    assert payload.plan_name == "Unknown plan"
    assert payload.support_contact == "@TheBugCreator"
    assert payload.payment_instructions
