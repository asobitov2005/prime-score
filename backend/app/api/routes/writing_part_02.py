from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.writing_dependencies import *
from app.api.routes.writing_part_01 import _annotation_patterns, _criterion_from_dict, _status_from_signal

def _build_checklist(
    *,
    task_type: WritingTaskType,
    subtype: WritingQuestionSubtype | None,
    essay_text: str,
    feedback: dict,
    annotations_raw: list[dict],
) -> list[WritingChecklistItem]:
    text = " ".join(essay_text.lower().split())
    ta = _criterion_from_dict(feedback.get("task_achievement"))
    cc = _criterion_from_dict(feedback.get("coherence"))
    task_notes = " ".join([ta.summary, *ta.improvements, *ta.strengths]).lower()
    cohesion_notes = " ".join([cc.summary, *cc.improvements, *cc.strengths]).lower()

    def item(label: str, signal: bool, related_issue: bool, detail: str, how_to_fix: str | None = None) -> WritingChecklistItem:
        return WritingChecklistItem(
            label=label,
            status=_status_from_signal(signal, related_issue),
            detail=detail,
            how_to_fix=how_to_fix or detail,
        )

    if task_type == WritingTaskType.TASK_1:
        overview_signal = any(word in text for word in ["overall", "in general", "generally", "it is clear", "it can be seen"])
        data_signal = any(ch.isdigit() for ch in essay_text)
        comparison_signal = any(word in text for word in ["higher", "lower", "whereas", "while", "compared", "respectively", "largest", "smallest", "increase", "decrease"])
        structure_signal = text.count(".") >= 4 or "\n\n" in essay_text
        checklist = [
            item("Clear overview", overview_signal, "overview" in task_notes, "State the main trend or the biggest contrast in one separate overview sentence."),
            item("Key features selected", not any(word in task_notes for word in ["key feature", "main feature", "irrelevant"]), "key feature" in task_notes, "Choose the largest changes, highest/lowest values, and standout categories."),
            item("Data support", data_signal, "data" in task_notes or "number" in task_notes, "Use exact numbers, units, years, or percentages where the visual provides them."),
            item("Comparisons", comparison_signal, "comparison" in task_notes, "Compare categories instead of listing figures one by one."),
            item("Report structure", structure_signal, "paragraph" in cohesion_notes or "structure" in cohesion_notes, "Use introduction, overview, and grouped detail paragraphs."),
        ]
        if subtype == WritingQuestionSubtype.PROCESS:
            checklist[2] = item("Process stages", any(word in text for word in ["first", "next", "then", "finally", "stage"]), "stage" in task_notes, "Describe each major stage in sequence.")
        if subtype == WritingQuestionSubtype.MAP:
            checklist[3] = item("Location changes", any(word in text for word in ["north", "south", "east", "west", "near", "beside", "replaced"]), "location" in task_notes, "Describe what changed and where it happened.")
        return checklist

    position_signal = any(word in text for word in ["i believe", "i agree", "in my opinion", "this essay", "i strongly", "i partly"])
    all_parts_signal = not any(word in task_notes for word in ["part of the question", "all parts", "only addresses", "partly addresses"])
    topic_sentence_signal = any(word in text for word in ["firstly", "first,", "to begin", "another", "secondly", "on the one hand"])
    support_signal = any(word in text for word in ["for example", "for instance", "because", "therefore", "as a result", "this means"])
    conclusion_signal = any(word in text for word in ["in conclusion", "to conclude", "overall,"])
    return [
        item("Clear position", position_signal, "position" in task_notes, "Make your answer explicit in the introduction and keep it consistent."),
        item("All parts answered", all_parts_signal, "all parts" in task_notes, "Cover every question part, especially for two-part or discussion prompts."),
        item("Topic sentences", topic_sentence_signal, "topic sentence" in cohesion_notes, "Start each body paragraph with one controlling idea."),
        item("Support and examples", support_signal, "example" in task_notes or "support" in task_notes, "Develop claims with explanation and a concrete example."),
        item("Conclusion", conclusion_signal, "conclusion" in task_notes, "End with a concise final answer, not a new idea."),
    ]

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

def _parse_target_actions(feedback: dict, fallback: WritingActionPlan, overall_band: float, desired_score: float | None) -> list[WritingTargetAction]:
    raw_items = feedback.get("target_action_plan") or []
    actions: list[WritingTargetAction] = []
    if isinstance(raw_items, list):
        for raw in raw_items:
            if not isinstance(raw, dict):
                continue
            try:
                action = WritingTargetAction.model_validate(raw)
            except Exception:
                continue
            if action.title or action.how:
                actions.append(action)
            if len(actions) >= 3:
                break
    if actions:
        return actions
    target = min(desired_score, overall_band + 1.0) if desired_score and desired_score > overall_band else min(9.0, overall_band + 1.0)
    return [
        WritingTargetAction(
            title=(step.split(".")[0] or "Fix the limiter")[:80],
            why=f"Needed for a realistic Band {overall_band:.1f} -> {target:.1f} push.",
            how=step,
            band_impact=f"{overall_band:.1f} -> {target:.1f}",
            priority=index + 1,
        )
        for index, step in enumerate(fallback.fixes[:3])
        if step
    ]

