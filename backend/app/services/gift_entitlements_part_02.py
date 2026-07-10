from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.gift_entitlements_dependencies import *
from app.services.gift_entitlements_part_01 import MANUAL_GRANT_INVOICE_PREFIX, MANUAL_PREMIUM_BODY_PATTERN, grant_payment_gift_entitlement

async def grant_manual_premium_entitlement(
    session: AsyncSession,
    *,
    user: User,
    granted_days: int,
    premium_until: datetime,
    now: datetime | None = None,
) -> GiftCodeEntitlement | None:
    now = now or datetime.now(UTC)
    await ensure_default_plans(session)

    plan_definition = get_public_plan_definition_for_granted_days(granted_days)
    if plan_definition is None:
        return None

    plan = await session.get(Plan, plan_definition.id)
    if plan is None:
        raise ValueError("The matching premium plan was not found.")

    payment = Payment(
        user_id=user.id,
        plan_id=plan.id,
        card_id=None,
        provider="manual",
        provider_reference=f"admin-manual:{user.id}",
        invoice_code=_build_manual_grant_invoice_code(),
        amount=0,
        base_amount=0,
        compare_at_amount=0,
        discount_amount=0,
        currency="UZS",
        status="completed",
        card_label=None,
        card_number=None,
        expires_at=None,
        matched_at=now,
        paid_at=now,
        archived_at=now,
        granted_until=premium_until,
        status_reason="Premium granted manually by admin.",
        meta={
            "plan_name": plan.name,
            "grant_source": "admin_manual_premium",
            "granted_days": granted_days,
        },
    )
    session.add(payment)
    await session.flush()

    return await grant_payment_gift_entitlement(
        session,
        user=user,
        payment=payment,
        plan=plan,
        now=now,
    )

async def ensure_manual_premium_entitlement_for_user(
    session: AsyncSession,
    *,
    user: User,
    now: datetime | None = None,
) -> GiftCodeEntitlement | None:
    now = now or datetime.now(UTC)
    if not user.is_premium or user.premium_until is None or user.premium_until <= now:
        return None

    existing_count = await session.scalar(
        select(func.count()).select_from(GiftCodeEntitlement).where(GiftCodeEntitlement.user_id == user.id)
    ) or 0
    if existing_count > 0:
        return None

    granted_days = await _infer_manual_granted_days(session, user_id=user.id)
    if granted_days is None:
        remaining_seconds = max(0.0, (user.premium_until - now).total_seconds())
        granted_days = max(1, ceil(remaining_seconds / 86400))

    return await grant_manual_premium_entitlement(
        session,
        user=user,
        granted_days=granted_days,
        premium_until=user.premium_until,
        now=now,
    )

async def _infer_manual_granted_days(session: AsyncSession, *, user_id: UUID) -> int | None:
    notifications = list(
        (
            await session.execute(
                select(Notification.body)
                .where(
                    Notification.user_id == user_id,
                    Notification.title == "Premium activated!",
                )
                .order_by(Notification.created_at.desc())
                .limit(10)
            )
        )
        .scalars()
        .all()
    )

    for body in notifications:
        match = MANUAL_PREMIUM_BODY_PATTERN.match(str(body or "").strip())
        if match:
            try:
                return int(match.group("days"))
            except (TypeError, ValueError):
                continue
    return None

def _build_manual_grant_invoice_code() -> str:
    return f"{MANUAL_GRANT_INVOICE_PREFIX}-{secrets.token_hex(5).upper()}"
