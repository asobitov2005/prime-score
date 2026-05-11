from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.speaking import SpeakingSession, SpeakingTest
from app.schemas.common import DebugPrincipal
from app.schemas.speaking import (
    SpeakingHistoryItem,
    SpeakingHistoryResponse,
    SpeakingSessionCreateRequest,
    SpeakingSessionCreateResponse,
    SpeakingTestListItem,
    SpeakingTestListResponse,
)


router = APIRouter()


def _serialize_test(row: object) -> SpeakingTestListItem:
    return SpeakingTestListItem(
        id=row.id,
        title=row.title,
        slug=row.slug,
        status=row.status,
        access_type=row.access_type,
        mode_kind=row.mode_kind,
        source=getattr(row, "source", None),
        source_detail=getattr(row, "source_detail", None),
        description=getattr(row, "description", None),
        estimated_minutes=int(getattr(row, "estimated_minutes", 14) or 14),
        version=int(getattr(row, "version", 1) or 1),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/tests", response_model=SpeakingTestListResponse)
async def list_published_speaking_tests(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingTestListResponse:
    _ = current_user
    statement = select(SpeakingTest).where(SpeakingTest.status == "published").order_by(SpeakingTest.created_at.desc())
    total = await session.scalar(select(func.count()).select_from(SpeakingTest).where(SpeakingTest.status == "published")) or 0
    rows = (await session.scalars(statement)).all()
    return SpeakingTestListResponse(items=[_serialize_test(row) for row in rows], total=int(total))


@router.post("/sessions", response_model=SpeakingSessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_speaking_session(
    payload: SpeakingSessionCreateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingSessionCreateResponse:
    test = await session.get(SpeakingTest, payload.speaking_test_id)
    if test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaking test not found.")

    speaking_session = SpeakingSession(
        user_id=current_user.id,
        speaking_test_id=payload.speaking_test_id,
        status="queued",
        entry_mode=payload.entry_mode,
        current_part=None if payload.entry_mode == "full" else int(payload.entry_mode.rsplit("_", 1)[1]),
        live_provider="gemini_api",
        live_model_code="gemini-2.5-flash-native-audio-preview-12-2025",
        session_metadata={},
    )
    session.add(speaking_session)
    await session.commit()
    await session.refresh(speaking_session)
    return SpeakingSessionCreateResponse(
        session_id=speaking_session.id,
        speaking_test_id=speaking_session.speaking_test_id,
        entry_mode=speaking_session.entry_mode,
        status=speaking_session.status,
    )


@router.get("/sessions/history", response_model=SpeakingHistoryResponse)
async def list_speaking_history(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingHistoryResponse:
    rows = (
        await session.scalars(
            select(SpeakingSession)
            .where(SpeakingSession.user_id == current_user.id)
            .order_by(SpeakingSession.created_at.desc())
        )
    ).all()
    items: list[SpeakingHistoryItem] = []
    for row in rows:
        items.append(
            SpeakingHistoryItem(
                session_id=row.id,
                speaking_test_id=row.speaking_test_id,
                title=getattr(row, "speaking_test_title", "Speaking Session"),
                entry_mode=row.entry_mode,
                status=row.status,
                source=getattr(row, "speaking_test_source", None),
                source_detail=getattr(row, "speaking_test_source_detail", None),
                overall_band=getattr(row, "overall_band", None),
                time_spent_sec=getattr(row, "time_spent_sec", None),
                started_at=getattr(row, "started_at", None),
                ended_at=getattr(row, "ended_at", None),
                graded_at=getattr(row, "graded_at", None),
            )
        )
    return SpeakingHistoryResponse(items=items)
