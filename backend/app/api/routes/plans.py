from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.schemas.plans import PublicPlanRead
from app.services.plan_catalog import list_plans

router = APIRouter()


@router.get("", response_model=list[PublicPlanRead])
async def list_public_plans(
    session: AsyncSession = Depends(get_db_session),
) -> list[PublicPlanRead]:
    settings = get_settings()

    try:
        plans = await list_plans(session, include_inactive=False, catalog="public")
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load public plans.") from exc

    return [
        PublicPlanRead(
            id=plan.id,
            name=plan.name,
            duration_days=plan.duration_days,
            price=Decimal(str(plan.price_amount)),
            discount_percent=plan.discount_percent,
            currency="UZS",
            badge_label=plan.badge_label,
            perks=list(plan.perks or []),
            display_order=plan.display_order,
            is_featured=plan.is_featured,
            payment_paused=bool(settings.payment_paused or plan.payment_paused),
        )
        for plan in plans
    ]
