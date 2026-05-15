from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import (
    WritingConfigEntityType,
    WritingConfigStatus,
    WritingPromptFormat,
    WritingPromptKey,
    WritingTaskType,
    WritingTaskTypeScope,
)
from app.models.writing import (
    WritingAnchorItem,
    WritingAnchorSet,
    WritingConfigAuditLog,
    WritingPromptEntry,
    WritingPromptProfile,
    WritingRubricVersion,
)
from app.services.writing_anchors import ANCHORS as LEGACY_ANCHORS
from app.services.writing_rubric import IELTS_WRITING_RUBRIC_TEXT

DEFAULT_PROFILE_SLUG = "default"
DEFAULT_PROFILE_TITLE = "Default Writing Profile"
DEFAULT_PROFILE_DESCRIPTION = "Seeded from the legacy in-code IELTS writing prompts."
DEFAULT_RUBRIC_VERSION = 1
DEFAULT_ANCHOR_SET_SLUG = "default"
DEFAULT_ANCHOR_SET_TITLE = "Default Anchor Set"
DEFAULT_ANCHOR_SET_DESCRIPTION = "Seeded from the legacy in-code IELTS writing anchors."

_GRADER_SYSTEM_PROMPT = (
    "You are an experienced IELTS Writing examiner. Score essays strictly "
    "according to the official band descriptors below. For every criterion, "
    "first reason internally about the descriptors and the evidence in the "
    "essay (placed in the 'reasoning' field), then issue a band in 0.5 "
    "increments between 0 and 9. Quote short verbatim phrases from the "
    "candidate's essay as evidence. Be conservative: when the essay sits "
    "between two bands, choose the lower band unless the higher-band "
    "descriptors are clearly met. Use the provided anchor essays as "
    "calibration references; never reveal them in your output. Do NOT "
    "reward length, topic, or apparent effort beyond what the descriptors "
    "describe. Do not award Band 8+ for safe, formulaic, or merely error-light "
    "writing unless the criterion clearly shows precision, flexibility, and depth. "
    "Formulaic transitions, basic repeated vocabulary, generic examples, or shallow "
    "development should normally cap the relevant criterion around Band 7.0-7.5. "
    "Be specific and critical when giving improvement advice."
)

