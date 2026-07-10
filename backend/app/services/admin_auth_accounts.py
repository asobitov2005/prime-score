from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.core.security import hash_password, verify_password
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.models.user import User
from app.schemas.common import AdminPrincipal
from app.services.admin_auth_shared import AdminOtpFailure, normalize_login, normalize_phone_number


def build_admin_principal(admin: Admin) -> AdminPrincipal:
    return AdminPrincipal(
        id=admin.id,
        username=admin.username,
        email=admin.email,
        phone_number=admin.phone_number,
        telegram_id=admin.telegram_id,
        auth_version=admin.auth_version or 1,
        role=UserRole(admin.role.value),
        is_active=admin.is_active,
    )


async def get_admin_by_login(session: AsyncSession, login: str) -> Admin | None:
    normalized_login = normalize_login(login)
    query = select(Admin).where(
        or_(
            func.lower(Admin.username) == normalized_login,
            func.lower(Admin.email) == normalized_login,
        )
    )
    return (await session.scalars(query)).first()


async def get_admin_by_phone_number(session: AsyncSession, phone_number: str) -> Admin | None:
    normalized_phone = normalize_phone_number(phone_number)
    return await session.scalar(select(Admin).where(Admin.phone_number == normalized_phone))


async def authenticate_admin(session: AsyncSession, login: str, password: str) -> Admin | None:
    admin = await get_admin_by_login(session, login)
    if admin is None or not admin.is_active:
        return None
    if not verify_password(password, admin.password_hash):
        return None
    admin.last_login_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(admin)
    return admin


async def authenticate_admin_by_phone_number(
    session: AsyncSession,
    phone_number: str,
    password: str,
) -> Admin | None:
    admin = await get_admin_by_phone_number(session, phone_number)
    if admin is None or not admin.is_active:
        return None
    if not verify_password(password, admin.password_hash):
        return None
    return admin


async def get_admin_by_id(session: AsyncSession, admin_id: UUID) -> Admin | None:
    return await session.get(Admin, admin_id)


async def update_admin_security_settings(
    session: AsyncSession,
    *,
    admin_id: UUID,
    current_password: str,
    phone_number: str | None = None,
    new_password: str | None = None,
) -> Admin:
    admin = await session.get(Admin, admin_id)
    if admin is None or not admin.is_active:
        raise AdminOtpFailure("admin_unavailable")
    if not verify_password(current_password, admin.password_hash):
        raise AdminOtpFailure("invalid_current_password")

    changed = False
    if phone_number is not None:
        normalized_phone = normalize_phone_number(phone_number)
        if admin.phone_number != normalized_phone:
            linked_user = await session.scalar(select(User).where(User.phone == normalized_phone))
            if linked_user is None or linked_user.telegram_id is None:
                raise AdminOtpFailure("phone_not_linked")
            duplicate_admin = await session.scalar(
                select(Admin).where(
                    Admin.id != admin.id,
                    or_(
                        Admin.phone_number == normalized_phone,
                        Admin.telegram_id == linked_user.telegram_id,
                    ),
                )
            )
            if duplicate_admin is not None:
                raise AdminOtpFailure("phone_already_used")
            admin.phone_number = normalized_phone
            admin.telegram_id = linked_user.telegram_id
            changed = True

    if new_password:
        if len(new_password) < 8:
            raise AdminOtpFailure("weak_password")
        admin.password_hash = hash_password(new_password)
        changed = True

    if changed:
        await session.commit()
        await session.refresh(admin)
    return admin


async def create_admin_account(
    session: AsyncSession,
    *,
    username: str,
    email: str,
    phone_number: str,
    telegram_id: int,
    password: str,
    role: AdminRole,
) -> Admin:
    normalized_username = username.strip()
    normalized_email = email.strip().lower()
    normalized_phone = normalize_phone_number(phone_number)

    existing = await session.scalar(
        select(Admin).where(
            or_(
                func.lower(Admin.username) == normalized_username.lower(),
                func.lower(Admin.email) == normalized_email,
                Admin.phone_number == normalized_phone,
                Admin.telegram_id == telegram_id,
            )
        )
    )
    if existing is not None:
        raise ValueError(
            "Admin with the same username, email, phone number, or Telegram account already exists."
        )

    admin = Admin(
        username=normalized_username,
        email=normalized_email,
        phone_number=normalized_phone,
        telegram_id=telegram_id,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    return admin
