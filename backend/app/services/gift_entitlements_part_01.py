from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.gift_entitlements_dependencies import *

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

GIFT_CODE_PREFIX = "PRIME-FRIEND"

GIFT_CODE_EXPIRY_DAYS = 3

MANUAL_GRANT_INVOICE_PREFIX = "ADM-GRANT"

MANUAL_PREMIUM_BODY_PATTERN = re.compile(r"^(?P<days>\d+) days of Premium activated\. Valid until .+\.$")

class FriendGiftOffer:
    gift_days: int
    gift_count: int

def get_friend_gift_offer_for_plan(plan: Plan | None) -> FriendGiftOffer | None:
    if plan is None or str(plan.catalog or "") != "public":
        return None

    definition = get_default_plan_definition(plan.id)
    if definition is None or definition.friend_gift_days <= 0 or definition.friend_gift_count <= 0:
        return None

    return FriendGiftOffer(
        gift_days=definition.friend_gift_days,
        gift_count=definition.friend_gift_count,
    )

def derive_gift_code_status(gift_code: GiftCode, now: datetime) -> str:
    if gift_code.status == PaymentStatus.COMPLETED or gift_code.used_count >= gift_code.max_uses:
        return "redeemed"
    if gift_code.status in {PaymentStatus.FAILED, PaymentStatus.CANCELED, PaymentStatus.REFUNDED}:
        return "revoked"
    if gift_code.expires_at and gift_code.expires_at < now:
        return "expired"
    if gift_code.status == PaymentStatus.PAUSED:
        return "paused"
    return "available"

async def grant_payment_gift_entitlement(
    session: AsyncSession,
    *,
    user: User,
    payment: Payment,
    plan: Plan,
    now: datetime | None = None,
) -> GiftCodeEntitlement | None:
    now = now or datetime.now(UTC)
    offer = get_friend_gift_offer_for_plan(plan)
    if offer is None:
        return None

    existing = await session.scalar(
        select(GiftCodeEntitlement).where(GiftCodeEntitlement.source_payment_id == payment.id)
    )
    if existing is not None:
        return existing

    gift_plan_definition = get_gift_code_plan_definition_by_days(offer.gift_days)
    if gift_plan_definition is None:
        raise ValueError(f"Gift code plan for {offer.gift_days} days was not found.")

    await ensure_default_plans(session)

    entitlement = GiftCodeEntitlement(
        user_id=user.id,
        source_payment_id=payment.id,
        source_plan_id=plan.id,
        gift_plan_id=gift_plan_definition.id,
        gift_days=offer.gift_days,
        total_codes=offer.gift_count,
        generated_codes=0,
        last_generated_at=None,
        created_at=now,
        updated_at=now,
    )
    session.add(entitlement)
    await session.flush()
    return entitlement

async def generate_user_gift_code(
    session: AsyncSession,
    *,
    user: User,
    gift_days: int,
    now: datetime | None = None,
) -> GiftCode:
    from app.services.gift_entitlements_part_02 import ensure_manual_premium_entitlement_for_user

    now = now or datetime.now(UTC)
    await ensure_default_plans(session)

    gift_plan_definition = get_gift_code_plan_definition_by_days(gift_days)
    if gift_plan_definition is None:
        raise ValueError("Selected gift duration is not supported.")

    gift_plan = await session.get(Plan, gift_plan_definition.id)
    if gift_plan is None:
        raise ValueError("Gift plan is not available.")

    entitlement = await session.scalar(
        select(GiftCodeEntitlement)
        .where(
            GiftCodeEntitlement.user_id == user.id,
            GiftCodeEntitlement.gift_days == gift_days,
            GiftCodeEntitlement.generated_codes < GiftCodeEntitlement.total_codes,
        )
        .order_by(GiftCodeEntitlement.created_at.asc())
    )
    if entitlement is None:
        await ensure_manual_premium_entitlement_for_user(session, user=user, now=now)
        entitlement = await session.scalar(
            select(GiftCodeEntitlement)
            .where(
                GiftCodeEntitlement.user_id == user.id,
                GiftCodeEntitlement.gift_days == gift_days,
                GiftCodeEntitlement.generated_codes < GiftCodeEntitlement.total_codes,
            )
            .order_by(GiftCodeEntitlement.created_at.asc())
        )
    if entitlement is None:
        raise ValueError("No gift credits are available for that premium duration.")

    code = await build_unique_gift_code(session)
    gift_code = GiftCode(
        purchaser_user_id=user.id,
        recipient_user_id=None,
        plan_id=gift_plan.id,
        code=code,
        status=PaymentStatus.PENDING,
        starts_at=now,
        expires_at=now + timedelta(days=GIFT_CODE_EXPIRY_DAYS),
        max_uses=1,
        used_count=0,
        per_user_limit=1,
        target_user_type="all",
        redeemed_at=None,
    )
    session.add(gift_code)

    entitlement.generated_codes += 1
    entitlement.last_generated_at = now

    await session.flush()
    return gift_code

async def build_unique_gift_code(session: AsyncSession) -> str:
    for _ in range(40):
        candidate = "-".join(
            [
                GIFT_CODE_PREFIX,
                "".join(secrets.choice(CODE_ALPHABET) for _ in range(4)),
                "".join(secrets.choice(CODE_ALPHABET) for _ in range(4)),
            ]
        )
        exists = await session.scalar(
            select(GiftCode.id).where(func.upper(GiftCode.code) == candidate)
        )
        if exists is None:
            return candidate

    raise ValueError("Could not generate a unique redeem code.")

async def get_user_gift_code_summary(
    session: AsyncSession,
    *,
    user_id: UUID,
) -> dict[str, object]:
    entitlements = list(
        (
            await session.execute(
                select(GiftCodeEntitlement)
                .where(GiftCodeEntitlement.user_id == user_id)
                .order_by(GiftCodeEntitlement.created_at.asc())
            )
        )
        .scalars()
        .all()
    )

    grouped: dict[int, dict[str, int]] = {}
    for entitlement in entitlements:
        bucket = grouped.setdefault(
            entitlement.gift_days,
            {
                "gift_days": entitlement.gift_days,
                "total_count": 0,
                "generated_count": 0,
                "available_count": 0,
            },
        )
        bucket["total_count"] += max(0, entitlement.total_codes)
        bucket["generated_count"] += max(0, entitlement.generated_codes)
        bucket["available_count"] += max(0, entitlement.total_codes - entitlement.generated_codes)

    now = datetime.now(UTC)
    rows = (
        await session.execute(
            select(GiftCode, Plan)
            .outerjoin(Plan, GiftCode.plan_id == Plan.id)
            .where(GiftCode.purchaser_user_id == user_id)
            .order_by(GiftCode.created_at.desc())
            .limit(10)
        )
    ).all()

    recent_codes = [
        {
            "id": gift_code.id,
            "code": gift_code.code,
            "duration_days": plan.duration_days if plan is not None else 0,
            "status": derive_gift_code_status(gift_code, now),
            "expires_at": gift_code.expires_at,
            "redeemed_at": gift_code.redeemed_at,
            "created_at": gift_code.created_at,
        }
        for gift_code, plan in rows
    ]

    items = sorted(grouped.values(), key=lambda item: (item["gift_days"], item["available_count"]))
    total_available_count = sum(int(item["available_count"]) for item in items)

    return {
        "items": items,
        "recent_codes": recent_codes,
        "total_available_count": total_available_count,
        "can_generate": total_available_count > 0,
    }
