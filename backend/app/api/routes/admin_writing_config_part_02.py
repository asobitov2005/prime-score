from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.admin_writing_config_dependencies import *
from app.api.routes.admin_writing_config_part_01 import _serialize_anchor_set

router = APIRouter()

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
