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

async def login_admin(
    payload: AdminAuthLoginRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AdminAuthChallengeResponse:
    throttle = get_admin_auth_throttle()
    if await throttle.is_credentials_limited(payload.phone_number):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
        )

    admin = await authenticate_admin_by_phone_number(session, payload.phone_number, payload.password)
    if admin is None:
        await throttle.record_failed_credentials(payload.phone_number)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials.")

    if admin.telegram_id is None or not admin.phone_number:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is not linked to Telegram.",
        )

    await throttle.clear_failed_credentials(payload.phone_number)
    try:
        await throttle.enforce_otp_issue_limit(f"{admin.id}:{payload.phone_number}")
    except AdminOtpFailure as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many OTP requests.") from exc

    now = datetime.now(UTC)
    previous_message_rows = (
        await session.execute(
            update(AdminLoginOtp)
            .where(
                AdminLoginOtp.admin_id == admin.id,
                AdminLoginOtp.purpose == ADMIN_LOGIN_OTP_PURPOSE,
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

    otp_code = generate_admin_otp_code()
    challenge = AdminLoginOtp(
        admin_id=admin.id,
        phone_number=admin.phone_number,
        telegram_id=admin.telegram_id,
        otp_code=otp_code,
        purpose=ADMIN_LOGIN_OTP_PURPOSE,
        expires_at=now + timedelta(seconds=ADMIN_LOGIN_OTP_TTL_SECONDS),
        attempts=0,
    )
    session.add(challenge)
    await session.flush()

    message_id = await send_telegram_message_with_id(
        chat_id=admin.telegram_id,
        text=build_admin_otp_message(otp_code),
    )
    if message_id is None:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send Telegram OTP. Try again later.",
        )
    challenge.telegram_message_id = message_id

    await session.commit()
    await session.refresh(challenge)
    _schedule_admin_otp_expiry_notice(challenge.id)
    for chat_id, previous_message_id in previous_messages:
        await _edit_admin_otp_message_by_ids(chat_id, previous_message_id, ADMIN_OTP_EXPIRED_MESSAGE)

    return AdminAuthChallengeResponse(challenge_id=challenge.id)

async def verify_admin_otp(
    payload: AdminAuthVerifyOtpRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AdminAuthResponse:
    challenge = await session.get(AdminLoginOtp, payload.challenge_id)
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired admin OTP.")

    now = datetime.now(UTC)
    try:
        from app.services.admin_auth import consume_admin_login_otp

        consume_admin_login_otp(challenge, payload.otp_code, now=now)
    except AdminOtpFailure as exc:
        if exc.reason == "expired":
            challenge.used_at = now
            await session.commit()
            await _edit_admin_otp_message(challenge, ADMIN_OTP_EXPIRED_MESSAGE)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired admin OTP.") from exc
        await session.commit()
        if exc.reason == "locked":
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed OTP attempts.",
            ) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired admin OTP.") from exc

    admin = await get_admin_by_id(session, challenge.admin_id)
    if admin is None or not admin.is_active or admin.telegram_id != challenge.telegram_id:
        await session.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account is not available.")

    admin.last_login_at = now
    principal = build_admin_principal(admin)
    claims = _build_admin_token_claims(principal)
    response = AdminAuthResponse(
        admin=principal,
        access_token=create_access_token(
            str(principal.id),
            extra_claims=claims,
            expires_delta=ADMIN_ACCESS_EXPIRES_DELTA,
        ),
        refresh_token=create_refresh_token(
            str(principal.id),
            extra_claims=claims,
            expires_delta=ADMIN_REFRESH_EXPIRES_DELTA,
        ),
        access_expires_in_seconds=ADMIN_ACCESS_EXPIRES_IN_SECONDS,
        refresh_expires_in_seconds=ADMIN_REFRESH_EXPIRES_IN_SECONDS,
    )
    await session.commit()
    await _edit_admin_otp_message(challenge, ADMIN_OTP_SUCCESS_MESSAGE)
    return response

async def refresh_admin_session(
    payload: AdminAuthRefreshRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AdminAuthResponse:
    try:
        token_payload = decode_token(payload.refresh_token, refresh=True)
        admin_id = UUID(str(token_payload["sub"]))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin refresh token.") from exc

    if token_payload.get("scope") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token scope.")

    admin = await get_admin_by_id(session, admin_id)
    if admin is None or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account is not available.")

    try:
        token_auth_version = int(token_payload.get("auth_version") or 1)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin refresh token.") from exc

    if token_auth_version != (admin.auth_version or 1):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session is no longer active.")

    principal = build_admin_principal(admin)
    claims = _build_admin_token_claims(principal)
    return AdminAuthResponse(
        admin=principal,
        access_token=create_access_token(
            str(principal.id),
            extra_claims=claims,
            expires_delta=ADMIN_ACCESS_EXPIRES_DELTA,
        ),
        refresh_token=create_refresh_token(
            str(principal.id),
            extra_claims=claims,
            expires_delta=ADMIN_REFRESH_EXPIRES_DELTA,
        ),
        access_expires_in_seconds=ADMIN_ACCESS_EXPIRES_IN_SECONDS,
        refresh_expires_in_seconds=ADMIN_REFRESH_EXPIRES_IN_SECONDS,
    )

async def read_current_admin(current_admin: AdminPrincipal = Depends(get_current_admin)) -> AdminPrincipal:
    return current_admin
