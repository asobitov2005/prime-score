from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.enums import AttemptStatus, TestType
from app.db.session import get_db_session
from app.schemas.common import DebugPrincipal, MessageResponse
from app.schemas.me import (
    FavoriteTestRead,
    MeActivityPointRead,
    MeAttemptSummaryRead,
    MeProfileRead,
    MeProfileUpdateRequest,
    MeStatsRead,
)
from app.services.attempt_repo import iter_user_attempts_from_db
from app.services.runtime_store import iter_user_attempts

router = APIRouter()


def _profile_from_principal(principal: DebugPrincipal) -> MeProfileRead:
    return MeProfileRead(
        id=principal.id,
        first_name=principal.first_name,
        last_name=principal.last_name,
        username=principal.username,
        role=principal.role,
        is_premium=principal.is_premium,
        show_on_leaderboard=principal.show_on_leaderboard,
        telegram_id=principal.telegram_id,
    )


@router.get("", response_model=MeProfileRead)
async def get_me(current_user: DebugPrincipal = Depends(get_current_user)) -> MeProfileRead:
    return _profile_from_principal(current_user)


@router.patch("", response_model=MeProfileRead)
async def update_me(
    payload: MeProfileUpdateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
) -> MeProfileRead:
    data = _profile_from_principal(current_user).model_dump()
    updates = payload.model_dump(exclude_unset=True)
    data.update(updates)
    return MeProfileRead(**data)


async def _load_attempts(current_user: DebugPrincipal, session: AsyncSession):
    try:
        attempts = await iter_user_attempts_from_db(session, user_id=current_user.id)
        if attempts:
            return attempts
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
    return iter_user_attempts(current_user.id)


@router.get("/stats", response_model=MeStatsRead)
async def get_stats(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeStatsRead:
    attempts = await _load_attempts(current_user, session)
    completed = [attempt for attempt in attempts if attempt.status == AttemptStatus.completed]
    banded = [attempt.band_score for attempt in completed if attempt.band_score is not None]
    reading_bands = [
        attempt.band_score
        for attempt in completed
        if attempt.band_score is not None and attempt.test_snapshot.get("test_type") == TestType.reading
    ]
    listening_bands = [
        attempt.band_score
        for attempt in completed
        if attempt.band_score is not None and attempt.test_snapshot.get("test_type") == TestType.listening
    ]
    average_band = (
        sum(banded, start=banded[0].__class__("0")) / len(banded)
        if banded
        else None
    )
    return MeStatsRead(
        attempts_total=len(attempts),
        average_band=average_band,
        reading_band=max(reading_bands) if reading_bands else None,
        listening_band=max(listening_bands) if listening_bands else None,
        leaderboard_rank=3 if current_user.show_on_leaderboard else None,
        active_sessions=2,
    )


@router.get("/activity", response_model=list[MeActivityPointRead])
async def get_activity(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MeActivityPointRead]:
    attempts = await _load_attempts(current_user, session)
    grouped: dict[object, dict[str, int]] = {}
    for attempt in attempts:
        key = attempt.started_at.date()
        entry = grouped.setdefault(key, {"attempts_count": 0, "time_spent_sec": 0})
        entry["attempts_count"] += 1
        entry["time_spent_sec"] += attempt.time_spent_sec
    return [
        MeActivityPointRead(activity_date=activity_date, **values)
        for activity_date, values in sorted(grouped.items(), reverse=True)
    ]


@router.get("/attempts", response_model=list[MeAttemptSummaryRead])
async def get_attempts(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MeAttemptSummaryRead]:
    attempts = await _load_attempts(current_user, session)
    items: list[MeAttemptSummaryRead] = []
    for attempt in attempts:
        snapshot = attempt.test_snapshot
        items.append(
            MeAttemptSummaryRead(
                attempt_id=attempt.attempt_id,
                test_id=attempt.test_id,
                test_title=str(snapshot.get("title", "Untitled")),
                test_type=snapshot.get("test_type"),
                mode=attempt.mode,
                status=attempt.status,
                access_type=snapshot.get("access_type"),
                raw_score=attempt.raw_score,
                band_score=attempt.band_score,
                started_at=attempt.started_at,
            )
        )
    return items


@router.get("/favorites", response_model=list[FavoriteTestRead])
async def get_favorites(current_user: DebugPrincipal = Depends(get_current_user)) -> list[FavoriteTestRead]:
    _ = current_user
    return []


@router.post("/favorites/{test_id}", response_model=MessageResponse)
async def add_favorite(test_id: UUID, current_user: DebugPrincipal = Depends(get_current_user)) -> MessageResponse:
    _ = (test_id, current_user)
    return MessageResponse(message="Favorite added.")


@router.delete("/favorites/{test_id}", response_model=MessageResponse)
async def remove_favorite(test_id: UUID, current_user: DebugPrincipal = Depends(get_current_user)) -> MessageResponse:
    _ = (test_id, current_user)
    return MessageResponse(message="Favorite removed.")
