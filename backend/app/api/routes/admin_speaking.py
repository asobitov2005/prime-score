from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.speaking import SpeakingTopic
from app.schemas.common import AdminPrincipal
from app.schemas.speaking import (
    AdminSpeakingTopicCreateRequest,
    AdminSpeakingTopicListResponse,
    AdminSpeakingTopicRead,
)


router = APIRouter()


def _serialize_topic(row: object) -> AdminSpeakingTopicRead:
    return AdminSpeakingTopicRead(
        id=row.id,
        part_number=row.part_number,
        topic_title=row.topic_title,
        prompt_text=row.prompt_text,
        bullet_points=list(getattr(row, "bullet_points", []) or []),
        followup_group_key=getattr(row, "followup_group_key", None),
        difficulty_label=getattr(row, "difficulty_label", None),
        category_tags=list(getattr(row, "category_tags", []) or []),
        source_kind=getattr(row, "source_kind", "custom"),
        source_note=getattr(row, "source_note", None),
        active=bool(getattr(row, "active", True)),
        seed_rank=int(getattr(row, "seed_rank", 0) or 0),
        metadata=dict(
            getattr(row, "topic_metadata", None)
            or getattr(row, "metadata", None)
            or {}
        ),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/topics", response_model=AdminSpeakingTopicListResponse)
async def list_speaking_topics(
    part_number: int | None = Query(default=None, ge=1, le=3),
    category: str | None = Query(default=None),
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminSpeakingTopicListResponse:
    _ = current_admin
    statement = select(SpeakingTopic).order_by(SpeakingTopic.seed_rank.asc(), SpeakingTopic.created_at.desc())
    count_statement = select(func.count()).select_from(SpeakingTopic)

    if part_number is not None:
        statement = statement.where(SpeakingTopic.part_number == part_number)
        count_statement = count_statement.where(SpeakingTopic.part_number == part_number)
    if category:
        statement = statement.where(SpeakingTopic.category_tags.contains([category]))
        count_statement = count_statement.where(SpeakingTopic.category_tags.contains([category]))

    total = await session.scalar(count_statement) or 0
    rows = (await session.scalars(statement)).all()
    return AdminSpeakingTopicListResponse(
        items=[_serialize_topic(row) for row in rows],
        total=int(total),
    )


@router.post("/topics", response_model=AdminSpeakingTopicRead, status_code=status.HTTP_201_CREATED)
async def create_speaking_topic(
    payload: AdminSpeakingTopicCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminSpeakingTopicRead:
    _ = current_admin
    data = payload.model_dump()
    topic = SpeakingTopic(
        part_number=data["part_number"],
        topic_title=data["topic_title"],
        prompt_text=data["prompt_text"],
        bullet_points=data["bullet_points"],
        followup_group_key=data["followup_group_key"],
        difficulty_label=data["difficulty_label"],
        category_tags=data["category_tags"],
        source_kind=data["source_kind"],
        source_note=data["source_note"],
        active=data["active"],
        seed_rank=data["seed_rank"],
        topic_metadata=data["metadata"],
    )
    session.add(topic)
    await session.commit()
    await session.refresh(topic)
    return _serialize_topic(topic)