_GRADER_USER_TEMPLATE = """TASK TYPE: {{TASK_TYPE}}

TASK PROMPT:
{{TASK_PROMPT}}

{{IMAGE_SUMMARY_BLOCK}}
CALIBRATION ANCHORS:
{{ANCHORS_BLOCK}}

TARGET SCORE CONTEXT:
{{TARGET_CONTEXT}}

COACHING OUTPUT RULES:
1. `overall_summary` must be 2-3 sentences only.
2. Sentence 1: state the current overall level and the strongest criterion.
3. Sentence 2: state the weakest criterion and quote or paraphrase one exact score-limiting feature from the essay.
4. Sentence 3: state the single fastest revision move for the target score context.
5. `next_steps` must contain exactly 3 concise actions ordered by score impact toward the target score context. Each action must mention a concrete pattern, phrase, or paragraph move from the essay. Do not write generic advice.
6. `strengths` and `improvements` inside each criterion must be essay-specific, not template language.
7. `vocabulary_suggestions` must contain only real upgrade opportunities from the essay itself.
8. Return 0-8 vocabulary suggestions. Do not pad the list.
9. `target_action_plan` must contain exactly 3 target-gap actions. Each action has: title, why, how, example, band_impact, priority. Aim for a realistic +0.5 to +1.0 band improvement without making the task feel impossible.
10. `band_boundaries` must contain 4 rows, one per IELTS criterion. Explain why the current band is locked and what exact change earns the next realistic +0.5 to +1.0.
11. `ielts_checklist` must contain exactly 5 task-specific checklist rows with label, status, detail, how_to_fix.
12. `error_taxonomy` must group repeated weak patterns by subcategory, not just broad category. Include count, examples, and one fix.
13. `sentence_fixes` must contain the highest-impact sentence corrections only. Use exact original text from the essay.
14. `score_boosters` must contain 3-6 exact original phrases or sentences that helped the score. Show criterion, original, why_it_scores, keep_doing, and band_value. `band_value` must describe the scoring effect, not overclaim a band (good: "supports Task Achievement"; bad: "Band 8 support").

STRICT SCORING CALIBRATION:
- Criterion scores must be whole IELTS bands only: 0, 1, 2, 3, 4, 5, 6, 7, 8, or 9. Do not output 5.5, 6.5, 7.5, or 8.5 for an individual criterion.
- Band 8 requires clear descriptor evidence, not just good structure and few mistakes.
- If ideas are clear but predictable or not deeply developed, Task Achievement is usually 7.0-7.5.
- If cohesion relies on obvious signals such as Firstly/Secondly/Another important point, Coherence is usually capped at 7.5 unless referencing and progression are genuinely sophisticated.
- If vocabulary is accurate but safe, repeated, or mostly common words, Lexical Resource is usually 7.0-7.5.
- If grammar is accurate but mostly safe and conventional, Grammar is usually 7.0-7.5.
- Overall Band 8 should be rare and must be justified by all four criteria, not by one polished paragraph.

TARGET INTEGRITY RULES:
- Desired Score is a coaching target only. It must not increase the awarded band.
- If evidence sits between two bands, choose the lower band unless the higher-band descriptor is consistently proven across the whole essay.
- Do not mark the essay as target-ready unless the actual descriptor evidence meets or exceeds that band.
- Penalize missing or weak required task features directly: Task 1 overview/key features/data/comparisons; Task 2 conclusion/position/full coverage/developed support.
- If the learner already exceeds the desired score, actions should protect the current score and target only the next realistic +0.5, not over-praise.

{{ANNOTATION_PROMPT}}

OUTPUT:
Return JSON only that matches the provided response schema. Do not include markdown fences. Do not add fields. Criterion bands MUST be whole numbers from 0 to 9. The backend computes any .5 overall band after averaging.

===== CANDIDATE ESSAY START =====
{{ESSAY_TEXT}}
===== CANDIDATE ESSAY END ====="""

_ANNOTATION_PROMPT = (
    "INLINE ANNOTATIONS:\n"
    "Identify concrete, fixable language errors in the candidate's essay. "
    "For each error, return offset (0-based character index into the essay "
    "text exactly as provided between the markers), length (number of "
    "characters of the original span), original (the exact substring), "
    "replacements (1-3 corrected alternatives), category (one of: "
    "spelling, grammar, lexical, cohesion, style, punctuation), severity "
    "(error, warning, or suggestion), a short_message, a brief "
    "explanation, band_impact, examiner_tip, and improved_sentence. "
    "STRICTLY copy `original` verbatim from the essay, "
    "character-for-character. `length` must exactly equal the number of "
    "characters in `original`. Before outputting each annotation, verify "
    "that essay[offset:offset+length] == original in the exact raw essay "
    "text, including spaces and newlines. If you cannot verify an "
    "annotation exactly, omit it. Do not annotate stylistic preferences "
    "as errors. Prioritize issues that block the target score context "
    "or the next realistic +0.5 to +1.0 band."
)

_ANNOTATION_REPAIR_PROMPT = (
    "Repair the broken JSON annotation array below so it becomes valid JSON "
    "matching the annotation schema exactly. Preserve meaning when possible, "
    "use [] for missing arrays, use \"\" for missing strings, and output JSON only.\n\n"
    "BROKEN JSON:\n{{RAW_TEXT}}"
)

_JSON_REPAIR_PROMPT = (
    "Repair the broken IELTS grader JSON below so it becomes valid JSON "
    "that matches the response schema exactly. Preserve meaning when possible, "
    "use [] for missing arrays, use \"\" for missing strings, and output JSON only.\n\n"
    "BROKEN JSON:\n{{RAW_TEXT}}"
)

