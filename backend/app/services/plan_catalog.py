from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.commerce import Plan


PlanCatalog = Literal["all", "public", "gift"]


@dataclass(frozen=True)
class DefaultPlanDefinition:
    id: UUID
    catalog: PlanCatalog
    name: str
    duration_days: int
    price: Decimal
    discount_percent: int = 0
    display_order: int = 0
    badge_label: str | None = None
    perks: tuple[str, ...] = ()
    is_featured: bool = False
    currency: str = "UZS"
    payment_paused: bool = True
    friend_gift_days: int = 0
    friend_gift_count: int = 0


PUBLIC_30_DAY_PLAN = DefaultPlanDefinition(
    id=UUID("00000000-0000-0000-0000-000000000230"),
    catalog="public",
    name="1 Month",
    duration_days=30,
    price=Decimal("59000"),
    display_order=10,
    badge_label="Premium Plan",
    perks=(
        "Full access to all IELTS mock tests",
        "Detailed test analysis after each test",
        "Advanced performance dashboard & analytics",
        "AI Writing Evaluation with deep feedback",
        "5 Writing checks per day",
        "Gift 3 premium days to a friend",
    ),
    friend_gift_days=3,
    friend_gift_count=1,
)

PUBLIC_PLAN_DEFINITIONS: tuple[DefaultPlanDefinition, ...] = (
    PUBLIC_30_DAY_PLAN,
    DefaultPlanDefinition(
        id=UUID("00000000-0000-0000-0000-000000000260"),
        catalog="public",
        name="2 Months",
        duration_days=60,
        price=Decimal("79000"),
        display_order=20,
        badge_label="Most Popular",
        perks=(
            "Full access to all IELTS mock tests",
            "Detailed test analysis after each test",
            "Advanced performance dashboard & analytics",
            "AI Writing Evaluation with deep feedback",
            "10 Writing checks per day",
            "Gift 7 premium days to a friend",
        ),
        is_featured=True,
        friend_gift_days=7,
        friend_gift_count=1,
    ),
    DefaultPlanDefinition(
        id=UUID("00000000-0000-0000-0000-000000000090"),
        catalog="public",
        name="3 Months",
        duration_days=90,
        price=Decimal("109000"),
        display_order=30,
        badge_label="Best Value",
        perks=(
            "Full access to all IELTS mock tests",
            "Detailed test analysis after each test",
            "Advanced performance dashboard & analytics",
            "AI Writing Evaluation with priority processing",
            "Unlimited Writing Checks (Fair Usage Policy applies)",
            "Gift 14 premium days to a friend",
        ),
        friend_gift_days=14,
        friend_gift_count=1,
    ),
)

GIFT_CODE_PLAN_DEFINITIONS: tuple[DefaultPlanDefinition, ...] = (
    DefaultPlanDefinition(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        catalog="gift",
        name="1 Day",
        duration_days=1,
        price=Decimal("9000"),
        display_order=10,
    ),
    DefaultPlanDefinition(
        id=UUID("00000000-0000-0000-0000-000000000003"),
        catalog="gift",
        name="3 Days",
        duration_days=3,
        price=Decimal("15000"),
        display_order=20,
    ),
    DefaultPlanDefinition(
        id=UUID("00000000-0000-0000-0000-000000000007"),
        catalog="gift",
        name="7 Days",
        duration_days=7,
        price=Decimal("25000"),
        display_order=30,
    ),
    DefaultPlanDefinition(
        id=UUID("00000000-0000-0000-0000-000000000015"),
        catalog="gift",
        name="14 Days",
        duration_days=14,
        price=Decimal("39000"),
        display_order=40,
    ),
    DefaultPlanDefinition(
        id=UUID("00000000-0000-0000-0000-000000000030"),
        catalog="gift",
        name="30 Days",
        duration_days=30,
        price=Decimal("49000"),
        display_order=50,
    ),
    DefaultPlanDefinition(
        id=UUID("00000000-0000-0000-0000-000000000060"),
        catalog="gift",
        name="60 Days",
        duration_days=60,
        price=Decimal("79000"),
        display_order=60,
    ),
)

_ALL_DEFINITIONS_BY_ID: dict[UUID, DefaultPlanDefinition] = {}
for _definition in PUBLIC_PLAN_DEFINITIONS + GIFT_CODE_PLAN_DEFINITIONS:
    _ALL_DEFINITIONS_BY_ID[_definition.id] = _definition

ALL_PLAN_DEFINITIONS: tuple[DefaultPlanDefinition, ...] = tuple(_ALL_DEFINITIONS_BY_ID.values())
PUBLIC_PLAN_IDS: frozenset[UUID] = frozenset(item.id for item in PUBLIC_PLAN_DEFINITIONS)
GIFT_CODE_PLAN_IDS: frozenset[UUID] = frozenset(item.id for item in GIFT_CODE_PLAN_DEFINITIONS)


async def ensure_default_plans(session: AsyncSession) -> list[Plan]:
    existing = list(
        (
            await session.execute(
                select(Plan).where(Plan.id.in_(_ALL_DEFINITIONS_BY_ID.keys()))
            )
        )
        .scalars()
        .all()
    )
    existing_by_id = {plan.id: plan for plan in existing}
    created_any = False

    for definition in ALL_PLAN_DEFINITIONS:
        plan = existing_by_id.get(definition.id)
        if plan is None:
            plan = Plan(
                id=definition.id,
                catalog=definition.catalog,
                name=definition.name,
                duration_days=definition.duration_days,
                price_amount=definition.price,
                discount_percent=definition.discount_percent,
                display_order=definition.display_order,
                badge_label=definition.badge_label,
                perks=list(definition.perks),
                is_featured=definition.is_featured,
                is_active=True,
                payment_paused=definition.payment_paused,
            )
            session.add(plan)
            existing.append(plan)
            created_any = True

    if created_any:
        await session.commit()

    return list(existing)


async def list_plans(
    session: AsyncSession,
    *,
    include_inactive: bool = True,
    catalog: PlanCatalog = "all",
) -> list[Plan]:
    await ensure_default_plans(session)

    query = select(Plan)
    if catalog != "all":
        query = query.where(Plan.catalog == catalog)
    if not include_inactive:
        query = query.where(Plan.is_active == True)

    return list(
        (
            await session.execute(
                query.order_by(Plan.display_order.asc(), Plan.duration_days.asc(), Plan.price_amount.asc())
            )
        )
        .scalars()
        .all()
    )


def is_gift_code_plan_id(plan_id: UUID) -> bool:
    return plan_id in GIFT_CODE_PLAN_IDS


def get_default_plan_definition(plan_id: UUID) -> DefaultPlanDefinition | None:
    return _ALL_DEFINITIONS_BY_ID.get(plan_id)


def get_gift_code_plan_definition_by_days(duration_days: int) -> DefaultPlanDefinition | None:
    for definition in GIFT_CODE_PLAN_DEFINITIONS:
        if definition.duration_days == duration_days:
            return definition
    return None


def get_public_plan_definition_for_granted_days(duration_days: int) -> DefaultPlanDefinition | None:
    eligible = [
        definition
        for definition in PUBLIC_PLAN_DEFINITIONS
        if definition.friend_gift_days > 0 and definition.friend_gift_count > 0 and duration_days >= definition.duration_days
    ]
    if not eligible:
        return None
    return max(eligible, key=lambda definition: definition.duration_days)
