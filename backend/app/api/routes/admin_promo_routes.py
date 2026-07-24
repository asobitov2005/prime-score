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

@router.get("/promo-codes", response_model=list[AdminPromoCodeRead])
async def list_promo_codes(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminPromoCodeRead]:
    _ = current_admin
    promo_codes = list(
        (
            await session.scalars(
                select(PromoCode).order_by(PromoCode.created_at.desc())
            )
        ).all()
    )
    return [_serialize_promo_code(item) for item in promo_codes]

@router.post("/promo-codes", response_model=AdminPromoCodeRead, status_code=201)
async def create_promo_code(
    payload: AdminPromoCodeCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminPromoCodeRead:
    code = _normalize_code_value(payload.code)
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo code is required.")
    expires_at = _normalize_datetime(payload.expires_at)
    if expires_at is not None and expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expiration must be in the future.")

    existing = await session.scalar(select(PromoCode.id).where(func.upper(PromoCode.code) == code))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo code already exists.")

    promo_code = PromoCode(
        code=code,
        discount_percent=payload.discount_percent,
        max_uses=payload.max_uses,
        used_count=0,
        valid_until=expires_at,
        is_active=payload.is_active,
    )
    session.add(promo_code)
    await session.flush()
    await _write_audit_log(
        session,
        admin_id=current_admin.id,
        action="promo_code.create",
        target_type="promo_code",
        target_id=promo_code.id,
        changes={
            "code": promo_code.code,
            "discount_percent": promo_code.discount_percent,
            "max_uses": promo_code.max_uses,
            "is_active": promo_code.is_active,
        },
    )
    await session.commit()
    await session.refresh(promo_code)
    return _serialize_promo_code(promo_code)

@router.patch("/promo-codes/{promo_code_id}", response_model=AdminPromoCodeRead)
async def update_promo_code(
    promo_code_id: UUID,
    payload: AdminPromoCodeCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminPromoCodeRead:
    promo_code = await session.get(PromoCode, promo_code_id)
    if promo_code is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promo code was not found.")

    next_code = _normalize_code_value(payload.code)
    duplicate = await session.scalar(
        select(PromoCode.id).where(func.upper(PromoCode.code) == next_code, PromoCode.id != promo_code_id)
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promo code already exists.")

    expires_at = _normalize_datetime(payload.expires_at)
    if expires_at is not None and expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expiration must be in the future.")

    promo_code.code = next_code
    promo_code.discount_percent = payload.discount_percent
    promo_code.max_uses = payload.max_uses
    promo_code.valid_until = expires_at
    promo_code.is_active = payload.is_active
    await _write_audit_log(
        session,
        admin_id=current_admin.id,
        action="promo_code.update",
        target_type="promo_code",
        target_id=promo_code.id,
        changes={
            "code": promo_code.code,
            "discount_percent": promo_code.discount_percent,
            "max_uses": promo_code.max_uses,
            "is_active": promo_code.is_active,
        },
    )
    await session.commit()
    await session.refresh(promo_code)
    return _serialize_promo_code(promo_code)
