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
def _build_admin_token_claims(admin: AdminPrincipal) -> dict[str, object]:
    return {
        "scope": "admin",
        "role": admin.role.value,
        "username": admin.username,
        "email": admin.email,
        "auth_version": admin.auth_version,
    }

async def _edit_admin_otp_message_by_ids(chat_id: int, message_id: int | None, text: str) -> bool:
    if not message_id:
        return True
    try:
        return await edit_telegram_message(
            chat_id=chat_id,
            message_id=message_id,
            text=text,
        )
    except Exception as exc:
        logger.debug("Admin OTP Telegram edit skipped for message %s: %s", message_id, exc)
        return False

async def _edit_admin_otp_message(challenge: AdminLoginOtp, text: str) -> bool:
    return await _edit_admin_otp_message_by_ids(
        chat_id=challenge.telegram_id,
        message_id=challenge.telegram_message_id,
        text=text,
    )

async def _delete_admin_telegram_message_by_ids(chat_id: int, message_id: int | None) -> bool:
    if not message_id:
        return True
    try:
        return await delete_telegram_message(
            chat_id=chat_id,
            message_id=message_id,
        )
    except Exception as exc:
        logger.debug("Admin Telegram delete skipped for message %s: %s", message_id, exc)
        return False

async def _expire_stale_admin_otp_messages(session: AsyncSession, *, now: datetime | None = None) -> int:
    current_time = now or datetime.now(UTC)
    expired_rows = (
        await session.execute(
            select(AdminLoginOtp.id, AdminLoginOtp.telegram_id, AdminLoginOtp.telegram_message_id)
            .where(
                AdminLoginOtp.purpose == ADMIN_LOGIN_OTP_PURPOSE,
                AdminLoginOtp.used_at.is_(None),
                AdminLoginOtp.expires_at <= current_time,
            )
        )
    ).all()
    expired_ids: list[UUID] = []
    for challenge_id, telegram_id, message_id in expired_rows:
        message_closed = True
        if message_id is not None:
            message_closed = await _edit_admin_otp_message_by_ids(
                int(telegram_id),
                int(message_id),
                ADMIN_OTP_EXPIRED_MESSAGE,
            )
        if message_closed:
            expired_ids.append(UUID(str(challenge_id)))

    if expired_ids:
        await session.execute(
            update(AdminLoginOtp)
            .where(AdminLoginOtp.id.in_(expired_ids), AdminLoginOtp.used_at.is_(None))
            .values(used_at=current_time)
        )
        await session.commit()

    return len(expired_rows)

async def _delete_expired_admin_password_reset_messages(session: AsyncSession, *, now: datetime | None = None) -> int:
    current_time = now or datetime.now(UTC)
    expired_rows = (
        await session.execute(
            select(AdminLoginOtp.id, AdminLoginOtp.telegram_id, AdminLoginOtp.telegram_message_id)
            .where(
                AdminLoginOtp.purpose == ADMIN_PASSWORD_RESET_PURPOSE,
                AdminLoginOtp.expires_at <= current_time,
                AdminLoginOtp.telegram_message_id.is_not(None),
            )
        )
    ).all()
    deleted_ids: list[UUID] = []
    for challenge_id, telegram_id, message_id in expired_rows:
        message_deleted = await _delete_admin_telegram_message_by_ids(
            int(telegram_id),
            int(message_id) if message_id is not None else None,
        )
        if message_deleted:
            deleted_ids.append(UUID(str(challenge_id)))

    if deleted_ids:
        await session.execute(
            update(AdminLoginOtp)
            .where(AdminLoginOtp.id.in_(deleted_ids), AdminLoginOtp.used_at.is_(None))
            .values(used_at=current_time)
        )
        await session.execute(
            update(AdminLoginOtp)
            .where(AdminLoginOtp.id.in_(deleted_ids))
            .values(telegram_message_id=None)
        )
        await session.commit()

    return len(deleted_ids)

async def _send_admin_otp_expiry_notice(challenge_id: UUID) -> None:
    delay = ADMIN_LOGIN_OTP_TTL_SECONDS
    while delay > 0:
        await asyncio.sleep(delay)
        delay = 0
        session_maker = get_session_maker()
        async with session_maker() as session:
            challenge = await session.get(AdminLoginOtp, challenge_id)
            if challenge is None or challenge.used_at is not None:
                return

            now = datetime.now(UTC)
            if challenge.expires_at > now:
                delay = min(
                    ADMIN_LOGIN_OTP_TTL_SECONDS,
                    max(0.0, (challenge.expires_at - now).total_seconds()),
                )
                continue

            await _expire_stale_admin_otp_messages(session, now=now)
            await _delete_expired_admin_password_reset_messages(session, now=now)
            return

def _schedule_admin_otp_expiry_notice(challenge_id: UUID) -> None:
    try:
        asyncio.create_task(_send_admin_otp_expiry_notice(challenge_id))
    except RuntimeError as exc:
        logger.debug("Admin OTP expiry task was not scheduled for %s: %s", challenge_id, exc)

async def _run_admin_otp_expiry_sweeper() -> None:
    while True:
        try:
            session_maker = get_session_maker()
            async with session_maker() as session:
                await _expire_stale_admin_otp_messages(session)
                await _delete_expired_admin_password_reset_messages(session)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Admin OTP expiry sweeper failed")

        await asyncio.sleep(ADMIN_OTP_EXPIRY_SWEEP_INTERVAL_SECONDS)

def start_admin_otp_expiry_sweeper() -> None:
    global _admin_otp_expiry_sweeper_task
    if _admin_otp_expiry_sweeper_task is not None and not _admin_otp_expiry_sweeper_task.done():
        return
    try:
        _admin_otp_expiry_sweeper_task = asyncio.create_task(_run_admin_otp_expiry_sweeper())
    except RuntimeError as exc:
        logger.debug("Admin OTP expiry sweeper was not scheduled: %s", exc)

__all__ = [name for name in globals() if not name.startswith('__')]
