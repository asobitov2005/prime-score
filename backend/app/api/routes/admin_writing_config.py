from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.enums import WritingConfigEntityType, WritingConfigStatus, WritingPromptKey, WritingTaskType, WritingTaskTypeScope
from app.models.writing import (
    WritingAnchorItem,
    WritingAnchorSet,
    WritingConfigAuditLog,
    WritingPromptEntry,
    WritingPromptProfile,
    WritingRubricVersion,
)
from app.schemas.admin_ai import (
    AdminWritingAnchorItemRead,
    AdminWritingAnchorSetCreateRequest,
    AdminWritingAnchorSetRead,
    AdminWritingConfigAuditRead,
    AdminWritingPromptPreviewRead,
    AdminWritingPromptPreviewRequest,
    AdminWritingPromptProfileCreateRequest,
    AdminWritingPromptProfileRead,
    AdminWritingPromptProfileUpdateRequest,
    AdminWritingPromptEntryRead,
    AdminWritingRubricCreateRequest,
    AdminWritingRubricRead,
)
from app.schemas.common import AdminPrincipal
from app.services.writing_config import (
    get_active_anchor_bundle,
    get_active_prompt_bundle,
    get_active_rubric_bundle,
    log_writing_config_action,
    publish_anchor_set,
    publish_prompt_profile,
    publish_rubric,
    render_grader_system_prompt,
    render_grader_user_prompt,
    render_improved_version_prompt,
    render_roast_user_prompt,
    replace_anchor_items,
)

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


@router.get("/writing-config/profiles", response_model=list[AdminWritingPromptProfileRead])
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


@router.post("/writing-config/profiles", response_model=AdminWritingPromptProfileRead, status_code=status.HTTP_201_CREATED)
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


@router.get("/writing-config/profiles/{profile_id}", response_model=AdminWritingPromptProfileRead)
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


@router.patch("/writing-config/profiles/{profile_id}", response_model=AdminWritingPromptProfileRead)
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


@router.post("/writing-config/profiles/{profile_id}/publish", response_model=AdminWritingPromptProfileRead)
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


@router.get("/writing-config/rubrics", response_model=list[AdminWritingRubricRead])
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


@router.post("/writing-config/rubrics", response_model=AdminWritingRubricRead, status_code=status.HTTP_201_CREATED)
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


@router.post("/writing-config/rubrics/{rubric_id}/publish", response_model=AdminWritingRubricRead)
async def publish_rubric_route(
    rubric_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingRubricRead:
    row = await session.get(WritingRubricVersion, rubric_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubric not found.")
    await publish_rubric(session, rubric=row, actor_admin_id=current_admin.id)
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


@router.get("/writing-config/anchors", response_model=list[AdminWritingAnchorSetRead])
async def list_anchor_sets(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminWritingAnchorSetRead]:
    _ = current_admin
    rows = (
        await session.scalars(
            select(WritingAnchorSet)
            .order_by(WritingAnchorSet.task_type_scope.asc(), WritingAnchorSet.version.desc())
        )
    ).all()
    return [await _serialize_anchor_set(session, row) for row in rows]


@router.post("/writing-config/anchors", response_model=AdminWritingAnchorSetRead, status_code=status.HTTP_201_CREATED)
async def create_anchor_set(
    payload: AdminWritingAnchorSetCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingAnchorSetRead:
    latest_version = await session.scalar(
        select(func.max(WritingAnchorSet.version)).where(
            WritingAnchorSet.slug == payload.slug,
            WritingAnchorSet.task_type_scope == payload.task_type_scope,
        )
    ) or 0
    row = WritingAnchorSet(
        slug=payload.slug.strip(),
        title=payload.title.strip(),
        description=(payload.description or "").strip() or None,
        task_type_scope=payload.task_type_scope,
        version=int(latest_version) + 1,
        status=WritingConfigStatus.DRAFT,
        is_active=False,
        created_by=current_admin.id,
    )
    session.add(row)
    await session.flush()
    await replace_anchor_items(session, anchor_set_id=row.id, items=[item.model_dump() for item in payload.items])
    await log_writing_config_action(
        session,
        actor_admin_id=current_admin.id,
        entity_type=WritingConfigEntityType.ANCHOR_SET,
        entity_id=row.id,
        action="create",
        previous_version=None,
        new_version=row.version,
    )
    await session.commit()
    return await _serialize_anchor_set(session, row)


@router.post("/writing-config/anchors/{anchor_set_id}/publish", response_model=AdminWritingAnchorSetRead)
async def publish_anchor_set_route(
    anchor_set_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingAnchorSetRead:
    row = await session.get(WritingAnchorSet, anchor_set_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anchor set not found.")
    await publish_anchor_set(session, anchor_set=row, actor_admin_id=current_admin.id)
    await session.commit()
    return await _serialize_anchor_set(session, row)


@router.post("/writing-config/preview", response_model=AdminWritingPromptPreviewRead)
async def preview_writing_config(
    payload: AdminWritingPromptPreviewRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminWritingPromptPreviewRead:
    _ = current_admin
    task_type = WritingTaskType.TASK_1 if payload.task_type == WritingTaskTypeScope.TASK_1 else WritingTaskType.TASK_2
    prompts = await get_active_prompt_bundle(session, task_type)
    rubric = await get_active_rubric_bundle(session, task_type)
    anchors = await get_active_anchor_bundle(session, task_type)
    return AdminWritingPromptPreviewRead(
        grader_system=render_grader_system_prompt(prompts=prompts, rubric=rubric),
        grader_user=render_grader_user_prompt(
            prompts=prompts,
            anchors=anchors,
            task_type=task_type,
            task_prompt_text=payload.task_prompt_text,
            image_summary=payload.image_summary,
            essay_text=payload.essay_text,
        ),
        improved_version=render_improved_version_prompt(
            prompts=prompts,
            essay_text=payload.essay_text,
            annotations_lines=["- sample annotation"],
            task_prompt_text=payload.task_prompt_text,
            current_band=6.0,
            target_band=7.0,
            desired_score=7.0,
            word_count=max(1, len(payload.essay_text.split())),
            word_minimum=250,
        ),
        roast_system=prompts.entries[WritingPromptKey.ROAST_SYSTEM],
        roast_user=render_roast_user_prompt(
            prompts=prompts,
            essay_text=payload.essay_text,
            bands={"task_achievement": 6.0, "coherence": 6.0, "lexical": 6.0, "grammar": 6.0, "overall": 6.0},
            word_count=max(1, len(payload.essay_text.split())),
            word_minimum=250,
            annotation_count=1,
            overall_summary="Sample preview summary.",
        ),
    )


@router.get("/writing-config/audit-log", response_model=list[AdminWritingConfigAuditRead])
async def list_writing_config_audit_log(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminWritingConfigAuditRead]:
    _ = current_admin
    rows = (
        await session.scalars(
            select(WritingConfigAuditLog).order_by(WritingConfigAuditLog.created_at.desc()).limit(200)
        )
    ).all()
    return [
        AdminWritingConfigAuditRead(
            id=row.id,
            actor_admin_id=row.actor_admin_id,
            entity_type=row.entity_type.value,
            entity_id=row.entity_id,
            action=row.action,
            previous_version=row.previous_version,
            new_version=row.new_version,
            metadata_json=row.metadata_json or {},
            created_at=row.created_at,
        )
        for row in rows
    ]
