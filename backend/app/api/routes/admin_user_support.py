from __future__ import annotations

# Generated from the former monolithic admin router. Keep imports centralized
# while domain modules are gradually tightened to explicit dependencies.
# ruff: noqa: F401,F403,F405
from app.api.routes.admin_dependencies import *
from app.api.routes.admin_contracts import *
from app.api.routes.admin_common import *
from app.api.routes.admin_commerce_support import *
from app.api.routes.admin_auth_support import *
# Circular star-imports can leave this unbound at runtime; bind explicitly.
from app.api.routes.admin_contracts import AdminFilterParams, apply_admin_filters

async def _build_admin_user_detail(
    session: AsyncSession,
    user: User,
    params: AdminFilterParams,
) -> AdminUserDetailRead:
    if user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    attempts_total = await session.scalar(
        apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params).where(Attempt.user_id == user.id)
    ) or 0
    attempts_completed = await session.scalar(
        apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params).where(
            Attempt.user_id == user.id,
            Attempt.status.in_([ModelAttemptStatus.COMPLETED, ModelAttemptStatusEnum.AUTO_SUBMITTED]),
        )
    ) or 0
    avg_band_row = await session.scalar(
        select(func.avg(Attempt.band_score)).where(
            Attempt.user_id == user.id,
            Attempt.status.in_([ModelAttemptStatus.COMPLETED, ModelAttemptStatusEnum.AUTO_SUBMITTED]),
            Attempt.band_score.isnot(None),
        )
    )
    return AdminUserDetailRead(
        id=user.id,
        telegram_id=user.telegram_id,
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        phone=user.phone,
        avatar_url=user.avatar_url,
        is_premium=user.is_premium,
        premium_until=user.premium_until.isoformat() if user.premium_until else None,
        show_on_leaderboard=user.show_on_leaderboard,
        bot_contact_at=user.bot_contact_at.isoformat() if user.bot_contact_at else None,
        first_login_at=user.first_login_at.isoformat() if user.first_login_at else None,
        last_active_at=user.last_active_at.isoformat() if user.last_active_at else None,
        created_at=user.created_at.isoformat() if user.created_at else None,
        attempts_total=int(attempts_total),
        attempts_completed=int(attempts_completed),
        average_band=float(avg_band_row) if avg_band_row is not None else None,
    )

async def _get_active_user_or_404(session: AsyncSession, user_id: UUID) -> User:
    user = await session.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user

__all__ = [name for name in globals() if not name.startswith('__')]
