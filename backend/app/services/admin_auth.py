from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.core.security import hash_password, verify_password
from app.models.admin import Admin
from app.models.enums import AdminRole
from app.schemas.common import AdminPrincipal


def _normalize_login(value: str) -> str:
    return value.strip().lower()


def build_admin_principal(admin: Admin) -> AdminPrincipal:
    return AdminPrincipal(
        id=admin.id,
        username=admin.username,
        email=admin.email,
        role=UserRole(admin.role.value),
        is_active=admin.is_active,
    )


async def get_admin_by_login(session: AsyncSession, login: str) -> Admin | None:
    normalized_login = _normalize_login(login)
    query = select(Admin).where(
        or_(
            func.lower(Admin.username) == normalized_login,
            func.lower(Admin.email) == normalized_login,
        )
    )
    return (await session.scalars(query)).first()


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


async def get_admin_by_id(session: AsyncSession, admin_id: UUID) -> Admin | None:
    return await session.get(Admin, admin_id)


async def create_admin_account(
    session: AsyncSession,
    *,
    username: str,
    email: str,
    password: str,
    role: AdminRole,
) -> Admin:
    normalized_username = username.strip()
    normalized_email = email.strip().lower()

    existing = await session.scalar(
        select(Admin).where(
            or_(
                func.lower(Admin.username) == normalized_username.lower(),
                func.lower(Admin.email) == normalized_email,
            )
        )
    )
    if existing is not None:
        raise ValueError("Admin with the same username or email already exists.")

    admin = Admin(
        username=normalized_username,
        email=normalized_email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    return admin
