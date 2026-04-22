from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.commerce import Plan
from app.schemas.plans import PublicPlanRead

router = APIRouter()

DEFAULT_PLANS = (
    {
        "id": UUID("00000000-0000-0000-0000-000000000030"),
        "name": "30 Days",
        "duration_days": 30,
        "price": Decimal("49000"),
        "discount_percent": 0,
        "currency": "UZS",
        "payment_paused": True,
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000090"),
        "name": "90 Days",
        "duration_days": 90,
        "price": Decimal("119000"),
        "discount_percent": 18,
        "currency": "UZS",
        "payment_paused": True,
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000180"),
        "name": "180 Days",
        "duration_days": 180,
        "price": Decimal("199000"),
        "discount_percent": 28,
        "currency": "UZS",
        "payment_paused": True,
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000365"),
        "name": "365 Days",
        "duration_days": 365,
        "price": Decimal("349000"),
        "discount_percent": 40,
        "currency": "UZS",
        "payment_paused": True,
    },
)


@router.get("", response_model=list[PublicPlanRead])
async def list_public_plans(
    session: AsyncSession = Depends(get_db_session),
) -> list[PublicPlanRead]:
    settings = get_settings()

    try:
        result = await session.execute(
            select(Plan)
            .where(Plan.is_active == True)
            .order_by(Plan.duration_days.asc(), Plan.price_amount.asc())
        )
        plans = list(result.scalars().all())
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        plans = []

    if plans:
        return [
            PublicPlanRead(
                id=plan.id,
                name=plan.name,
                duration_days=plan.duration_days,
                price=Decimal(str(plan.price_amount)),
                discount_percent=plan.discount_percent,
                currency="UZS",
                payment_paused=bool(settings.payment_paused or plan.payment_paused),
            )
            for plan in plans
        ]

    return [
        PublicPlanRead(
            id=item["id"],
            name=item["name"],
            duration_days=item["duration_days"],
            price=item["price"],
            discount_percent=item["discount_percent"],
            currency=item["currency"],
            payment_paused=bool(settings.payment_paused or item["payment_paused"]),
        )
        for item in DEFAULT_PLANS
    ]
