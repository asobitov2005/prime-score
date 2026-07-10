from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.speaking import SpeakingTest, SpeakingTopic
from app.schemas.common import DebugPrincipal
from app.schemas.speaking import (
    SpeakingTestListResponse,
    SpeakingTopicListResponse,
)
from app.services.speaking_catalog import serialize_test, serialize_topic

router = APIRouter()


@router.get("/tests", response_model=SpeakingTestListResponse)
async def list_published_speaking_tests(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingTestListResponse:
    _ = current_user
    statement = (
        select(SpeakingTest)
        .where(SpeakingTest.status == "published")
        .order_by(SpeakingTest.created_at.desc())
    )
    total = await session.scalar(
        select(func.count())
        .select_from(SpeakingTest)
        .where(SpeakingTest.status == "published")
    ) or 0
    rows = (await session.scalars(statement)).all()
    return SpeakingTestListResponse(
        items=[serialize_test(row) for row in rows],
        total=int(total),
    )


@router.get("/topics", response_model=SpeakingTopicListResponse)
async def list_speaking_topics(
    part_number: int | None = None,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> SpeakingTopicListResponse:
    _ = current_user
    statement = (
        select(SpeakingTopic)
        .where(SpeakingTopic.active.is_(True))
        .order_by(
            SpeakingTopic.seed_rank.asc(),
            SpeakingTopic.created_at.desc(),
        )
    )
    count_statement = (
        select(func.count())
        .select_from(SpeakingTopic)
        .where(SpeakingTopic.active.is_(True))
    )
    if part_number is not None:
        statement = statement.where(SpeakingTopic.part_number == part_number)
        count_statement = count_statement.where(
            SpeakingTopic.part_number == part_number
        )
    rows = (await session.scalars(statement.limit(80))).all()
    total = await session.scalar(count_statement) or 0
    return SpeakingTopicListResponse(
        items=[serialize_topic(row) for row in rows],
        total=int(total),
    )
