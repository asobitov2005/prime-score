from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.writing_config_dependencies import *
from app.services.writing_config_part_01 import DEFAULT_PROMPT_ENTRIES, DEFAULT_RUBRIC_VERSION, _format_anchors_block, _replace_tokens, _scope_for_task_type

class WritingPromptBundle:
    profile_id: UUID | None
    profile_version: int
    task_type_scope: WritingTaskTypeScope
    entries: dict[WritingPromptKey, str]

class WritingRubricBundle:
    rubric_id: UUID | None
    version: int
    task_type_scope: WritingTaskTypeScope
    body: str

class WritingAnchorBundle:
    anchor_set_id: UUID | None
    version: int
    task_type_scope: WritingTaskTypeScope
    items: list[dict[str, Any]]

async def get_active_prompt_bundle(
    session: AsyncSession,
    task_type: WritingTaskType | str,
) -> WritingPromptBundle:
    scope = _scope_for_task_type(task_type)
    for candidate_scope in (scope, WritingTaskTypeScope.ALL):
        profile = await session.scalar(
            select(WritingPromptProfile)
            .where(
                WritingPromptProfile.task_type_scope == candidate_scope,
                WritingPromptProfile.is_active.is_(True),
                WritingPromptProfile.status == WritingConfigStatus.PUBLISHED,
            )
            .order_by(WritingPromptProfile.version.desc())
        )
        if profile is None:
            continue
        rows = (
            await session.scalars(
                select(WritingPromptEntry).where(WritingPromptEntry.profile_id == profile.id)
            )
        ).all()
        entries = {row.key: row.body for row in rows}
        return WritingPromptBundle(
            profile_id=profile.id,
            profile_version=int(profile.version),
            task_type_scope=profile.task_type_scope,
            entries={**DEFAULT_PROMPT_ENTRIES, **entries},
        )
    return WritingPromptBundle(
        profile_id=None,
        profile_version=1,
        task_type_scope=WritingTaskTypeScope.ALL,
        entries=dict(DEFAULT_PROMPT_ENTRIES),
    )

async def get_active_rubric_bundle(
    session: AsyncSession,
    task_type: WritingTaskType | str,
) -> WritingRubricBundle:
    scope = _scope_for_task_type(task_type)
    for candidate_scope in (scope, WritingTaskTypeScope.ALL):
        rubric = await session.scalar(
            select(WritingRubricVersion)
            .where(
                WritingRubricVersion.task_type_scope == candidate_scope,
                WritingRubricVersion.is_active.is_(True),
                WritingRubricVersion.status == WritingConfigStatus.PUBLISHED,
            )
            .order_by(WritingRubricVersion.version.desc())
        )
        if rubric is not None:
            return WritingRubricBundle(
                rubric_id=rubric.id,
                version=int(rubric.version),
                task_type_scope=rubric.task_type_scope,
                body=rubric.body,
            )
    return WritingRubricBundle(
        rubric_id=None,
        version=DEFAULT_RUBRIC_VERSION,
        task_type_scope=WritingTaskTypeScope.ALL,
        body=IELTS_WRITING_RUBRIC_TEXT,
    )

async def get_active_anchor_bundle(
    session: AsyncSession,
    task_type: WritingTaskType | str,
) -> WritingAnchorBundle:
    scope = _scope_for_task_type(task_type)
    for candidate_scope in (scope, WritingTaskTypeScope.ALL):
        anchor_set = await session.scalar(
            select(WritingAnchorSet)
            .where(
                WritingAnchorSet.task_type_scope == candidate_scope,
                WritingAnchorSet.is_active.is_(True),
                WritingAnchorSet.status == WritingConfigStatus.PUBLISHED,
            )
            .order_by(WritingAnchorSet.version.desc())
        )
        if anchor_set is None:
            continue
        items = (
            await session.scalars(
                select(WritingAnchorItem)
                .where(WritingAnchorItem.anchor_set_id == anchor_set.id)
                .order_by(WritingAnchorItem.sort_order.asc(), WritingAnchorItem.created_at.asc())
            )
        ).all()
        return WritingAnchorBundle(
            anchor_set_id=anchor_set.id,
            version=int(anchor_set.version),
            task_type_scope=anchor_set.task_type_scope,
            items=[
                {
                    "band": item.band,
                    "essay": item.essay,
                    "criteria": item.criteria or {},
                    "rationale": item.rationale or "",
                }
                for item in items
            ],
        )
    fallback_scope = _scope_for_task_type(task_type)
    return WritingAnchorBundle(
        anchor_set_id=None,
        version=1,
        task_type_scope=fallback_scope,
        items=list(LEGACY_ANCHORS.get(fallback_scope.value, [])),
    )

