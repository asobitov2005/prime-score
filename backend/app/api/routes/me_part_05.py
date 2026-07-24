from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.me_dependencies import *
from app.api.routes.me_part_04 import _serialize_me_gift_code_summary, _serialize_me_payment

router = APIRouter()

@router.post("/gift-codes/generate", response_model=MeGenerateGiftCodeResponse)
async def generate_my_gift_code(
    payload: MeGenerateGiftCodeRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeGenerateGiftCodeResponse:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    try:
        gift_code = await generate_user_gift_code(
            session,
            user=user,
            gift_days=payload.gift_days,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await session.commit()
    summary = await get_user_gift_code_summary(session, user_id=user.id)
    duration_days = 0
    for item in summary.get("recent_codes", []):
        if isinstance(item, dict) and item.get("id") == gift_code.id:
            duration_days = int(item.get("duration_days", 0) or 0)
            break

    return MeGenerateGiftCodeResponse(
        message=f"Gift code generated for {payload.gift_days} premium days.",
        gift_code=MeGiftCodeRead(
            id=gift_code.id,
            code=gift_code.code,
            duration_days=duration_days or payload.gift_days,
            status="available",
            expires_at=gift_code.expires_at,
            redeemed_at=gift_code.redeemed_at,
            created_at=gift_code.created_at,
        ),
        summary=_serialize_me_gift_code_summary(summary),
    )

@router.post("/redeem-code", response_model=MeRedeemCodeResponse)
async def redeem_code(
    payload: MeRedeemCodeRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeRedeemCodeResponse:
    normalized_code = payload.code.strip().replace(" ", "").upper()
    now = datetime.now(UTC)

    if not normalized_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a redeem code first.")
    if len(normalized_code) < 7:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Redeem code must be at least 7 characters.")

    gift_code = await session.scalar(
        select(GiftCode).where(func.upper(GiftCode.code) == normalized_code)
    )
    if gift_code is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redeem code was not found.")

    if gift_code.expires_at and gift_code.expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code has expired.")

    if gift_code.starts_at and gift_code.starts_at > now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code is not active yet.")

    if gift_code.status == PaymentStatus.PAUSED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code is not active yet.")

    if gift_code.status == PaymentStatus.FAILED or gift_code.status == PaymentStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code is no longer available.")

    if gift_code.used_count >= gift_code.max_uses:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This redeem code has reached its usage limit.")

    if gift_code.plan_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code is not linked to a premium plan yet.")

    plan = await session.get(Plan, gift_code.plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The plan linked to this redeem code was not found.")

    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    if gift_code.purchaser_user_id == user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot redeem your own gift code.")

    has_active_premium = bool(user.is_premium and user.premium_until and user.premium_until > now)
    if gift_code.target_user_type == "premium" and not has_active_premium:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This redeem code is only for premium users.")
    if gift_code.target_user_type == "free" and has_active_premium:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This redeem code is only for free users.")

    prior_uses = await session.scalar(
        select(func.count())
        .select_from(GiftCodeRedemption)
        .where(
            GiftCodeRedemption.gift_code_id == gift_code.id,
            GiftCodeRedemption.user_id == user.id,
        )
    ) or 0
    if prior_uses >= gift_code.per_user_limit:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already reached the per-user limit for this redeem code.")

    premium_start = user.premium_until if has_active_premium and user.premium_until else now
    premium_until = premium_start + timedelta(days=plan.duration_days)

    user.is_premium = True
    user.premium_until = premium_until

    redemption = GiftCodeRedemption(
        gift_code_id=gift_code.id,
        user_id=user.id,
        redeemed_at=now,
        premium_starts_at=premium_start,
        premium_until=premium_until,
    )
    session.add(redemption)

    gift_code.recipient_user_id = user.id
    gift_code.redeemed_at = now
    gift_code.used_count += 1
    if gift_code.used_count >= gift_code.max_uses:
        gift_code.status = PaymentStatus.COMPLETED

    message = f"Premium unlocked for {plan.duration_days} days. Active until {premium_until.strftime('%d %b %Y')}."

    await create_and_send_notification(
        session,
        user_id=user.id,
        type=NotificationType.gift_received,
        title="Premium activated!",
        body=message,
        telegram_text=f"🎉 <b>Premium activated!</b>\n\n{message}",
    )

    await session.commit()

    return MeRedeemCodeResponse(
        message=message,
        code=gift_code.code,
        plan_name=plan.name,
        duration_days=plan.duration_days,
        is_premium=True,
        premium_until=premium_until,
    )

@router.get("/payments", response_model=list[MePaymentRead])
async def list_my_payments(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MePaymentRead]:
    expired_count = await expire_stale_payments(session)
    if expired_count:
        await session.commit()

    rows = (
        await session.execute(
            select(Payment, Plan)
            .outerjoin(Plan, Payment.plan_id == Plan.id)
            .where(
                Payment.user_id == current_user.id,
                Payment.status.in_(("pending", "matched", "expired", "canceled", "review", "failed")),
            )
            .order_by(Payment.created_at.desc())
            .limit(20)
        )
    ).all()
    return [_serialize_me_payment(payment, plan) for payment, plan in rows]

@router.post("/payments", response_model=MePaymentCreateResponse, status_code=201)
async def create_my_payment(
    payload: MePaymentCreateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MePaymentCreateResponse:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    await ensure_default_plans(session)

    plan = await session.get(Plan, payload.plan_id)
    if plan is None or str(plan.catalog or "public") != "public" or not plan.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected subscription plan was not found.")

    try:
        payment = await create_plan_payment(session, user=user, plan=plan)
        await session.commit()
        await session.refresh(payment)
    except ValueError as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create payment invoice.") from exc

    return MePaymentCreateResponse(
        message="Invoice created. Transfer the amount to the card and send the screenshot to Telegram support.",
        payment=_serialize_me_payment(
            payment,
            await session.get(Plan, payment.plan_id) if payment.plan_id else None,
        ),
    )

@router.post("/payments/{payment_id}/cancel", response_model=MePaymentCancelResponse)
async def cancel_my_payment(
    payment_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MePaymentCancelResponse:
    payment = await session.get(Payment, payment_id)
    if payment is None or payment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment invoice was not found.")
    if str(payment.status) not in PENDING_PAYMENT_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only active invoices can be canceled.")

    payment.status = "canceled"
    payment.archived_at = datetime.now(UTC)
    payment.status_reason = "Canceled by user."

    await session.commit()
    await session.refresh(payment)
    plan = await session.get(Plan, payment.plan_id) if payment.plan_id else None
    return MePaymentCancelResponse(
        message="Payment invoice canceled.",
        payment=_serialize_me_payment(payment, plan),
    )

async def _load_attempts(current_user: DebugPrincipal, session: AsyncSession):
    try:
        return await iter_user_attempts_from_db(session, user_id=current_user.id)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load user attempts.",
        ) from exc

def _filter_attempts_by_type(attempts, test_type: TestType | None):
    if test_type is None:
        return attempts
    return [
        attempt
        for attempt in attempts
        if attempt.test_snapshot.get("test_type") == test_type
    ]

def _attempt_scope_value(attempt) -> str:
    snapshot = attempt.test_snapshot if isinstance(attempt.test_snapshot, dict) else {}
    scope = snapshot.get("scope")
    if scope is None:
        scope = getattr(attempt, "scope", None)
    return str(getattr(scope, "value", scope) or "")
