from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.writing_dependencies import *
from app.api.routes.writing_part_01 import _annotation_patterns

def _build_checklist(
    *, task_type: WritingTaskType, subtype: WritingQuestionSubtype | None,
    essay_text: str, feedback: dict, annotations_raw: list[dict],
) -> list[WritingChecklistItem]:
    # Retained for callers of the legacy helper; never infer task coverage from words.
    return _parse_checklist(feedback, [])

async def _build_history_error_trends(
    *,
    session: AsyncSession,
    user_id: UUID,
) -> list[WritingErrorPattern]:
    rows = (
        await session.execute(
            select(WritingEvaluation.inline_annotations)
            .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
            .where(
                WritingSubmission.user_id == user_id,
                WritingSubmission.status == WritingSubmissionStatus.COMPLETED,
            )
            .order_by(WritingSubmission.submitted_at.desc())
            .limit(20)
        )
    ).scalars().all()
    merged: list[dict] = []
    for row in rows:
        if isinstance(row, list):
            merged.extend(item for item in row if isinstance(item, dict))
    return _annotation_patterns(merged, limit=5)

def _parse_structured_items(feedback: dict, key: str, model: type, *, limit: int) -> list:
    raw_items = feedback.get(key)
    if not isinstance(raw_items, list):
        return []
    items = []
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        try:
            items.append(model.model_validate(raw))
        except (ValueError, TypeError):
            continue
        if len(items) >= limit:
            break
    return items

def _parse_target_actions(feedback: dict, fallback: WritingActionPlan, overall_band: float, desired_score: float | None) -> list[WritingTargetAction]:
    return [
        item for item in _parse_structured_items(feedback, "target_action_plan", WritingTargetAction, limit=3)
        if item.title or item.how
    ]

def _parse_band_boundaries(
    feedback: dict, *, task_achievement: WritingCriterionFeedback,
    coherence: WritingCriterionFeedback, lexical: WritingCriterionFeedback,
    grammar: WritingCriterionFeedback,
) -> list[WritingBandBoundary]:
    return [
        item for item in _parse_structured_items(feedback, "band_boundaries", WritingBandBoundary, limit=4)
        if item.criterion
    ]

def _parse_score_boosters(
    feedback: dict, *, task_achievement: WritingCriterionFeedback,
    coherence: WritingCriterionFeedback, lexical: WritingCriterionFeedback,
    grammar: WritingCriterionFeedback,
) -> list[WritingScoreBooster]:
    items = _parse_structured_items(feedback, "score_boosters", WritingScoreBooster, limit=6)
    seen = set()
    boosters = []
    for item in items:
        if item.original and item.original not in seen:
            seen.add(item.original)
            boosters.append(item)
    return boosters

def _parse_checklist(feedback: dict, fallback: list[WritingChecklistItem]) -> list[WritingChecklistItem]:
    return [
        item for item in _parse_structured_items(feedback, "ielts_checklist", WritingChecklistItem, limit=5)
        if item.label
    ]

def _parse_error_patterns(feedback: dict, fallback: list[WritingErrorPattern]) -> list[WritingErrorPattern]:
    # Older evaluations may lack taxonomy. Their stored annotation categories are
    # valid aggregation data, but an explicit empty/invalid taxonomy is not missing.
    if "error_taxonomy" not in feedback:
        return fallback
    items = [
        item for item in _parse_structured_items(feedback, "error_taxonomy", WritingErrorPattern, limit=6)
        if item.label and item.count >= 0
    ]
    total = sum(item.count for item in items)
    return [
        item.model_copy(update={"percentage": round(item.count / total * 100, 1) if total else 0.0})
        for item in items
    ]
