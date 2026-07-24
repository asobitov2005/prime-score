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

@router.post("/auth/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def request_admin_password_reset(
    payload: AdminPasswordResetRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    throttle = get_admin_auth_throttle()
    try:
        await throttle.enforce_password_reset_issue_limit(
            phone_number=payload.phone_number,
            ip_address=_request_ip_address(request),
        )
    except AdminOtpFailure as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests. Try again later.",
        ) from exc

    admin = await get_admin_by_phone_number(session, payload.phone_number)
    if admin is None or not admin.is_active or admin.telegram_id is None or not admin.phone_number:
        return MessageResponse(message=ADMIN_PASSWORD_RESET_GENERIC_MESSAGE)

    now = datetime.now(UTC)
    previous_message_rows = (
        await session.execute(
            update(AdminLoginOtp)
            .where(
                AdminLoginOtp.admin_id == admin.id,
                AdminLoginOtp.purpose == ADMIN_PASSWORD_RESET_PURPOSE,
                AdminLoginOtp.used_at.is_(None),
                AdminLoginOtp.expires_at > now,
            )
            .values(used_at=now)
            .returning(AdminLoginOtp.telegram_id, AdminLoginOtp.telegram_message_id)
        )
    ).all()
    previous_messages = [
        (int(row[0]), int(row[1]))
        for row in previous_message_rows
        if row[1] is not None
    ]

    challenge = AdminLoginOtp(
        admin_id=admin.id,
        phone_number=admin.phone_number,
        telegram_id=admin.telegram_id,
        otp_code=generate_admin_otp_code(),
        purpose=ADMIN_PASSWORD_RESET_PURPOSE,
        expires_at=now + timedelta(seconds=ADMIN_PASSWORD_RESET_TTL_SECONDS),
        attempts=0,
    )
    session.add(challenge)
    await session.flush()

    reset_url = build_admin_password_reset_url(challenge.id)
    message_id = await send_telegram_message_with_id(
        chat_id=admin.telegram_id,
        text=build_admin_password_reset_message(reset_url),
        reply_markup=build_admin_password_reset_reply_markup(reset_url),
    )
    if message_id is None:
        await session.rollback()
        return MessageResponse(message=ADMIN_PASSWORD_RESET_GENERIC_MESSAGE)
    challenge.telegram_message_id = message_id

    await session.commit()
    await session.refresh(challenge)
    _schedule_admin_otp_expiry_notice(challenge.id)
    for chat_id, previous_message_id in previous_messages:
        await _edit_admin_otp_message_by_ids(
            chat_id,
            previous_message_id,
            ADMIN_PASSWORD_RESET_REPLACED_MESSAGE,
        )

    return MessageResponse(message=ADMIN_PASSWORD_RESET_GENERIC_MESSAGE)

@router.get("/auth/reset-password/{token}", response_model=AdminPasswordResetTokenStatusResponse)
async def read_admin_password_reset_token(
    token: str,
    session: AsyncSession = Depends(get_db_session),
) -> AdminPasswordResetTokenStatusResponse:
    now = datetime.now(UTC)
    try:
        challenge = await get_admin_password_reset_challenge(session, token=token, now=now)
    except AdminOtpFailure as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link is invalid or expired.",
        ) from exc

    expires_in_seconds = max(0, int((challenge.expires_at - now).total_seconds()))
    return AdminPasswordResetTokenStatusResponse(expires_in_seconds=expires_in_seconds)

@router.post("/auth/reset-password", response_model=MessageResponse)
async def complete_admin_password_reset(
    payload: AdminPasswordResetCompleteRequest,
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    try:
        admin = await consume_admin_password_reset_token(
            session,
            token=payload.token,
            new_password=payload.new_password,
        )
    except AdminOtpFailure as exc:
        if exc.reason == "weak_password":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 8 characters.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link is invalid or expired.",
        ) from exc

    if admin.telegram_id is not None:
        await send_telegram_message_with_id(
            chat_id=admin.telegram_id,
            text=build_admin_password_reset_success_message(),
        )

    return MessageResponse(message="Admin password updated successfully.")
