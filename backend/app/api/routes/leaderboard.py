from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.common import DebugPrincipal
from app.schemas.leaderboard import LeaderboardEntryRead, LeaderboardResponse
from app.services.xp import (
    PERIOD_ALL_TIME,
    PERIOD_MONTHLY,
    PERIOD_WEEKLY,
    badge_for_user,
    get_user_period_xp,
    leaderboard_rows,
)

router = APIRouter()

PUBLIC_PERIOD_MAP = {
    "week": PERIOD_WEEKLY,
    "month": PERIOD_MONTHLY,
    "all_time": PERIOD_ALL_TIME,
}


def _display_name(user: User) -> str:
    full_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip()
    if full_name:
        return full_name
    if user.username:
        return user.username
    return "Anonymous Candidate"


def _sort_key(item: tuple[object, User]) -> tuple[float, int, float, int, float]:
    entry, user = item
    achieved_at = getattr(entry, "achieved_at", None)
    achieved_rank = achieved_at.timestamp() if achieved_at is not None else float("inf")
    return (
        float(getattr(entry, "xp_total", 0) or 0),
        int(getattr(user, "current_streak", 0) or 0),
        float(getattr(entry, "average_score", 0.0) or 0.0),
        int(getattr(entry, "full_mock_completions", 0) or 0),
        -achieved_rank,
    )


def _serialize_row(
    *,
    row,
    user: User,
    rank: int,
    is_current_user: bool,
) -> LeaderboardEntryRead:
    return LeaderboardEntryRead(
        rank=rank,
        user_id=user.id,
        avatar_url=user.avatar_url,
        display_name=_display_name(user),
        level=int(user.current_level or 1),
        xp=int(row.xp_total or 0),
        current_streak=int(user.current_streak or 0),
        badge=badge_for_user(
            level=int(user.current_level or 1),
            current_streak=int(user.current_streak or 0),
            full_mock_completions=int(row.full_mock_completions or 0),
        ),
        average_score=round(float(row.average_score), 2) if row.average_score is not None else None,
        full_mock_completions=int(row.full_mock_completions or 0),
        achieved_at=row.achieved_at,
        is_current_user=is_current_user,
        show_on_leaderboard=bool(user.show_on_leaderboard),
    )


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    period: str = Query(default="all_time"),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    type: str | None = Query(default=None),
) -> LeaderboardResponse:
    _ = type
    internal_period = PUBLIC_PERIOD_MAP.get(period)
    if internal_period is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported leaderboard period.")

    rows = await leaderboard_rows(session, period_type=internal_period)
    sorted_rows = sorted(rows, key=_sort_key, reverse=True)

    visible_items: list[LeaderboardEntryRead] = []
    current_user_entry: LeaderboardEntryRead | None = None

    for index, (row, user) in enumerate(sorted_rows, start=1):
        entry = _serialize_row(
            row=row,
            user=user,
            rank=index,
            is_current_user=user.id == current_user.id,
        )
        if user.id == current_user.id:
            current_user_entry = entry
        if bool(user.show_on_leaderboard) and user.id != current_user.id:
            visible_items.append(entry)

    if current_user_entry is None:
        user = await session.get(User, current_user.id)
        if user is not None:
            period_xp = (
                int(user.total_xp or 0)
                if internal_period == PERIOD_ALL_TIME
                else await get_user_period_xp(session, user_id=user.id, period_type=internal_period)
            )
            current_user_entry = LeaderboardEntryRead(
                rank=0,
                user_id=user.id,
                avatar_url=user.avatar_url,
                display_name="You",
                level=int(user.current_level or 1),
                xp=period_xp,
                current_streak=int(user.current_streak or 0),
                badge=badge_for_user(
                    level=int(user.current_level or 1),
                    current_streak=int(user.current_streak or 0),
                    full_mock_completions=0,
                ),
                average_score=None,
                full_mock_completions=0,
                achieved_at=None,
                is_current_user=True,
                show_on_leaderboard=bool(user.show_on_leaderboard),
            )

    return LeaderboardResponse(
        period=period,
        generated_at=datetime.now(UTC),
        items=visible_items,
        current_user=current_user_entry,
    )
