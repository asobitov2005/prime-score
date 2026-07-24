from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.leaderboard_dependencies import *
from app.api.routes.leaderboard_part_01 import PUBLIC_PERIOD_MAP, _display_name, _sort_key

router = APIRouter()

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

_LEADERBOARD_CACHE_TTL = 45

def _leaderboard_cache_redis() -> aioredis.Redis:
    return aioredis.from_url(get_settings().redis_url, decode_responses=True)

async def _cached_board_entries(
    session: AsyncSession, *, period_type: str
) -> list[LeaderboardEntryRead]:
    """Ranked leaderboard board, cached in Redis for a short window.

    The board is identical for every user, so the expensive full-table
    aggregation in ``leaderboard_rows`` runs at most once per
    ``_LEADERBOARD_CACHE_TTL``; callers personalise (``is_current_user``) on
    top of the returned entries. Any Redis error degrades to a live compute.
    """
    cache_key = f"leaderboard:board:v1:{period_type}"
    client = _leaderboard_cache_redis()

    try:
        cached = await client.get(cache_key)
    except Exception:
        cached = None
    if cached is not None:
        try:
            return [LeaderboardEntryRead.model_validate(item) for item in json.loads(cached)]
        except Exception:
            pass  # corrupt/incompatible cache → fall through and recompute

    rows = await leaderboard_rows(session, period_type=period_type)
    sorted_rows = sorted(rows, key=_sort_key, reverse=True)
    entries = [
        _serialize_row(row=row, user=user, rank=index, is_current_user=False)
        for index, (row, user) in enumerate(sorted_rows, start=1)
    ]

    try:
        await client.set(
            cache_key,
            json.dumps([entry.model_dump(mode="json") for entry in entries]),
            ex=_LEADERBOARD_CACHE_TTL,
        )
    except Exception:
        pass
    return entries

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

    entries = await _cached_board_entries(session, period_type=internal_period)

    visible_items: list[LeaderboardEntryRead] = []
    current_user_entry: LeaderboardEntryRead | None = None

    for entry in entries:
        if entry.user_id == current_user.id:
            entry = entry.model_copy(update={"is_current_user": True})
            current_user_entry = entry
        if entry.show_on_leaderboard:
            visible_items.append(entry)

    if current_user_entry is None:
        user = await session.get(User, current_user.id)
        if user is not None:
            fallback_rank = len(entries) + 1
            period_xp = (
                int(user.total_xp or 0)
                if internal_period == PERIOD_ALL_TIME
                else await get_user_period_xp(session, user_id=user.id, period_type=internal_period)
            )
            current_user_entry = LeaderboardEntryRead(
                rank=fallback_rank,
                user_id=user.id,
                avatar_url=user.avatar_url,
                display_name=_display_name(user),
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
