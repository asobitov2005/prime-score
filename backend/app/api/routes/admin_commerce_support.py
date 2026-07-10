from __future__ import annotations

# Generated from the former monolithic admin router. Keep imports centralized
# while domain modules are gradually tightened to explicit dependencies.
# ruff: noqa: F401,F403,F405
from app.api.routes.admin_dependencies import *
from app.api.routes.admin_contracts import *
from app.api.routes.admin_common import *
from app.api.routes.admin_commerce_support import *
from app.api.routes.admin_auth_support import *
from app.api.routes.admin_user_support import *
def _normalize_code_value(value: str | None) -> str:
    return re.sub(r"[^A-Z0-9]+", "", (value or "").upper())

def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)

def _normalize_plan_text(value: str | None, *, fallback: str | None = None) -> str | None:
    normalized = " ".join((value or "").split()).strip()
    if normalized:
        return normalized
    return fallback

def _normalize_plan_perks(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw_value in values:
        normalized = re.sub(r"^[\s\-\u2022]+", "", str(raw_value or "")).strip()
        if not normalized or normalized in seen:
            continue
        cleaned.append(normalized)
        seen.add(normalized)
    return cleaned

def _serialize_admin_plan(plan: Plan) -> AdminPlanRead:
    return AdminPlanRead(
        id=plan.id,
        catalog=str(plan.catalog or "public"),
        name=plan.name,
        duration_days=plan.duration_days,
        price=Decimal(str(plan.price_amount)),
        discount_percent=plan.discount_percent,
        currency="UZS",
        badge_label=plan.badge_label,
        perks=list(plan.perks or []),
        is_active=plan.is_active,
        display_order=plan.display_order,
        is_featured=plan.is_featured,
    )

def _serialize_payment_card(card: PaymentCard) -> PaymentCardRead:
    return PaymentCardRead(
        id=card.id,
        label=card.label,
        card_number=card.card_number,
        card_type=card.card_type,
        holder_name=card.holder_name,
        is_active=card.is_active,
        priority=card.priority,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )

def _serialize_payment_settings(setting: PaymentSetting) -> PaymentSettingsRead:
    return PaymentSettingsRead(
        id=setting.id,
        support_contact=setting.support_contact,
        created_at=setting.created_at,
        updated_at=setting.updated_at,
    )

def _serialize_admin_payment(
    payment: Payment,
    *,
    user: User | None,
    plan: Plan | None,
) -> AdminPaymentRead:
    payment_method_values = {item.value for item in PaymentMethod}
    method_value = payment.provider if payment.provider in payment_method_values else PaymentMethod.card_transfer.value
    return AdminPaymentRead(
        id=payment.id,
        invoice_code=payment.invoice_code,
        user_id=payment.user_id,
        user_name=_resolve_user_display_name(user),
        user_username=user.username if user is not None else None,
        plan_id=payment.plan_id,
        plan_name=plan.name if plan is not None else str(payment.meta.get("plan_name", "Unknown plan")),
        duration_days=plan.duration_days if plan is not None else None,
        method=PaymentMethod(method_value),
        status=str(payment.status or "pending"),
        amount=Decimal(str(payment.amount)),
        base_amount=Decimal(str(payment.base_amount)),
        compare_at_amount=Decimal(str(payment.compare_at_amount)),
        discount_amount=Decimal(str(payment.discount_amount)),
        currency=payment.currency,
        card_label=payment.card_label,
        card_number=payment.card_number,
        expires_at=payment.expires_at,
        matched_at=payment.matched_at,
        paid_at=payment.paid_at,
        archived_at=payment.archived_at,
        granted_until=payment.granted_until,
        status_reason=payment.status_reason,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
    )

def _derive_gift_code_status(gift_code: GiftCode, now: datetime) -> tuple[str, str]:
    raw_status = str(gift_code.status.value if hasattr(gift_code.status, "value") else gift_code.status)

    if gift_code.status == ModelPaymentStatus.COMPLETED or gift_code.used_count >= gift_code.max_uses:
        return "redeemed", raw_status
    if gift_code.status == ModelPaymentStatus.FAILED:
        return "revoked", raw_status
    if gift_code.expires_at and gift_code.expires_at < now:
        return "expired", raw_status
    if gift_code.status == ModelPaymentStatus.PAUSED:
        return "paused", raw_status
    return "available", raw_status

def _serialize_admin_gift_code(
    gift_code: GiftCode,
    *,
    plan: Plan | None,
    recipient: User | None,
    now: datetime,
) -> AdminGiftCodeRead:
    derived_status, raw_status = _derive_gift_code_status(gift_code, now)
    return AdminGiftCodeRead(
        id=gift_code.id,
        code=gift_code.code,
        plan_id=gift_code.plan_id,
        plan_name=plan.name if plan is not None else "Unknown plan",
        duration_days=plan.duration_days if plan is not None else None,
        status=derived_status,
        raw_status=raw_status,
        start_date=gift_code.starts_at,
        end_date=gift_code.expires_at,
        max_uses=gift_code.max_uses,
        used_count=gift_code.used_count,
        remaining_uses=max(0, gift_code.max_uses - gift_code.used_count),
        per_user_limit=gift_code.per_user_limit,
        target_user_type=str(gift_code.target_user_type or "all"),
        redeemed_at=gift_code.redeemed_at,
        created_at=gift_code.created_at,
        recipient_user_id=gift_code.recipient_user_id,
        recipient_name=_resolve_user_display_name(recipient),
        recipient_username=recipient.username if recipient is not None else None,
    )

async def _build_unique_gift_code(
    session: AsyncSession,
    *,
    prefix: str | None = None,
    custom_code: str | None = None,
    reserved: set[str] | None = None,
) -> str:
    reserved = reserved or set()

    if custom_code:
        candidate = custom_code
        if candidate in reserved:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Redeem code already exists in this batch.")
        exists = await session.scalar(select(GiftCode.id).where(func.upper(GiftCode.code) == candidate))
        if exists is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Redeem code already exists.")
        return candidate

    for _ in range(40):
        chunks = [
            "".join(secrets.choice(CODE_ALPHABET) for _ in range(4)),
            "".join(secrets.choice(CODE_ALPHABET) for _ in range(4)),
        ]
        candidate = "-".join(([prefix] if prefix else []) + chunks)
        if candidate in reserved:
            continue
        exists = await session.scalar(select(GiftCode.id).where(func.upper(GiftCode.code) == candidate))
        if exists is None:
            return candidate

    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate a unique redeem code.")

__all__ = [name for name in globals() if not name.startswith('__')]
