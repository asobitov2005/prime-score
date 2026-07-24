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

router = APIRouter()

@router.get("/plans", response_model=list[AdminPlanRead])
async def list_plans(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminPlanRead]:
    _ = current_admin
    try:
        plans = await list_catalog_plans(session, include_inactive=True, catalog="public")
        return [_serialize_admin_plan(plan) for plan in plans]
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load subscription plans.") from exc

@router.get("/gift-code-plans", response_model=list[AdminPlanRead])
async def list_gift_code_plans(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminPlanRead]:
    _ = current_admin
    try:
        plans = await list_catalog_plans(session, include_inactive=True, catalog="gift")
        return [_serialize_admin_plan(plan) for plan in plans]
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load redeem plans.") from exc

@router.post("/plans", response_model=AdminPlanRead, status_code=201)
async def create_plan(
    payload: AdminPlanUpsertRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminPlanRead:
    _ = current_admin
    perks = _normalize_plan_perks(payload.perks)
    if not perks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one plan perk is required.")

    plan = Plan(
        id=uuid4(),
        catalog="public",
        name=_normalize_plan_text(payload.name, fallback="Premium Plan") or "Premium Plan",
        duration_days=payload.duration_days,
        price_amount=payload.price,
        discount_percent=0,
        display_order=payload.display_order,
        badge_label=_normalize_plan_text(payload.badge_label),
        perks=perks,
        is_featured=payload.is_featured,
        is_active=payload.is_active,
    )
    session.add(plan)

    try:
        await session.commit()
        await session.refresh(plan)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create subscription plan.") from exc

    return _serialize_admin_plan(plan)

@router.patch("/plans/{plan_id}", response_model=AdminPlanRead)
async def update_plan(
    plan_id: UUID,
    payload: AdminPlanUpsertRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminPlanRead:
    _ = current_admin
    plan = await session.get(Plan, plan_id)
    if plan is None or str(plan.catalog or "public") != "public":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan was not found.")

    perks = _normalize_plan_perks(payload.perks)
    if not perks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one plan perk is required.")

    plan.name = _normalize_plan_text(payload.name, fallback=plan.name) or plan.name
    plan.duration_days = payload.duration_days
    plan.price_amount = payload.price
    plan.discount_percent = 0
    plan.display_order = payload.display_order
    plan.badge_label = _normalize_plan_text(payload.badge_label)
    plan.perks = perks
    plan.is_featured = payload.is_featured
    plan.is_active = payload.is_active

    try:
        await session.commit()
        await session.refresh(plan)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update subscription plan.") from exc

    return _serialize_admin_plan(plan)
