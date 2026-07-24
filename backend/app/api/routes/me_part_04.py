from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.me_dependencies import *
from app.api.routes.me_part_01 import MAX_AVATAR_IMAGE_BYTES
from app.api.routes.me_part_03 import _profile_from_principal, _profile_from_user

router = APIRouter()

def _build_level_progress(total_xp: int, level: int) -> MeLevelProgressRead:
    floor_xp, next_level_xp = level_bounds(level)
    xp_into_level = max(0, total_xp - floor_xp)
    level_span = max(1, next_level_xp - floor_xp)
    remaining = max(0, next_level_xp - total_xp)
    return MeLevelProgressRead(
        level=level,
        level_floor_xp=floor_xp,
        next_level_xp=next_level_xp,
        xp_into_level=xp_into_level,
        xp_needed_for_next_level=remaining,
        progress_percent=round((xp_into_level / level_span) * 100, 1),
    )

async def _user_xp_summary(session: AsyncSession, user: User) -> MeXpSummaryRead:
    total_xp = int(user.total_xp or 0)
    level = int(user.current_level or 1)
    weekly_xp = await get_user_period_xp(session, user_id=user.id, period_type=PERIOD_WEEKLY)
    monthly_xp = await get_user_period_xp(session, user_id=user.id, period_type=PERIOD_MONTHLY)
    latest_transactions = await list_user_xp_transactions(session, user_id=user.id, limit=20)
    latest_positive_transaction = next(
        (transaction for transaction in latest_transactions if int(transaction.xp_amount or 0) > 0),
        None,
    )
    latest_xp_gain = int(latest_positive_transaction.xp_amount or 0) if latest_positive_transaction else None
    return MeXpSummaryRead(
        total_xp=total_xp,
        level=level,
        current_streak=int(user.current_streak or 0),
        best_streak=int(user.best_streak or 0),
        weekly_xp=weekly_xp,
        monthly_xp=monthly_xp,
        latest_xp_gain=latest_xp_gain,
        progress=_build_level_progress(total_xp, level),
    )

async def _leaderboard_rank_for_user(session: AsyncSession, *, user_id: UUID) -> int | None:
    rank = None
    rows = await leaderboard_rows(session, period_type=PERIOD_ALL_TIME)
    ordered_rows = sorted(
        rows,
        key=lambda item: (
            int(item[0].xp_total or 0),
            int(item[1].current_streak or 0),
            float(item[0].average_score or 0.0),
            int(item[0].full_mock_completions or 0),
            -(
                item[0].achieved_at.timestamp()
                if item[0].achieved_at is not None
                else float("inf")
            ),
        ),
        reverse=True,
    )
    for index, (_, row_user) in enumerate(ordered_rows, start=1):
        if row_user.id == user_id:
            rank = index
            break
    return rank

def _serialize_xp_transaction(row) -> MeXpTransactionRead:
    metadata = dict(row.metadata_json or {})
    return MeXpTransactionRead(
        id=row.id,
        type=row.transaction_type,
        source_type=row.source_type,
        source_id=row.source_id,
        xp_amount=int(row.xp_amount or 0),
        message=str(metadata.get("message") or f"{int(row.xp_amount or 0):+d} XP"),
        flagged=bool(metadata.get("flagged")),
        created_at=row.created_at,
        metadata=metadata,
    )