_IMPROVED_VERSION_PROMPT = """You will receive a candidate IELTS essay and a list of inline annotations.
Rewrite the essay into a clearly improved next draft while keeping the same
core opinion, examples, paragraph order, and overall structure.
Rules:
- Keep the student's own voice and any correct original wording when it already works.
- Fix the annotated problems and strengthen only the weak spots that hold the score down.
- Make the revision feel like a realistic +0.5 to +1.0 band improvement, not a model-perfect Band 9 rewrite.
- Do not add new ideas unrelated to the original argument.
- Keep the paragraph structure very close to the original. If the original is one block, you may split it into sensible paragraphs.
- Current band: {{CURRENT_BAND}}. Aim for no more than Band {{TARGET_BAND}}.
- Desired score context: {{DESIRED_SCORE_CONTEXT}}
- Current word count: {{WORD_COUNT}}. Minimum target: {{WORD_MINIMUM}}.
- If the essay is under the minimum, expand it naturally with clearer support and explanation until it reaches the minimum.
- If the essay already meets the minimum, do not pad it with filler.
- Use natural IELTS-ready wording, not memorised template phrases.
- Do not inject advanced vocabulary that the student never gestures toward unless it is needed to fix a clear weakness.
- Output the revised essay as plain text only. No commentary.

Task prompt:
{{TASK_PROMPT}}

Annotations:
{{ANNOTATIONS}}

===== ESSAY START =====
{{ESSAY_TEXT}}
===== ESSAY END ====="""

_ROAST_SYSTEM = (
    "You are the brutally honest roast coach for an IELTS Writing app. "
    "Your job is to roast the writing hard enough that the student immediately "
    "understands what is weak and wants to fix it. Be funny, blunt, and energetic. "
    "Do not sound like a polite examiner report. Use simple, natural English that "
    "an IELTS learner can understand; avoid C2 academic words, fancy metaphors, "
    "and long sentences. Attack only the essay: weak logic, vague ideas, messy "
    "paragraphs, lazy vocabulary, grammar chaos, missing examples, and poor task "
    "coverage. Never attack the student's identity, intelligence, body, nationality, "
    "religion, gender, personal worth, or future. No slurs, threats, sexual content, "
    "or self-harm jokes. You may be savage about the text, but keep it useful and "
    "specific. If something is bad, say it is bad in plain words. Do not change the "
    "locked IELTS bands. Quote only tiny real snippets from the essay. Every zinger "
    "must point to a real weakness shown in the essay or score profile. End with a "
    "short, firm push to revise. Output JSON only."
)

_ROAST_USER_TEMPLATE = """BANDS (locked, do not change):
  Task Achievement: {{TA_BAND}}
  Coherence & Cohesion: {{CC_BAND}}
  Lexical Resource: {{LR_BAND}}
  Grammar: {{GRA_BAND}}
  Overall: {{OVERALL_BAND}}

WORD COUNT: {{WORD_COUNT}} (minimum {{WORD_MINIMUM}})
DETECTED ERRORS: {{ANNOTATION_COUNT}}
NEUTRAL EXAMINER SUMMARY (for context, do not copy):
{{OVERALL_SUMMARY}}

Now roast the essay without softening the criticism. Make it clear, natural, and easy to understand.
Do not write like a C2 examiner. Write like a sharp coach talking directly to the student.
Use this structure:
- overall_roast: 4-6 short sentences. Be harsh, specific, funny, and useful. Name the biggest writing problems in plain English.
- one_liner: one savage but useful sentence. It should roast the essay, not the person.
- task_achievement_zinger / coherence_zinger / lexical_zinger / grammar_zinger: one sharp sentence per criterion. Each one must mention the actual writing problem.
- savage_tips: exactly 4 short bullet points. Start with a concrete fix, then add attitude. Keep every tip easy to act on.
- pep_talk: 1-2 short sentences. No sugar-coating; tell the student to revise properly.

Tone examples:
- Good: "Your idea is there, but the support is walking around with empty pockets."
- Good: "This paragraph starts confidently, then forgets where it was going."
- Bad: "The candidate demonstrates insufficient lexical sophistication." Too formal.
- Bad: "You are stupid." Never attack the person.

===== CANDIDATE ESSAY START =====
{{ESSAY_TEXT}}
===== CANDIDATE ESSAY END ====="""

