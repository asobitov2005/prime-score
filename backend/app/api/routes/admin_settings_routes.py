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

@router.get("/settings", response_model=AdminSettingsRead)
async def get_settings_view(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    params: AdminFilterParams = Depends(),
) -> AdminSettingsRead:
    from app.core.config import get_settings as _get_settings
    settings = _get_settings()
    users_total = await session.scalar(select(func.count()).select_from(User)) or 0
    tests_total = await session.scalar(apply_admin_filters(select(func.count()).select_from(Test), Test, params)) or 0
    attempts_total = await session.scalar(apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params)) or 0
    bot_connected = bool(settings.telegram_bot_token and settings.telegram_bot_token != "change-me")
    return AdminSettingsRead(
        project_name=settings.project_name,
        environment=settings.environment,
        timezone=settings.timezone,
        payment_paused=settings.payment_paused,
        admin_username=current_admin.username,
        admin_email=current_admin.email,
        admin_phone_number=current_admin.phone_number,
        telegram_bot_connected=bot_connected,
        total_users=int(users_total),
        total_tests=int(tests_total),
        total_attempts=int(attempts_total),
    )

@router.patch("/auth/security", response_model=MessageResponse)
async def update_admin_security(
    payload: AdminSecurityUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    try:
        updated_admin = await update_admin_security_settings(
            session,
            admin_id=current_admin.id,
            current_password=payload.current_password,
            phone_number=payload.phone_number,
            new_password=payload.new_password,
        )
    except AdminOtpFailure as exc:
        if exc.reason == "invalid_current_password":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect.") from exc
        if exc.reason == "phone_not_linked":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number must be registered through the Telegram bot first.",
            ) from exc
        if exc.reason == "phone_already_used":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is already used by another admin.") from exc
        if exc.reason == "weak_password":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters.") from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not update admin account.") from exc

    await _write_audit_log(
        session,
        admin_id=current_admin.id,
        action="admin.security_update",
        target_type="admin",
        target_id=updated_admin.id,
        changes={
            "phone_number": updated_admin.phone_number,
            "telegram_id": updated_admin.telegram_id,
            "password_updated": bool(payload.new_password),
        },
    )
    await session.commit()
    return MessageResponse(message="Admin account updated successfully.")