def _parse_band_boundaries(
    feedback: dict,
    *,
    task_achievement: WritingCriterionFeedback,
    coherence: WritingCriterionFeedback,
    lexical: WritingCriterionFeedback,
    grammar: WritingCriterionFeedback,
) -> list[WritingBandBoundary]:
    raw_items = feedback.get("band_boundaries") or []
    boundaries: list[WritingBandBoundary] = []
    if isinstance(raw_items, list):
        for raw in raw_items:
            if not isinstance(raw, dict):
                continue
            try:
                item = WritingBandBoundary.model_validate(raw)
            except Exception:
                continue
            if item.criterion:
                boundaries.append(item)
            if len(boundaries) >= 4:
                break
    if len(boundaries) >= 4:
        return boundaries[:4]
    criteria = [
        ("Task Achievement", task_achievement),
        ("Coherence & Cohesion", coherence),
        ("Lexical Resource", lexical),
        ("Grammar Range & Accuracy", grammar),
    ]
    return [
        WritingBandBoundary(
            criterion=name,
            current_band=criterion.band,
            next_band=min(9.0, criterion.band + 1.0),
            why_current=criterion.reasoning or criterion.summary,
            required_for_next=(criterion.improvements[0] if criterion.improvements else criterion.summary),
        )
        for name, criterion in criteria
    ]

def _parse_score_boosters(
    feedback: dict,
    *,
    task_achievement: WritingCriterionFeedback,
    coherence: WritingCriterionFeedback,
    lexical: WritingCriterionFeedback,
    grammar: WritingCriterionFeedback,
) -> list[WritingScoreBooster]:
    raw_items = feedback.get("score_boosters") or []
    boosters: list[WritingScoreBooster] = []
    seen: set[str] = set()
    if isinstance(raw_items, list):
        for raw in raw_items:
            if not isinstance(raw, dict):
                continue
            try:
                item = WritingScoreBooster.model_validate(raw)
            except Exception:
                continue
            if item.original and item.original not in seen:
                seen.add(item.original)
                boosters.append(item)
            if len(boosters) >= 6:
                break
    if boosters:
        return boosters
    criteria = [
        ("Task Achievement", task_achievement),
        ("Coherence & Cohesion", coherence),
        ("Lexical Resource", lexical),
        ("Grammar Range & Accuracy", grammar),
    ]
    for name, criterion in criteria:
        for quote in criterion.evidence_quotes[:2]:
            clean = " ".join(str(quote or "").split())
            if not clean or clean in seen:
                continue
            seen.add(clean)
            boosters.append(
                WritingScoreBooster(
                    criterion=name,
                    original=clean,
                    why_it_scores=(criterion.strengths[0] if criterion.strengths else criterion.summary),
                    keep_doing="Keep this pattern in future essays.",
                    band_value=f"Band {criterion.band:.1f} support",
                )
            )
            if len(boosters) >= 6:
                return boosters
    return boosters

def _parse_checklist(feedback: dict, fallback: list[WritingChecklistItem]) -> list[WritingChecklistItem]:
    raw_items = feedback.get("ielts_checklist") or []
    items: list[WritingChecklistItem] = []
    if isinstance(raw_items, list):
        for raw in raw_items:
            if not isinstance(raw, dict):
                continue
            try:
                item = WritingChecklistItem.model_validate(raw)
            except Exception:
                continue
            if item.label:
                items.append(item)
            if len(items) >= 5:
                break
    return items or fallback

def _parse_error_patterns(feedback: dict, fallback: list[WritingErrorPattern]) -> list[WritingErrorPattern]:
    raw_items = feedback.get("error_taxonomy") or []
    items: list[WritingErrorPattern] = []
    total = sum(max(0, int(item.get("count") or 0)) for item in raw_items if isinstance(item, dict)) if isinstance(raw_items, list) else 0
    if isinstance(raw_items, list):
        for raw in raw_items:
            if not isinstance(raw, dict):
                continue
            payload = dict(raw)
            count = max(0, int(payload.get("count") or 0))
            payload.setdefault("percentage", round((count / total) * 100, 1) if total else 0.0)
            try:
                item = WritingErrorPattern.model_validate(payload)
            except Exception:
                continue
            if item.label:
                items.append(item)
            if len(items) >= 6:
                break
    return items or fallback
