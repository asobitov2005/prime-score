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

async def bulk_grant_premium(
    payload: BulkPremiumRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    from datetime import datetime, timedelta, timezone
    try:
        from app.services.notification_sender import create_and_send_notification
        now = datetime.now(timezone.utc)
        until = now + timedelta(days=payload.days)
        for uid in payload.user_ids:
            user = await session.get(User, uid)
            if user is not None:
                user.is_premium = True
                user.premium_until = until
                await grant_manual_premium_entitlement(
                    session,
                    user=user,
                    granted_days=max(1, payload.days),
                    premium_until=until,
                    now=now,
                )
                body = f"{payload.days} days of Premium activated. Valid until {until.strftime('%d.%m.%Y')}."
                await create_and_send_notification(
                    session,
                    user_id=uid,
                    type=NotificationType.payment_success,
                    title="Premium activated!",
                    body=body,
                    telegram_text=f"🎉 <b>Premium activated!</b>\n\n{body}",
                )
        await session.commit()
        return MessageResponse(message=f"{len(payload.user_ids)} ta userga {payload.days} kunlik premium berildi.")
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Bulk premium failed.") from exc

async def revoke_premium(
    user_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.is_premium = False
    user.premium_until = None
    from app.services.notification_sender import create_and_send_notification
    await create_and_send_notification(
        session,
        user_id=user_id,
        type=NotificationType.premium_expired,
        title="Premium revoked",
        body="Your Premium subscription has been revoked by admin. Contact support to reactivate.",
        telegram_text="❌ <b>Premium revoked</b>\n\nYour Premium subscription has been revoked by admin.",
    )
    await session.commit()
    return MessageResponse(message="Premium bekor qilindi.")

async def toggle_leaderboard(
    user_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.show_on_leaderboard = not user.show_on_leaderboard
    await session.commit()
    return MessageResponse(message=f"Leaderboard: {'visible' if user.show_on_leaderboard else 'hidden'}.")

async def create_user(
    payload: AdminUserCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    params: AdminFilterParams = Depends(),
) -> AdminUserDetailRead:
    _ = current_admin
    phone = normalize_phone_number(payload.phone)
    if not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is required.")
    existing = await session.scalar(
        select(User).where(
            (User.telegram_id == payload.telegram_id) | (User.phone == phone),
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with the same Telegram ID or phone already exists.")

    now = datetime.now(UTC)
    premium_until = None
    if payload.is_premium or payload.premium_days > 0:
        premium_until = now + timedelta(days=max(1, payload.premium_days or 1))

    first_name = " ".join(payload.first_name.split()).strip() or "User"
    last_name = " ".join(payload.last_name.split()).strip() if payload.last_name else None
    username = " ".join(payload.username.split()).strip() if payload.username else None

    user = User(
        telegram_id=payload.telegram_id,
        phone=phone,
        first_name=first_name,
        last_name=last_name or None,
        username=username or None,
        avatar_url=payload.avatar_url,
        telegram_contact_updated_at=now,
        is_premium=bool(premium_until),
        premium_until=premium_until,
        show_on_leaderboard=payload.show_on_leaderboard,
        last_active_at=now,
    )
    session.add(user)

    try:
        await session.flush()
        if premium_until is not None:
            await grant_manual_premium_entitlement(
                session,
                user=user,
                granted_days=max(1, payload.premium_days or 1),
                premium_until=premium_until,
                now=now,
            )
        await session.commit()
        await session.refresh(user)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user.") from exc

    return await _build_admin_user_detail(session, user, params)

async def delete_user(
    user_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    user = await _get_active_user_or_404(session, user_id)
    telegram_id = user.telegram_id
    phone = user.phone
    await purge_user_data(session, user=user)
    await _write_audit_log(
        session,
        admin_id=current_admin.id,
        action="user.delete",
        target_type="user",
        target_id=user.id,
        changes={
            "telegram_id": telegram_id,
            "phone": phone,
        },
    )
    await session.commit()
    return MessageResponse(message="User deleted.")

async def check_premiums(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    from app.services.notification_sender import check_expired_premiums, check_expiring_premiums
    expired = await check_expired_premiums(session)
    expiring = await check_expiring_premiums(session)
    return MessageResponse(message=f"Expired: {expired}, Expiring soon: {expiring}")
