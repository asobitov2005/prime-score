from __future__ import annotations

import re
import string
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import NotificationType
from app.models.commerce import Payment, PaymentCard, PaymentSetting, Plan
from app.models.user import User
from app.services.gift_entitlements import grant_payment_gift_entitlement
from app.services.notification_sender import create_and_send_notification

DEFAULT_PAYMENT_SUPPORT_CONTACT = "@TheBugCreator"
PENDING_PAYMENT_STATUSES = {"pending"}
VISIBLE_PAYMENT_STATUSES = {"pending", "matched", "completed", "expired", "canceled", "review", "failed"}
INVOICE_TTL_HOURS = 24


def _decimal(value: object) -> Decimal:
    return Decimal(str(value or "0"))


def _now() -> datetime:
    return datetime.now(UTC)


def normalize_card_number(card_number: str) -> str:
    return re.sub(r"\D+", "", card_number or "")


def mask_card_number(card_number: str) -> str:
    normalized = normalize_card_number(card_number)
    if len(normalized) <= 8:
        return normalized
    return f"{normalized[:4]} {normalized[4:8]} **** {normalized[-4:]}"


def build_invoice_code() -> str:
    import secrets

    alphabet = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(8))
    return f"INV-{suffix}"


def normalize_support_contact(value: str | None) -> str:
    contact = (value or DEFAULT_PAYMENT_SUPPORT_CONTACT).strip()
    return contact or DEFAULT_PAYMENT_SUPPORT_CONTACT


async def expire_stale_payments(session: AsyncSession) -> int:
    now = _now()
    rows = list(
        (
            await session.execute(
                select(Payment).where(
                    Payment.status.in_(tuple(PENDING_PAYMENT_STATUSES)),
                    Payment.expires_at.is_not(None),
                    Payment.expires_at < now,
                    Payment.archived_at.is_(None),
                )
            )
        )
        .scalars()
        .all()
    )
    for payment in rows:
        payment.status = "expired"
        payment.status_reason = "Invoice expired after 24 hours."
        payment.archived_at = now
    return len(rows)


async def get_or_create_payment_settings(session: AsyncSession) -> PaymentSetting:
    setting = await session.scalar(select(PaymentSetting).order_by(PaymentSetting.created_at.asc()))
    if setting is not None:
        return setting

    setting = PaymentSetting()
    session.add(setting)
    await session.flush()
    return setting


async def get_active_payment_card(session: AsyncSession) -> PaymentCard | None:
    return await session.scalar(
        select(PaymentCard)
        .where(PaymentCard.is_active == True)
        .order_by(PaymentCard.priority.desc(), PaymentCard.created_at.asc())
    )


async def set_single_active_card(session: AsyncSession, target_card_id: UUID) -> None:
    cards = list((await session.execute(select(PaymentCard))).scalars().all())
    for card in cards:
        card.is_active = card.id == target_card_id


async def create_plan_payment(
    session: AsyncSession,
    *,
    user: User,
    plan: Plan,
) -> Payment:
    await expire_stale_payments(session)

    active_pending = await session.scalar(
        select(Payment)
        .where(
            Payment.user_id == user.id,
            Payment.status.in_(tuple(PENDING_PAYMENT_STATUSES)),
            Payment.expires_at.is_not(None),
            Payment.expires_at > _now(),
            Payment.archived_at.is_(None),
        )
        .order_by(Payment.created_at.desc())
    )
    if active_pending is not None:
        if active_pending.plan_id == plan.id:
            return active_pending
        # Cancel the old pending invoice for a different plan
        active_pending.status = "canceled"
        active_pending.archived_at = _now()
        active_pending.status_reason = "Replaced by a new invoice for a different plan."

    active_card = await get_active_payment_card(session)
    if active_card is None:
        raise ValueError("No active payment card is configured.")

    settings = await get_or_create_payment_settings(session)
    support_contact = normalize_support_contact(settings.support_contact)
    plan_price = _decimal(plan.price_amount)

    payment = Payment(
        user_id=user.id,
        plan_id=plan.id,
        card_id=active_card.id,
        provider="card_transfer",
        provider_reference=None,
        invoice_code=build_invoice_code(),
        amount=plan_price,
        base_amount=plan_price,
        compare_at_amount=plan_price,
        discount_amount=Decimal("0"),
        currency="UZS",
        status="pending",
        card_label=active_card.label,
        card_number=normalize_card_number(active_card.card_number),
        expires_at=_now() + timedelta(hours=INVOICE_TTL_HOURS),
        status_reason=f"Transfer the amount to the card and send the screenshot to {support_contact} on Telegram.",
        meta={
            "plan_name": plan.name,
            "support_contact": support_contact,
            "payment_instructions": "Transfer the amount to the card, then send a screenshot to Telegram support.",
        },
    )
    session.add(payment)
    await session.flush()
    return payment


async def complete_payment(
    session: AsyncSession,
    *,
    payment: Payment,
) -> Payment:
    if payment.user_id is None:
        raise ValueError("Payment is not linked to a user.")

    user = await session.get(User, payment.user_id)
    if user is None:
        raise ValueError("Payment user was not found.")

    plan = await session.get(Plan, payment.plan_id) if payment.plan_id else None
    if plan is None:
        raise ValueError("Payment plan was not found.")

    now = _now()
    premium_start = user.premium_until if user.is_premium and user.premium_until and user.premium_until > now else now
    premium_until = premium_start + timedelta(days=plan.duration_days)

    user.is_premium = True
    user.premium_until = premium_until

    payment.status = "completed"
    payment.matched_at = payment.matched_at or now
    payment.paid_at = now
    payment.archived_at = now
    payment.granted_until = premium_until
    payment.status_reason = "Payment completed manually from admin panel."

    await grant_payment_gift_entitlement(
        session,
        user=user,
        payment=payment,
        plan=plan,
        now=now,
    )

    await create_and_send_notification(
        session,
        user_id=user.id,
        type=NotificationType.payment_success,
        title="Payment received",
        body=f"Premium activated until {premium_until.strftime('%d %b %Y')} for {plan.name}.",
        telegram_text=(
            "✅ <b>Payment received</b>\n\n"
            f"Premium activated for <b>{plan.name}</b>.\n"
            f"Active until <b>{premium_until.strftime('%d %b %Y')}</b>."
        ),
    )

    return payment
