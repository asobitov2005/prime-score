from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.commerce import Payment
from app.services.payment_service import complete_payment


def click_checkout_url(payment: Payment) -> str | None:
    settings = get_settings()
    if (
        payment.provider != "click"
        or not settings.click_service_id
        or not settings.click_merchant_id
        or not settings.click_secret_key
    ):
        return None
    amount = Decimal(str(payment.amount))
    query = urlencode({
        "service_id": settings.click_service_id,
        "merchant_id": settings.click_merchant_id,
        "amount": str(amount.quantize(Decimal("0.01"))),
        "transaction_param": payment.invoice_code,
        "return_url": settings.click_return_url,
    })
    return f"https://my.click.uz/services/pay/?{query}"


def verify_click_signature(fields: dict[str, str], secret: str, service_id: int) -> bool:
    if not secret or fields.get("service_id") != str(service_id):
        return False
    action = fields.get("action")
    if action not in {"0", "1"}:
        return False
    parts = [
        fields.get("click_trans_id", ""),
        fields.get("service_id", ""),
        secret,
        fields.get("merchant_trans_id", ""),
    ]
    if action == "1":
        parts.append(fields.get("merchant_prepare_id", ""))
    parts.extend([fields.get("amount", ""), action, fields.get("sign_time", "")])
    expected = hashlib.md5("".join(parts).encode("utf-8"), usedforsecurity=False).hexdigest()
    return hmac.compare_digest(expected, fields.get("sign_string", "").lower())


def _response(fields: dict[str, str], code: int, note: str, **extra: int) -> dict[str, str | int]:
    return {
        "click_trans_id": fields.get("click_trans_id", ""),
        "merchant_trans_id": fields.get("merchant_trans_id", ""),
        "error": code,
        "error_note": note,
        **extra,
    }


async def process_click_callback(session: AsyncSession, fields: dict[str, str]) -> dict[str, str | int]:
    settings = get_settings()
    if not settings.click_secret_key or not settings.click_service_id:
        return _response(fields, -8, "Click is not configured")
    if not verify_click_signature(fields, settings.click_secret_key, settings.click_service_id):
        return _response(fields, -1, "Invalid signature")

    transaction_id = fields.get("click_trans_id", "")
    try:
        amount = Decimal(fields.get("amount", ""))
        provider_error = int(fields.get("error", ""))
        if (
            not transaction_id.isdecimal()
            or int(transaction_id) <= 0
            or str(int(transaction_id)) != transaction_id
            or not amount.is_finite()
        ):
            raise ValueError
        if fields["action"] == "1" and fields.get("merchant_prepare_id") != transaction_id:
            return _response(fields, -6, "Prepare transaction not found")
    except (InvalidOperation, ValueError, KeyError):
        return _response(fields, -8, "Invalid request")

    payment = await session.scalar(
        select(Payment)
        .where(Payment.invoice_code == fields.get("merchant_trans_id", ""))
        .with_for_update()
    )
    if payment is None or payment.provider != "click":
        return _response(fields, -5, "Order not found")
    if payment.currency != "UZS" or Decimal(str(payment.amount)) != amount:
        return _response(fields, -2, "Incorrect amount")

    duplicate = await session.scalar(
        select(Payment.id).where(
            Payment.provider == "click",
            Payment.provider_reference == transaction_id,
            Payment.id != payment.id,
        )
    )
    if duplicate is not None:
        return _response(fields, -4, "Transaction already used")

    action = fields["action"]
    if action == "0":
        if provider_error != 0:
            return _response(fields, -8, "Click transaction failed")
        if payment.status != "pending" or (payment.expires_at and payment.expires_at < datetime.now(UTC)):
            return _response(fields, -4, "Order is not payable")
        if payment.provider_reference not in (None, transaction_id):
            return _response(fields, -4, "Order is already prepared")
        payment.provider_reference = transaction_id
        await session.commit()
        return _response(fields, 0, "Success", merchant_prepare_id=int(transaction_id))

    if payment.provider_reference != transaction_id:
        return _response(fields, -6, "Prepare transaction not found")
    if payment.status == "completed" and provider_error == 0:
        return _response(fields, 0, "Success", merchant_confirm_id=int(transaction_id))
    if provider_error != 0:
        if payment.status == "pending":
            payment.status = "failed"
            payment.status_reason = "Click canceled or failed the payment."
            payment.archived_at = datetime.now(UTC)
            await session.commit()
        return _response(fields, -9, "Payment canceled")
    # A signed Complete for a prepared transaction means Click charged the user,
    # even if our local invoice expired or was canceled in the meantime.
    await complete_payment(session, payment=payment)
    await session.commit()
    return _response(fields, 0, "Success", merchant_confirm_id=int(transaction_id))
