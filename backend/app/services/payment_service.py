from __future__ import annotations

import random
import re
import string
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import NotificationType
from app.models.commerce import Payment, PaymentCard, PaymentSetting, Plan
from app.models.user import User
from app.services.notification_sender import create_and_send_notification

PENDING_PAYMENT_STATUSES = {"pending", "matched"}
VISIBLE_PAYMENT_STATUSES = {"pending", "matched", "completed", "expired", "canceled", "review", "failed"}
CURATED_DISCOUNT_STEPS = tuple(range(0, 10001, 500))
INVOICE_TTL_MINUTES = 10


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


def parse_payment_amount_from_text(text: str) -> Decimal | None:
    match = re.search(r"➕\s*([\d\s.,]+)\s*UZS", text or "", flags=re.IGNORECASE)
    if not match:
        return None
    amount_str = match.group(1).replace(" ", "")
    if "," in amount_str:
        amount_str = amount_str.replace(".", "").replace(",", ".")
    amount = Decimal(str(int(float(amount_str))))
    return amount if amount > 0 else None


def build_invoice_code() -> str:
    suffix = "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    return f"INV-{suffix}"


def build_candidate_amounts(plan_price: Decimal) -> list[Decimal]:
    seen: set[Decimal] = set()
    amounts: list[Decimal] = []
    for step in CURATED_DISCOUNT_STEPS:
        candidate = plan_price - Decimal(step)
        if candidate <= 0 or candidate in seen:
            continue
        seen.add(candidate)
        amounts.append(candidate)
    return amounts


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
        payment.status_reason = "Invoice expired after 10 minutes."
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


async def reserve_unique_invoice_amount(
    session: AsyncSession,
    *,
    plan_price: Decimal,
    limit: int = 15,
) -> tuple[Decimal, list[Decimal]]:
    now = _now()
    active_amount_rows = await session.execute(
        select(Payment.amount).where(
            Payment.status.in_(tuple(PENDING_PAYMENT_STATUSES)),
            Payment.expires_at.is_not(None),
            Payment.expires_at > now,
            Payment.archived_at.is_(None),
        )
    )
    active_amounts = {_decimal(value) for value in active_amount_rows.scalars().all()}
    free_candidates = [amount for amount in build_candidate_amounts(plan_price) if amount not in active_amounts]
    if not free_candidates:
        raise ValueError("No invoice amounts are currently available for this plan.")

    top_candidates = free_candidates[: max(limit, 1)]
    winning_amount = random.choice(top_candidates)
    shuffled = top_candidates.copy()
    random.shuffle(shuffled)
    if winning_amount not in shuffled:
        shuffled.insert(0, winning_amount)
    wheel_options = shuffled[:limit]
    if winning_amount not in wheel_options:
        wheel_options[-1] = winning_amount
    return winning_amount, wheel_options


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
        return active_pending

    active_card = await get_active_payment_card(session)
    if active_card is None:
        raise ValueError("No active payment card is configured.")

    plan_price = _decimal(plan.price_amount)
    invoice_amount, wheel_options = await reserve_unique_invoice_amount(
        session,
        plan_price=plan_price,
        limit=15,
    )

    payment = Payment(
        user_id=user.id,
        plan_id=plan.id,
        card_id=active_card.id,
        provider="card_transfer",
        provider_reference=None,
        invoice_code=build_invoice_code(),
        amount=invoice_amount,
        base_amount=plan_price,
        compare_at_amount=plan_price,
        discount_amount=plan_price - invoice_amount,
        currency="UZS",
        status="pending",
        card_label=active_card.label,
        card_number=mask_card_number(active_card.card_number),
        wheel_options=[int(item) for item in wheel_options],
        expires_at=_now() + timedelta(minutes=INVOICE_TTL_MINUTES),
        status_reason="Pay the exact shown amount to enable auto-detection.",
        meta={
            "plan_name": plan.name,
            "bot_source": active_card.bot_source,
        },
    )
    session.add(payment)
    await session.flush()
    return payment


async def complete_payment(
    session: AsyncSession,
    *,
    payment: Payment,
    detected_message_id: str | None = None,
    detected_message_text: str | None = None,
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
    payment.detected_message_id = detected_message_id
    payment.detected_message_text = detected_message_text
    payment.status_reason = "Payment detected automatically."

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


async def mark_payment_detected(
    session: AsyncSession,
    *,
    invoice_amount: Decimal,
    detected_message_id: str | None,
    detected_message_text: str | None,
) -> Payment | None:
    payment = await session.scalar(
        select(Payment)
        .where(
            Payment.amount == invoice_amount,
            Payment.status == "pending",
            Payment.expires_at.is_not(None),
            Payment.expires_at > _now(),
            Payment.archived_at.is_(None),
        )
        .order_by(Payment.created_at.asc())
    )
    if payment is None:
        return None

    payment.status = "matched"
    payment.matched_at = _now()
    payment.detected_message_id = detected_message_id
    payment.detected_message_text = detected_message_text
    payment.status_reason = "Payment amount matched. Premium grant is in progress."
    await complete_payment(
        session,
        payment=payment,
        detected_message_id=detected_message_id,
        detected_message_text=detected_message_text,
    )
    return payment


def serialize_wheel_options(values: list[int] | list[Decimal]) -> list[Decimal]:
    return [_decimal(value) for value in values]
