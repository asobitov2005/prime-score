from __future__ import annotations

import re

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.speaking import SpeakingCategory, SpeakingSessionPart, SpeakingTopic, SpeakingTopicQuestionItem
from app.schemas.common import AdminPrincipal
from app.schemas.speaking import (
    AdminSpeakingCategoryCreateRequest,
    AdminSpeakingCategoryListResponse,
    AdminSpeakingCategoryRead,
    AdminSpeakingTopicCreateRequest,
    AdminSpeakingTopicListResponse,
    AdminSpeakingTopicRead,
    AdminSpeakingTopicUpdateRequest,
)


router = APIRouter()


def _slugify_followup_key(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:120] or "part-2-topic"


def _normalize_category_slug(value: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", value.strip().lower())
    slug = re.sub(r"[\s-]+", "_", slug).strip("_")
    return slug[:128] or "category"


async def _category_topic_count(session: AsyncSession, slug: str) -> int:
    count = await session.scalar(
        select(func.count())
        .select_from(SpeakingTopic)
        .where(SpeakingTopic.category_tags.contains([slug]))
    )
    return int(count or 0)


def _serialize_category(row: SpeakingCategory, *, topic_count: int) -> AdminSpeakingCategoryRead:
    return AdminSpeakingCategoryRead(
        slug=row.slug,
        label=row.label,
        scope=row.scope,
        active=bool(row.active),
        topic_count=topic_count,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _resolve_followup_group_key(
    session: AsyncSession,
    *,
    part_number: int,
    topic_title: str,
    followup_group_key: str | None,
    linked_part2_topic_id: object | None,
) -> str | None:
    if part_number == 1:
        return None
    if part_number == 3:
        if linked_part2_topic_id is None:
            raise HTTPException(status_code=400, detail="Part 3 topics must link to a Part 2 topic.")
        part2_topic = await session.get(SpeakingTopic, linked_part2_topic_id)
        if part2_topic is None or part2_topic.part_number != 2:
            raise HTTPException(status_code=400, detail="Selected Part 2 topic was not found.")
        if not part2_topic.followup_group_key:
            raise HTTPException(status_code=400, detail="Selected Part 2 topic is missing a link key.")
        return part2_topic.followup_group_key
    if followup_group_key and followup_group_key.strip():
        return followup_group_key.strip()
    return _slugify_followup_key(topic_title)


def _serialize_topic(row: object) -> AdminSpeakingTopicRead:
    topic_metadata = getattr(row, "topic_metadata", None)
    if not isinstance(topic_metadata, dict):
        topic_metadata = {}

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
        metadata=topic_metadata,
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
    topic_title, prompt_text = _ensure_topic_fields(
        part_number=data["part_number"],
        topic_title=data["topic_title"],
        prompt_text=data["prompt_text"],
    )
    followup_group_key = await _resolve_followup_group_key(
        session,
        part_number=data["part_number"],
        topic_title=topic_title,
        followup_group_key=data["followup_group_key"],
        linked_part2_topic_id=data.get("linked_part2_topic_id"),
    )
    topic = SpeakingTopic(
        part_number=data["part_number"],
        topic_title=topic_title,
        prompt_text=prompt_text,
        bullet_points=data["bullet_points"],
        followup_group_key=followup_group_key,
        difficulty_label=data["difficulty_label"],
        category_tags=[],
        source_kind=data["source_kind"],
        source_note=data["source_note"],
        active=data["active"],
        seed_rank=data["seed_rank"],
        topic_metadata=_apply_topic_metadata(
            {},
            part_number=data["part_number"],
            payload_metadata=data["metadata"],
            icon=data.get("icon"),
            icon_tone=data.get("icon_tone"),
            is_new_topic=data.get("is_new_topic"),
        ),
    )
    session.add(topic)
    await session.commit()
    await session.refresh(topic)
    return _serialize_topic(topic)


def _ensure_topic_fields(
    *,
    part_number: int,
    topic_title: str,
    prompt_text: str,
) -> tuple[str, str]:
    title = topic_title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Topic title is required.")

    if part_number in (1, 3):
        return title, title

    cleaned_prompt = prompt_text.strip()
    if not cleaned_prompt:
        raise HTTPException(status_code=400, detail="Prompt text is required.")
    return title, cleaned_prompt


def _apply_topic_metadata(
    existing: dict | None,
    *,
    part_number: int,
    payload_metadata: dict | None,
    icon: str | None,
    icon_tone: str | None,
    is_new_topic: bool | None,
) -> dict:
    metadata = dict(existing or {})
    if payload_metadata:
        metadata.update(payload_metadata)

    if part_number != 1:
        metadata.pop("icon", None)
        metadata.pop("icon_tone", None)
    else:
        if icon is not None:
            cleaned_icon = icon.strip()
            if cleaned_icon:
                metadata["icon"] = cleaned_icon
            else:
                metadata.pop("icon", None)

        if icon_tone is not None:
            cleaned_tone = icon_tone.strip()
            if cleaned_tone:
                metadata["icon_tone"] = cleaned_tone
            else:
                metadata.pop("icon_tone", None)

    if is_new_topic is not None:
        if is_new_topic:
            metadata["is_new_topic"] = True
        else:
            metadata.pop("is_new_topic", None)

    return metadata


@router.patch("/topics/{topic_id}", response_model=AdminSpeakingTopicRead)
async def update_speaking_topic(
    topic_id: UUID,
    payload: AdminSpeakingTopicUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminSpeakingTopicRead:
    _ = current_admin
    topic = await session.get(SpeakingTopic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Speaking topic not found.")

    data = payload.model_dump()
    topic_title, prompt_text = _ensure_topic_fields(
        part_number=topic.part_number,
        topic_title=data["topic_title"],
        prompt_text=data["prompt_text"],
    )
    followup_group_key = await _resolve_followup_group_key(
        session,
        part_number=topic.part_number,
        topic_title=topic_title,
        followup_group_key=topic.followup_group_key,
        linked_part2_topic_id=data.get("linked_part2_topic_id"),
    )

    topic.topic_title = topic_title
    topic.prompt_text = prompt_text
    topic.bullet_points = data["bullet_points"]
    topic.category_tags = []
    topic.active = data["active"]
    topic.followup_group_key = followup_group_key
    topic.topic_metadata = _apply_topic_metadata(
        topic.topic_metadata,
        part_number=topic.part_number,
        payload_metadata=data["metadata"],
        icon=data.get("icon"),
        icon_tone=data.get("icon_tone"),
        is_new_topic=data.get("is_new_topic"),
    )

    await session.commit()
    await session.refresh(topic)
    return _serialize_topic(topic)


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_speaking_topic(
    topic_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    _ = current_admin
    topic = await session.get(SpeakingTopic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Speaking topic not found.")

    await session.execute(
        delete(SpeakingTopicQuestionItem).where(SpeakingTopicQuestionItem.speaking_topic_id == topic_id)
    )
    await session.execute(
        update(SpeakingSessionPart)
        .where(SpeakingSessionPart.topic_id == topic_id)
        .values(topic_id=None)
    )
    await session.delete(topic)
    await session.commit()


@router.get("/categories", response_model=AdminSpeakingCategoryListResponse)
async def list_speaking_categories(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminSpeakingCategoryListResponse:
    _ = current_admin
    rows = (
        await session.scalars(
            select(SpeakingCategory).order_by(SpeakingCategory.scope.asc(), SpeakingCategory.slug.asc())
        )
    ).all()

    items: list[AdminSpeakingCategoryRead] = []
    for row in rows:
        topic_count = await _category_topic_count(session, row.slug)
        items.append(_serialize_category(row, topic_count=topic_count))

    return AdminSpeakingCategoryListResponse(items=items, total=len(items))


@router.post("/categories", response_model=AdminSpeakingCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_speaking_category(
    payload: AdminSpeakingCategoryCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminSpeakingCategoryRead:
    _ = current_admin
    slug = _normalize_category_slug(payload.name)
    if not slug:
        raise HTTPException(status_code=400, detail="Category name is required.")

    existing = await session.scalar(select(SpeakingCategory).where(SpeakingCategory.slug == slug))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Category already exists.")

    category = SpeakingCategory(
        slug=slug,
        label=payload.label.strip() if payload.label and payload.label.strip() else None,
        scope=payload.scope,
        active=True,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return _serialize_category(category, topic_count=0)


@router.delete("/categories/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_speaking_category(
    slug: str,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    _ = current_admin
    normalized = _normalize_category_slug(slug)
    category = await session.scalar(select(SpeakingCategory).where(SpeakingCategory.slug == normalized))
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found.")

    topic_count = await _category_topic_count(session, normalized)
    if topic_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Category is used by {topic_count} topic(s). Remove it from topics first.",
        )

    await session.delete(category)
    await session.commit()
