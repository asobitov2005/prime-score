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

@router.get("/payments", response_model=AdminPaymentListResponse)
async def list_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminPaymentListResponse:
    _ = current_admin
    expired_count = await expire_stale_payments(session)
    if expired_count:
        await session.commit()

    total = await session.scalar(select(func.count()).select_from(Payment))

    offset = (page - 1) * limit
    rows = (
        await session.execute(
            select(Payment, User, Plan)
            .outerjoin(User, Payment.user_id == User.id)
            .outerjoin(Plan, Payment.plan_id == Plan.id)
            .order_by(Payment.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    ).all()
    return AdminPaymentListResponse(
        items=[
            _serialize_admin_payment(payment, user=user, plan=plan)
            for payment, user, plan in rows
        ],
        total=total or 0,
        page=page,
        page_size=limit,
    )

@router.patch("/payments/{payment_id}", response_model=AdminPaymentRead)
async def update_payment(
    payment_id: UUID,
    payload: AdminPaymentUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminPaymentRead:
    _ = current_admin
    payment = await session.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment invoice was not found.")

    next_status = payload.status.value
    now = datetime.now(UTC)

    try:
        if next_status == "completed":
            if payment.status != "completed":
                await complete_payment(session, payment=payment)
            if payload.status_reason:
                payment.status_reason = payload.status_reason
        else:
            payment.status = next_status
            payment.status_reason = payload.status_reason
            if next_status == "matched" and payment.matched_at is None:
                payment.matched_at = now
            if next_status in {"expired", "canceled", "failed"}:
                payment.archived_at = payment.archived_at or now
            if next_status in {"pending", "matched", "review"}:
                payment.archived_at = None
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await session.commit()
    user = await session.get(User, payment.user_id) if payment.user_id else None
    plan = await session.get(Plan, payment.plan_id) if payment.plan_id else None
    return _serialize_admin_payment(payment, user=user, plan=plan)

@router.get("/payment-cards", response_model=list[PaymentCardRead])
async def list_payment_cards(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[PaymentCardRead]:
    _ = current_admin
    cards = list(
        (
            await session.execute(
                select(PaymentCard).order_by(PaymentCard.is_active.desc(), PaymentCard.priority.desc(), PaymentCard.created_at.asc())
            )
        )
        .scalars()
        .all()
    )
    return [_serialize_payment_card(card) for card in cards]

@router.post("/payment-cards", response_model=PaymentCardRead, status_code=201)
async def create_payment_card(
    payload: PaymentCardCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaymentCardRead:
    _ = current_admin
    card = PaymentCard(
        label=payload.label.strip(),
        card_number=payload.card_number.strip(),
        card_type=payload.card_type,
        holder_name=payload.holder_name.strip() if payload.holder_name else None,
        is_active=payload.is_active,
        priority=payload.priority,
    )
    session.add(card)
    await session.flush()
    if payload.is_active:
        await set_single_active_card(session, card.id)
    await session.commit()
    await session.refresh(card)
    return _serialize_payment_card(card)

@router.patch("/payment-cards/{card_id}", response_model=PaymentCardRead)
async def update_payment_card(
    card_id: UUID,
    payload: PaymentCardUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaymentCardRead:
    _ = current_admin
    card = await session.get(PaymentCard, card_id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment card was not found.")

    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(card, field_name, value)
    if payload.is_active:
        await set_single_active_card(session, card.id)
    await session.commit()
    await session.refresh(card)
    return _serialize_payment_card(card)

@router.get("/payment-settings", response_model=PaymentSettingsRead)
async def get_payment_settings(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaymentSettingsRead:
    _ = current_admin
    setting = await get_or_create_payment_settings(session)
    await session.commit()
    await session.refresh(setting)
    return _serialize_payment_settings(setting)

@router.patch("/payment-settings", response_model=PaymentSettingsRead)
async def update_payment_settings(
    payload: PaymentSettingsUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaymentSettingsRead:
    _ = current_admin
    setting = await get_or_create_payment_settings(session)
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(setting, field_name, value)
    await session.commit()
    await session.refresh(setting)
    return _serialize_payment_settings(setting)
