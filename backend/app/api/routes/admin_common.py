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
logger = logging.getLogger(__name__)

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

ADMIN_ACCESS_EXPIRES_DELTA = timedelta(days=30)

ADMIN_REFRESH_EXPIRES_DELTA = timedelta(days=90)

ADMIN_ACCESS_EXPIRES_IN_SECONDS = int(ADMIN_ACCESS_EXPIRES_DELTA.total_seconds())

ADMIN_REFRESH_EXPIRES_IN_SECONDS = int(ADMIN_REFRESH_EXPIRES_DELTA.total_seconds())

COMPLETED_ATTEMPT_STATUSES = (ModelAttemptStatus.COMPLETED, ModelAttemptStatusEnum.AUTO_SUBMITTED)

ADMIN_OTP_SUCCESS_MESSAGE = "🎉 Successfully logged in!"

ADMIN_OTP_EXPIRED_MESSAGE = "❌ Admin code expired."

ADMIN_PASSWORD_RESET_GENERIC_MESSAGE = (
    "If this phone number is linked to an admin account, the Telegram bot will send a reset link."
)

ADMIN_PASSWORD_RESET_REPLACED_MESSAGE = "❌ Admin password reset request was replaced by a newer request."

ADMIN_OTP_EXPIRY_SWEEP_INTERVAL_SECONDS = 10

_admin_otp_expiry_sweeper_task: asyncio.Task | None = None

def _request_ip_address(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        forwarded_ip = forwarded_for.split(",", 1)[0].strip()
        if forwarded_ip:
            return forwarded_ip

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host
    return "unknown"

def _test_type_value(value: object) -> str:
    return str(getattr(value, "value", value) or "").lower()

def _enqueue_test_explanations(test_id: UUID, test_type: object) -> None:
    type_value = _test_type_value(test_type)
    if type_value not in {"reading", "listening"}:
        return
    try:
        generate_test_explanations_task.delay(str(test_id), type_value)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to enqueue explanation generation for test %s: %s", test_id, exc)

def _format_percent(numerator: int | float, denominator: int | float) -> str:
    if not denominator:
        return "0%"
    return f"{(float(numerator) / float(denominator) * 100):.1f}%"

def _admin_account_read(admin: Admin) -> AdminUserRead:
    return AdminUserRead(
        id=admin.id,
        telegram_id=admin.telegram_id or 0,
        first_name=admin.username,
        last_name=None,
        username=admin.username,
        email=admin.email,
        phone_number=admin.phone_number,
        role=admin.role.value,
        is_premium=False,
        show_on_leaderboard=True,
        is_active=admin.is_active,
    )

def _serialize_promo_code(promo_code: PromoCode) -> AdminPromoCodeRead:
    return AdminPromoCodeRead(
        id=promo_code.id,
        code=promo_code.code,
        discount_percent=promo_code.discount_percent,
        max_uses=promo_code.max_uses,
        current_uses=promo_code.used_count,
        is_active=promo_code.is_active,
        expires_at=promo_code.valid_until,
    )

def _serialize_audit_log(entry: AuditLog) -> AdminAuditLogRead:
    return AdminAuditLogRead(
        id=entry.id,
        admin_id=entry.admin_id,
        action=entry.action,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        changes=entry.changes or {},
        created_at=entry.created_at,
    )

async def _write_audit_log(
    session: AsyncSession,
    *,
    admin_id: UUID,
    action: str,
    target_type: str,
    target_id: str | UUID,
    changes: dict[str, object],
) -> None:
    session.add(
        AuditLog(
            admin_id=admin_id,
            action=action,
            entity_type=target_type,
            entity_id=UUID(str(target_id)),
            changes=changes,
        )
    )

def _resolve_user_display_name(user: User | None) -> str | None:
    if user is None:
        return None
    parts = [part.strip() for part in [user.first_name, user.last_name] if part and part.strip()]
    return " ".join(parts) if parts else None

__all__ = [name for name in globals() if not name.startswith('__')]
