from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.session import get_db_session
from app.models.commerce import Payment
from app.services import click_payments


SECRET = "test-only-secret"
SERVICE_ID = 123


def _fields(action: int = 0, amount: str = "59000.00") -> dict[str, str]:
    fields = {
        "click_trans_id": "987654321",
        "service_id": str(SERVICE_ID),
        "merchant_trans_id": "INV-TEST1234",
        "amount": amount,
        "action": str(action),
        "error": "0",
        "sign_time": "2026-09-24 12:00:00",
    }
    if action == 1:
        fields["merchant_prepare_id"] = fields["click_trans_id"]
    _sign(fields)
    return fields


def _sign(fields: dict[str, str]) -> None:
    raw = (
        fields["click_trans_id"]
        + fields["service_id"]
        + SECRET
        + fields["merchant_trans_id"]
        + (fields["merchant_prepare_id"] if fields["action"] == "1" else "")
        + fields["amount"]
        + fields["action"]
        + fields["sign_time"]
    )
    fields["sign_string"] = hashlib.md5(raw.encode(), usedforsecurity=False).hexdigest()


class FakeSession:
    def __init__(self, payment: Payment):
        self.payment = payment
        self.queries = 0
        self.commits = 0

    async def scalar(self, _query):
        self.queries += 1
        return self.payment if self.queries % 2 else None

    async def commit(self):
        self.commits += 1


@pytest.fixture
def payment(monkeypatch) -> Payment:
    monkeypatch.setattr(
        click_payments,
        "get_settings",
        lambda: SimpleNamespace(
            click_secret_key=SECRET,
            click_service_id=SERVICE_ID,
            click_merchant_id=456,
            click_return_url="https://primescore.uz/subscription",
        ),
    )
    return Payment(
        id=uuid4(),
        invoice_code="INV-TEST1234",
        provider="click",
        amount=Decimal("59000.00"),
        currency="UZS",
        status="pending",
        expires_at=datetime.now(UTC) + timedelta(hours=1),
    )


@pytest.mark.asyncio
async def test_click_prepare_complete_and_duplicate_complete(monkeypatch, payment):
    session = FakeSession(payment)
    calls = 0

    async def complete(_session, *, payment):
        nonlocal calls
        calls += 1
        payment.status = "completed"

    monkeypatch.setattr(click_payments, "complete_payment", complete)
    prepared = await click_payments.process_click_callback(session, _fields())
    assert prepared["error"] == 0
    assert prepared["merchant_prepare_id"] == 987654321
    assert payment.provider_reference == "987654321"

    completed = await click_payments.process_click_callback(session, _fields(action=1))
    repeated = await click_payments.process_click_callback(session, _fields(action=1))
    assert completed["error"] == repeated["error"] == 0
    assert calls == 1
    assert session.commits == 2


@pytest.mark.asyncio
async def test_click_rejects_bad_signature_amount_and_unprepared_complete(payment):
    invalid = _fields()
    invalid["sign_string"] = "0" * 32
    assert (await click_payments.process_click_callback(FakeSession(payment), invalid))["error"] == -1
    assert (await click_payments.process_click_callback(FakeSession(payment), _fields(amount="1.00")))["error"] == -2
    session = FakeSession(payment)
    assert (await click_payments.process_click_callback(session, _fields(action=1)))["error"] == -6
    assert session.commits == 0


@pytest.mark.asyncio
async def test_prepared_payment_still_fulfills_after_local_expiry(monkeypatch, payment):
    payment.provider_reference = "987654321"
    payment.status = "expired"
    payment.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    called = False

    async def complete(_session, *, payment):
        nonlocal called
        called = True
        payment.status = "completed"

    monkeypatch.setattr(click_payments, "complete_payment", complete)
    result = await click_payments.process_click_callback(FakeSession(payment), _fields(action=1))
    assert result["error"] == 0
    assert called


def test_click_checkout_url_uses_invoice_amount(payment):
    url = click_payments.click_checkout_url(payment)
    assert url is not None
    assert "amount=59000.00" in url
    assert "transaction_param=INV-TEST1234" in url
    assert SECRET not in url


@pytest.mark.asyncio
async def test_click_callback_accepts_form_post(app, payment):
    session = FakeSession(payment)

    async def override_session():
        yield session

    app.dependency_overrides[get_db_session] = override_session
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/payments/click/callback", data=_fields())
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["merchant_prepare_id"] == 987654321


@pytest.mark.asyncio
async def test_debug_user_headers_do_not_authenticate_by_default(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/me/payments", headers={"X-Debug-User-Id": str(uuid4())})
    assert response.status_code == 401
