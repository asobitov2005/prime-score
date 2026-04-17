from __future__ import annotations

from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.core.security import decode_token
from app.db.session import get_async_session
from app.schemas.common import AdminPrincipal, DebugPrincipal
from app.services.admin_auth import build_admin_principal, get_admin_by_id


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


async def get_current_user(
    x_debug_user_id: str | None = Header(default=None, alias="X-Debug-User-Id"),
    x_debug_first_name: str = Header(default="Prime", alias="X-Debug-First-Name"),
    x_debug_last_name: str | None = Header(default=None, alias="X-Debug-Last-Name"),
    x_debug_username: str | None = Header(default=None, alias="X-Debug-Username"),
    x_debug_role: str = Header(default="user", alias="X-Debug-Role"),
    x_debug_is_premium: str | None = Header(default=None, alias="X-Debug-Is-Premium"),
    x_debug_show_on_leaderboard: str | None = Header(
        default=None, alias="X-Debug-Show-On-Leaderboard"
    ),
) -> DebugPrincipal:
    if not x_debug_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication headers are required.",
        )

    try:
        user_id = UUID(x_debug_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id.") from exc

    try:
        role = UserRole(x_debug_role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role.") from exc

    return DebugPrincipal(
        id=user_id,
        first_name=x_debug_first_name,
        last_name=x_debug_last_name,
        username=x_debug_username,
        role=role,
        is_premium=_parse_bool(x_debug_is_premium, default=False),
        show_on_leaderboard=_parse_bool(x_debug_show_on_leaderboard, default=True),
    )


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is required.",
        )
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is required.",
        )
    return token


async def get_current_admin(
    authorization: str | None = Header(default=None, alias="Authorization"),
    session: AsyncSession = Depends(get_async_session),
) -> AdminPrincipal:
    token = _extract_bearer_token(authorization)
    try:
        payload = decode_token(token)
        admin_id = UUID(str(payload["sub"]))
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin access token.",
        ) from exc

    if payload.get("scope") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token scope.",
        )

    admin = await get_admin_by_id(session, admin_id)
    if admin is None or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin account is not available.",
        )
    return build_admin_principal(admin)


async def get_current_super_admin(
    current_user: AdminPrincipal = Depends(get_current_admin),
) -> AdminPrincipal:
    if current_user.role != UserRole.super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required.",
        )
    return current_user


__all__ = ["get_async_session", "get_current_user", "get_current_admin", "get_current_super_admin"]
