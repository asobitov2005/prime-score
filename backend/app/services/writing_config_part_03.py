from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_config_dependencies import *
from app.services.writing_config_part_01 import _replace_tokens
from app.services.writing_config_part_02 import WritingPromptBundle, log_writing_config_action

def render_roast_user_prompt(
    *,
    prompts: WritingPromptBundle,
    essay_text: str,
    bands: dict[str, float],
    word_count: int,
    word_minimum: int,
    annotation_count: int,
    overall_summary: str,
) -> str:
    return _replace_tokens(
        prompts.entries[WritingPromptKey.ROAST_USER_TEMPLATE],
        {
            "TA_BAND": bands.get("task_achievement"),
            "CC_BAND": bands.get("coherence"),
            "LR_BAND": bands.get("lexical"),
            "GRA_BAND": bands.get("grammar"),
            "OVERALL_BAND": bands.get("overall"),
            "WORD_COUNT": word_count,
            "WORD_MINIMUM": word_minimum,
            "ANNOTATION_COUNT": annotation_count,
            "OVERALL_SUMMARY": overall_summary or "(none)",
            "ESSAY_TEXT": essay_text,
        },
    )

async def publish_prompt_profile(
    session: AsyncSession,
    *,
    profile: WritingPromptProfile,
    actor_admin_id: UUID | None,
) -> None:
    await session.execute(
        update(WritingPromptProfile)
        .where(
            WritingPromptProfile.task_type_scope == profile.task_type_scope,
            WritingPromptProfile.id != profile.id,
        )
        .values(is_active=False)
    )
    profile.status = WritingConfigStatus.PUBLISHED
    profile.is_active = True
    await log_writing_config_action(
        session,
        actor_admin_id=actor_admin_id,
        entity_type=WritingConfigEntityType.PROFILE,
        entity_id=profile.id,
        action="publish",
        previous_version=None,
        new_version=profile.version,
    )

async def publish_rubric(
    session: AsyncSession,
    *,
    rubric: WritingRubricVersion,
    actor_admin_id: UUID | None,
) -> None:
    await session.execute(
        update(WritingRubricVersion)
        .where(
            WritingRubricVersion.task_type_scope == rubric.task_type_scope,
            WritingRubricVersion.id != rubric.id,
        )
        .values(is_active=False)
    )
    rubric.status = WritingConfigStatus.PUBLISHED
    rubric.is_active = True
    await log_writing_config_action(
        session,
        actor_admin_id=actor_admin_id,
        entity_type=WritingConfigEntityType.RUBRIC,
        entity_id=rubric.id,
        action="publish",
        previous_version=None,
        new_version=rubric.version,
    )

async def publish_anchor_set(
    session: AsyncSession,
    *,
    anchor_set: WritingAnchorSet,
    actor_admin_id: UUID | None,
) -> None:
    await session.execute(
        update(WritingAnchorSet)
        .where(
            WritingAnchorSet.task_type_scope == anchor_set.task_type_scope,
            WritingAnchorSet.id != anchor_set.id,
        )
        .values(is_active=False)
    )
    anchor_set.status = WritingConfigStatus.PUBLISHED
    anchor_set.is_active = True
    await log_writing_config_action(
        session,
        actor_admin_id=actor_admin_id,
        entity_type=WritingConfigEntityType.ANCHOR_SET,
        entity_id=anchor_set.id,
        action="publish",
        previous_version=None,
        new_version=anchor_set.version,
    )

async def replace_anchor_items(
    session: AsyncSession,
    *,
    anchor_set_id: UUID,
    items: list[dict[str, Any]],
) -> None:
    await session.execute(delete(WritingAnchorItem).where(WritingAnchorItem.anchor_set_id == anchor_set_id))
    for index, item in enumerate(items):
        session.add(
            WritingAnchorItem(
                anchor_set_id=anchor_set_id,
                band=float(item.get("band") or 0),
                essay=str(item.get("essay") or ""),
                criteria=dict(item.get("criteria") or {}),
                rationale=str(item.get("rationale") or ""),
                sort_order=index,
            )
        )