def _serialize_me_payment(payment: Payment, plan: Plan | None) -> MePaymentRead:
    payment_method_values = {item.value for item in PaymentMethod}
    method_value = payment.provider if payment.provider in payment_method_values else PaymentMethod.card_transfer.value
    exposes_card_details = str(payment.status or "") in PENDING_PAYMENT_STATUSES
    metadata = payment.meta if isinstance(payment.meta, dict) else {}
    support_contact = str(metadata.get("support_contact") or DEFAULT_PAYMENT_SUPPORT_CONTACT)
    payment_instructions = str(
        metadata.get("payment_instructions")
        or "Transfer the amount to the card, then send a screenshot to Telegram support."
    )
    return MePaymentRead(
        id=payment.id,
        invoice_code=payment.invoice_code,
        plan_id=payment.plan_id,
        plan_name=plan.name if plan is not None else str(metadata.get("plan_name", "Unknown plan")),
        duration_days=plan.duration_days if plan is not None else None,
        method=PaymentMethod(method_value),
        status=str(payment.status or "pending"),
        base_amount=payment.base_amount,
        compare_at_amount=payment.compare_at_amount,
        amount=payment.amount,
        discount_amount=payment.discount_amount,
        currency=payment.currency,
        card_label=payment.card_label if exposes_card_details else None,
        card_number=payment.card_number if exposes_card_details else None,
        support_contact=support_contact,
        payment_instructions=payment_instructions,
        expires_at=payment.expires_at,
        matched_at=payment.matched_at,
        paid_at=payment.paid_at,
        archived_at=payment.archived_at,
        granted_until=payment.granted_until,
        status_reason=payment.status_reason,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
    )

def _serialize_me_gift_code_summary(payload: dict[str, object]) -> MeGiftCodeSummaryRead:
    items = payload.get("items", [])
    recent_codes = payload.get("recent_codes", [])
    return MeGiftCodeSummaryRead(
        items=list(items),
        recent_codes=[MeGiftCodeRead(**item) for item in recent_codes if isinstance(item, dict)],
        total_available_count=int(payload.get("total_available_count", 0) or 0),
        can_generate=bool(payload.get("can_generate", False)),
    )

@router.get("", response_model=MeProfileRead)
async def get_me(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeProfileRead:
    user = await session.get(User, current_user.id)
    if user is None:
        return _profile_from_principal(current_user)

    await reconcile_user_premium_status(session, user=user)
    await sync_user_telegram_profile(user)
    if current_user.avatar_url and not user.avatar_is_custom:
        user.avatar_url = current_user.avatar_url
    await session.commit()
    await session.refresh(user)
    return _profile_from_user(user)

@router.patch("", response_model=MeProfileRead)
async def update_me(
    payload: MeProfileUpdateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeProfileRead:
    updates = payload.model_dump(exclude_unset=True)
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    await reconcile_user_premium_status(session, user=user)

    if "first_name" in updates or "last_name" in updates:
        normalized_first, normalized_last = normalize_user_name_parts(
            updates.get("first_name", user.first_name),
            updates.get("last_name", user.last_name),
        )
        updates["first_name"] = normalized_first
        updates["last_name"] = normalized_last
        user.name_is_custom = True

    if "username" in updates:
        user.username_is_custom = True

    for field_name, value in updates.items():
        setattr(user, field_name, value)

    await session.commit()
    await session.refresh(user)
    return _profile_from_user(user)

async def _read_avatar_upload(file: UploadFile) -> bytes:
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed.")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty.")
    if len(payload) > MAX_AVATAR_IMAGE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar image must be under 5 MB.")
    return payload

@router.post("/avatar", response_model=MeProfileRead)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeProfileRead:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    await reconcile_user_premium_status(session, user=user)

    payload = await _read_avatar_upload(file)
    try:
        user.avatar_url = upload_user_avatar_image(
            content=payload,
            filename=file.filename or "avatar-image",
            content_type=file.content_type or "application/octet-stream",
        )
        user.avatar_is_custom = True
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    await session.commit()
    await session.refresh(user)
    return _profile_from_user(user)

@router.delete("/avatar", response_model=MeProfileRead)
async def delete_my_avatar(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeProfileRead:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    await reconcile_user_premium_status(session, user=user)

    user.avatar_url = None
    user.avatar_is_custom = True
    await session.commit()
    await session.refresh(user)
    return _profile_from_user(user)

@router.get("/gift-codes", response_model=MeGiftCodeSummaryRead)
async def list_my_gift_codes(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeGiftCodeSummaryRead:
    user = await session.get(User, current_user.id)
    if user is not None:
        await ensure_manual_premium_entitlement_for_user(session, user=user)
        await session.commit()
    summary = await get_user_gift_code_summary(session, user_id=current_user.id)
    return _serialize_me_gift_code_summary(summary)
