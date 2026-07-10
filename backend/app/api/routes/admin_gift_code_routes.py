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

async def list_gift_codes(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminGiftCodeRead]:
    _ = current_admin
    now = datetime.now(UTC)

    try:
        rows = (
            await session.execute(
                select(GiftCode, Plan, User)
                .outerjoin(Plan, GiftCode.plan_id == Plan.id)
                .outerjoin(User, GiftCode.recipient_user_id == User.id)
                .order_by(GiftCode.created_at.desc())
            )
        ).all()
        return [
            _serialize_admin_gift_code(gift_code, plan=plan, recipient=recipient, now=now)
            for gift_code, plan, recipient in rows
        ]
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load redeem codes.") from exc

async def create_gift_codes(
    payload: AdminGiftCodeCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminGiftCodeCreateResponse:
    _ = current_admin

    try:
        await list_catalog_plans(session, include_inactive=True, catalog="all")
        plan = await session.get(Plan, payload.plan_id)
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected plan was not found.")
        if str(plan.catalog or "") != "gift":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected plan cannot be used for redeem codes.")

        prefix = _normalize_code_value(payload.prefix)[:12] or None
        custom_code = _normalize_code_value(payload.custom_code) if payload.custom_code else None
        starts_at = _normalize_datetime(payload.start_date)
        expires_at = _normalize_datetime(payload.end_date)

        if payload.quantity > 1 and custom_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom code can be used only when quantity is 1.")
        if custom_code and len(custom_code) < 7:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom redeem code must be at least 7 characters.")
        if starts_at is not None and starts_at <= datetime.now(UTC):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start date must be in the future.")
        if expires_at is not None and expires_at <= datetime.now(UTC):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be in the future.")
        if starts_at is not None and expires_at is not None and starts_at >= expires_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be after the start date.")
        if payload.per_user_limit > payload.max_uses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Per-user limit cannot exceed the global usage limit.")

        created_items: list[GiftCode] = []
        reserved_codes: set[str] = set()
        initial_status = ModelPaymentStatus.PAUSED if payload.starts_paused else ModelPaymentStatus.PENDING

        for _ in range(payload.quantity):
            code_value = await _build_unique_gift_code(
                session,
                prefix=prefix,
                custom_code=custom_code,
                reserved=reserved_codes,
            )
            reserved_codes.add(code_value)
            gift_code = GiftCode(
                plan_id=plan.id,
                code=code_value,
                status=initial_status,
                starts_at=starts_at,
                expires_at=expires_at,
                max_uses=payload.max_uses,
                used_count=0,
                per_user_limit=payload.per_user_limit,
                target_user_type=payload.target_user_type,
            )
            session.add(gift_code)
            created_items.append(gift_code)
            custom_code = None

        await session.commit()

        now = datetime.now(UTC)
        return AdminGiftCodeCreateResponse(
            message=f"{len(created_items)} redeem code{'s' if len(created_items) != 1 else ''} created.",
            items=[
                _serialize_admin_gift_code(item, plan=plan, recipient=None, now=now)
                for item in created_items
            ],
        )
    except HTTPException:
        raise
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create redeem codes.") from exc

async def update_gift_code(
    gift_code_id: UUID,
    payload: AdminGiftCodeUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminGiftCodeRead:
    _ = current_admin

    try:
        gift_code = await session.get(GiftCode, gift_code_id)
        if gift_code is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redeem code was not found.")

        if gift_code.status == ModelPaymentStatus.COMPLETED or gift_code.used_count >= gift_code.max_uses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Redeemed code can no longer be changed.")

        if payload.status == "available":
            gift_code.status = ModelPaymentStatus.PENDING
        elif payload.status == "paused":
            gift_code.status = ModelPaymentStatus.PAUSED
        else:
            gift_code.status = ModelPaymentStatus.FAILED

        await session.commit()

        plan = await session.get(Plan, gift_code.plan_id) if gift_code.plan_id else None
        recipient = await session.get(User, gift_code.recipient_user_id) if gift_code.recipient_user_id else None
        return _serialize_admin_gift_code(gift_code, plan=plan, recipient=recipient, now=datetime.now(UTC))
    except HTTPException:
        raise
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update redeem code.") from exc
