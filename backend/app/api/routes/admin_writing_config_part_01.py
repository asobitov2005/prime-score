from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.admin_writing_config_dependencies import *

router = APIRouter()

def _serialize_entry(row: WritingPromptEntry) -> AdminWritingPromptEntryRead:
    return AdminWritingPromptEntryRead(
        id=row.id,
        key=row.key,
        body=row.body,
        format=row.format,
    )

async def _serialize_profile(session: AsyncSession, row: WritingPromptProfile) -> AdminWritingPromptProfileRead:
    entries = (
        await session.scalars(
            select(WritingPromptEntry)
            .where(WritingPromptEntry.profile_id == row.id)
            .order_by(WritingPromptEntry.key.asc())
        )
    ).all()
    return AdminWritingPromptProfileRead(
        id=row.id,
        slug=row.slug,
        title=row.title,
        description=row.description,
        task_type_scope=row.task_type_scope,
        status=row.status,
        version=row.version,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at,
        entries=[_serialize_entry(entry) for entry in entries],
    )

async def _serialize_anchor_set(session: AsyncSession, row: WritingAnchorSet) -> AdminWritingAnchorSetRead:
    items = (
        await session.scalars(
            select(WritingAnchorItem)
            .where(WritingAnchorItem.anchor_set_id == row.id)
            .order_by(WritingAnchorItem.sort_order.asc(), WritingAnchorItem.created_at.asc())
        )
    ).all()
    return AdminWritingAnchorSetRead(
        id=row.id,
        slug=row.slug,
        title=row.title,
        description=row.description,
        task_type_scope=row.task_type_scope,
        version=row.version,
        status=row.status,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at,
        items=[
            AdminWritingAnchorItemRead(
                id=item.id,
                band=item.band,
                essay=item.essay,
                criteria=item.criteria or {},
                rationale=item.rationale or "",
                sort_order=item.sort_order,
            )
            for item in items
        ],
    )

async def list_prompt_profiles(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminWritingPromptProfileRead]:
    _ = current_admin
    rows = (
        await session.scalars(
            select(WritingPromptProfile)
            .order_by(WritingPromptProfile.slug.asc(), WritingPromptProfile.version.desc())
        )
    ).all()
    return [await _serialize_profile(session, row) for row in rows]

async def create_prompt_profile(
    payload: AdminWritingPromptProfileCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingPromptProfileRead:
    latest_version = await session.scalar(
        select(func.max(WritingPromptProfile.version)).where(WritingPromptProfile.slug == payload.slug)
    ) or 0
    profile = WritingPromptProfile(
        slug=payload.slug.strip(),
        title=payload.title.strip(),
        description=(payload.description or "").strip() or None,
        task_type_scope=payload.task_type_scope,
        status=WritingConfigStatus.DRAFT,
        version=int(latest_version) + 1,
        is_active=False,
        created_by=current_admin.id,
    )
    session.add(profile)
    await session.flush()
    for entry in payload.entries:
        session.add(
            WritingPromptEntry(
                profile_id=profile.id,
                key=entry.key,
                body=entry.body,
                format=entry.format,
            )
        )
    await log_writing_config_action(
        session,
        actor_admin_id=current_admin.id,
        entity_type=WritingConfigEntityType.PROFILE,
        entity_id=profile.id,
        action="create",
        previous_version=None,
        new_version=profile.version,
    )
    await session.commit()
    return await _serialize_profile(session, profile)

async def get_prompt_profile(
    profile_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingPromptProfileRead:
    _ = current_admin
    row = await session.get(WritingPromptProfile, profile_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt profile not found.")
    return await _serialize_profile(session, row)

async def update_prompt_profile(
    profile_id: UUID,
    payload: AdminWritingPromptProfileUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingPromptProfileRead:
    row = await session.get(WritingPromptProfile, profile_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt profile not found.")
    if payload.title is not None:
        row.title = payload.title.strip() or row.title
    if "description" in payload.model_fields_set:
        row.description = (payload.description or "").strip() or None
    if payload.entries is not None:
        existing = {
            item.key: item
            for item in (
                await session.scalars(select(WritingPromptEntry).where(WritingPromptEntry.profile_id == row.id))
            ).all()
        }
        for entry in payload.entries:
            current = existing.get(entry.key)
            if current is None:
                session.add(
                    WritingPromptEntry(
                        profile_id=row.id,
                        key=entry.key,
                        body=entry.body,
                        format=entry.format,
                    )
                )
            else:
                current.body = entry.body
                current.format = entry.format
    await log_writing_config_action(
        session,
        actor_admin_id=current_admin.id,
        entity_type=WritingConfigEntityType.PROFILE,
        entity_id=row.id,
        action="update",
        previous_version=row.version,
        new_version=row.version,
    )
    await session.commit()
    return await _serialize_profile(session, row)

async def publish_prompt_profile_route(
    profile_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingPromptProfileRead:
    row = await session.get(WritingPromptProfile, profile_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt profile not found.")
    await publish_prompt_profile(session, profile=row, actor_admin_id=current_admin.id)
    await session.commit()
    return await _serialize_profile(session, row)

async def list_rubrics(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminWritingRubricRead]:
    _ = current_admin
    rows = (
        await session.scalars(
            select(WritingRubricVersion)
            .order_by(WritingRubricVersion.task_type_scope.asc(), WritingRubricVersion.version.desc())
        )
    ).all()
    return [
        AdminWritingRubricRead(
            id=row.id,
            task_type_scope=row.task_type_scope,
            version=row.version,
            body=row.body,
            status=row.status,
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]

async def create_rubric(
    payload: AdminWritingRubricCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingRubricRead:
    latest_version = await session.scalar(
        select(func.max(WritingRubricVersion.version)).where(
            WritingRubricVersion.task_type_scope == payload.task_type_scope
        )
    ) or 0
    row = WritingRubricVersion(
        task_type_scope=payload.task_type_scope,
        version=int(latest_version) + 1,
        body=payload.body,
        status=WritingConfigStatus.DRAFT,
        is_active=False,
        created_by=current_admin.id,
    )
    session.add(row)
    await log_writing_config_action(
        session,
        actor_admin_id=current_admin.id,
        entity_type=WritingConfigEntityType.RUBRIC,
        entity_id=row.id,
        action="create",
        previous_version=None,
        new_version=row.version,
    )
    await session.commit()
    return AdminWritingRubricRead(
        id=row.id,
        task_type_scope=row.task_type_scope,
        version=row.version,
        body=row.body,
        status=row.status,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