_VOCABULARY_UPGRADE_POLICY = (
    "The `vocabulary_suggestions` field must contain genuinely useful lexical "
    "upgrades only when the essay actually contains a weak, repetitive, or "
    "too-basic phrase worth improving. Never invent phrases that do not appear "
    "in the essay. Prefer natural, slightly less common IELTS-appropriate "
    "collocations over flashy or memorised wording."
)

DEFAULT_PROMPT_ENTRIES: dict[WritingPromptKey, str] = {
    WritingPromptKey.GRADER_SYSTEM: _GRADER_SYSTEM_PROMPT,
    WritingPromptKey.GRADER_USER_TEMPLATE: _GRADER_USER_TEMPLATE,
    WritingPromptKey.CRITERION_TASK_ACHIEVEMENT: "Judge task fulfilment strictly against the official descriptor for the current task type.",
    WritingPromptKey.CRITERION_COHERENCE_COHESION: "Judge paragraphing, progression, cohesion, and logical flow using essay-specific evidence.",
    WritingPromptKey.CRITERION_LEXICAL_RESOURCE: "Judge range, precision, collocation control, and repetition using real phrases from the essay.",
    WritingPromptKey.CRITERION_GRAMMAR_ACCURACY: "Judge grammatical range, sentence control, agreement, tense, articles, and punctuation using real sentence evidence.",
    WritingPromptKey.ANNOTATION_PROMPT: _ANNOTATION_PROMPT,
    WritingPromptKey.ANNOTATION_REPAIR_PROMPT: _ANNOTATION_REPAIR_PROMPT,
    WritingPromptKey.JSON_REPAIR_PROMPT: _JSON_REPAIR_PROMPT,
    WritingPromptKey.IMPROVED_VERSION_PROMPT: _IMPROVED_VERSION_PROMPT,
    WritingPromptKey.ROAST_SYSTEM: _ROAST_SYSTEM,
    WritingPromptKey.ROAST_USER_TEMPLATE: _ROAST_USER_TEMPLATE,
    WritingPromptKey.VOCABULARY_UPGRADE_POLICY: _VOCABULARY_UPGRADE_POLICY,
}


def _scope_for_task_type(task_type: WritingTaskType | str) -> WritingTaskTypeScope:
    if isinstance(task_type, WritingTaskType):
        task_type = task_type.value
    return WritingTaskTypeScope.TASK_1 if str(task_type) == WritingTaskType.TASK_1.value else WritingTaskTypeScope.TASK_2


def _replace_tokens(template: str, values: dict[str, Any]) -> str:
    text = template
    for key, value in values.items():
        text = text.replace(f"{{{{{key}}}}}", str(value))
    return text


def _format_anchors_block(anchors: list[dict[str, Any]]) -> str:
    blocks: list[str] = []
    for anchor in anchors:
        criteria = anchor.get("criteria", {})
        blocks.append(
            "----- ANCHOR ESSAY (Band {band}) -----\n"
            "Criteria bands -> TA: {ta}, CC: {cc}, LR: {lr}, GRA: {gra}\n"
            "Rationale: {rationale}\n"
            "Essay:\n{essay}\n----- END ANCHOR -----".format(
                band=anchor.get("band"),
                ta=criteria.get("task_achievement"),
                cc=criteria.get("coherence"),
                lr=criteria.get("lexical"),
                gra=criteria.get("grammar"),
                rationale=anchor.get("rationale", ""),
                essay=anchor.get("essay", ""),
            )
        )
    return "\n\n".join(blocks)


@dataclass(slots=True)
class WritingPromptBundle:
    profile_id: UUID | None
    profile_version: int
    task_type_scope: WritingTaskTypeScope
    entries: dict[WritingPromptKey, str]


@dataclass(slots=True)
class WritingRubricBundle:
    rubric_id: UUID | None
    version: int
    task_type_scope: WritingTaskTypeScope
    body: str


@dataclass(slots=True)
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