async def log_writing_config_action(
    session: AsyncSession,
    *,
    actor_admin_id: UUID | None,
    entity_type: WritingConfigEntityType,
    entity_id: UUID,
    action: str,
    previous_version: int | None,
    new_version: int | None,
    metadata_json: dict[str, Any] | None = None,
) -> None:
    session.add(
        WritingConfigAuditLog(
            actor_admin_id=actor_admin_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            previous_version=previous_version,
            new_version=new_version,
            metadata_json=metadata_json or {},
        )
    )

def render_grader_system_prompt(
    *,
    prompts: WritingPromptBundle,
    rubric: WritingRubricBundle,
) -> str:
    parts = [
        prompts.entries[WritingPromptKey.GRADER_SYSTEM],
        prompts.entries[WritingPromptKey.CRITERION_TASK_ACHIEVEMENT],
        prompts.entries[WritingPromptKey.CRITERION_COHERENCE_COHESION],
        prompts.entries[WritingPromptKey.CRITERION_LEXICAL_RESOURCE],
        prompts.entries[WritingPromptKey.CRITERION_GRAMMAR_ACCURACY],
        prompts.entries[WritingPromptKey.VOCABULARY_UPGRADE_POLICY],
        rubric.body,
    ]
    return "\n\n".join(part.strip() for part in parts if part.strip())

def render_grader_user_prompt(
    *,
    prompts: WritingPromptBundle,
    anchors: WritingAnchorBundle,
    task_type: WritingTaskType | str,
    task_prompt_text: str,
    image_summary: str,
    essay_text: str,
    desired_score: float | None = None,
) -> str:
    image_summary_block = ""
    task_type_value = task_type.value if isinstance(task_type, WritingTaskType) else str(task_type)
    if task_type_value == WritingTaskType.TASK_1.value and image_summary.strip():
        image_summary_block = (
            "VISUAL DESCRIPTION (ground truth, do not re-interpret):\n"
            f"{image_summary.strip()}\n\n"
        )
    target_context = "No learner desired score was provided. Give actions for the next realistic +0.5 to +1.0 band."
    if desired_score is not None:
        target_context = (
            f"The learner's dashboard Desired Score is Band {desired_score:.1f}. "
            "If the current score is below this target, make `next_steps` a realistic +0.5 to +1.0 path toward that target without overloading the learner. "
            "If the current score already meets or exceeds it, make `next_steps` preserve the current band and push toward the next realistic +0.5 to +1.0 band without unnecessary rewrites."
        )
    template = prompts.entries[WritingPromptKey.GRADER_USER_TEMPLATE]
    if "{{TARGET_CONTEXT}}" not in template:
        template = template.replace(
            "COACHING OUTPUT RULES:",
            "TARGET SCORE CONTEXT:\n{{TARGET_CONTEXT}}\n\nCOACHING OUTPUT RULES:",
        )
    return _replace_tokens(
        template,
        {
            "TASK_TYPE": task_type_value.upper(),
            "TASK_PROMPT": task_prompt_text.strip(),
            "IMAGE_SUMMARY_BLOCK": image_summary_block,
            "ANCHORS_BLOCK": _format_anchors_block(anchors.items),
            "TARGET_CONTEXT": target_context,
            "ANNOTATION_PROMPT": prompts.entries[WritingPromptKey.ANNOTATION_PROMPT],
            "ESSAY_TEXT": essay_text,
        },
    )

def render_annotation_repair_prompt(prompts: WritingPromptBundle, raw_text: str) -> str:
    return _replace_tokens(
        prompts.entries[WritingPromptKey.ANNOTATION_REPAIR_PROMPT],
        {"RAW_TEXT": raw_text},
    )

def render_json_repair_prompt(prompts: WritingPromptBundle, raw_text: str) -> str:
    return _replace_tokens(
        prompts.entries[WritingPromptKey.JSON_REPAIR_PROMPT],
        {"RAW_TEXT": raw_text},
    )

def render_improved_version_prompt(
    *,
    prompts: WritingPromptBundle,
    essay_text: str,
    annotations_lines: list[str],
    task_prompt_text: str,
    current_band: float,
    target_band: float,
    desired_score: float | None,
    word_count: int,
    word_minimum: int,
) -> str:
    return _replace_tokens(
        prompts.entries[WritingPromptKey.IMPROVED_VERSION_PROMPT],
        {
            "CURRENT_BAND": f"{current_band:.1f}",
            "TARGET_BAND": f"{target_band:.1f}",
            "DESIRED_SCORE_CONTEXT": (
                f"Band {desired_score:.1f}"
                if desired_score is not None
                else "No dashboard desired score was provided."
            ),
            "WORD_COUNT": word_count,
            "WORD_MINIMUM": word_minimum,
            "TASK_PROMPT": task_prompt_text.strip(),
            "ANNOTATIONS": "\n".join(annotations_lines),
            "ESSAY_TEXT": essay_text,
        },
    )
