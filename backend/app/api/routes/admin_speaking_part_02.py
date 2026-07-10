from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.admin_speaking_dependencies import *
from app.api.routes.admin_speaking_part_01 import _category_topic_count, _normalize_category_slug, _serialize_category

router = APIRouter()

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
