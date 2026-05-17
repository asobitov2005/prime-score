from __future__ import annotations

import asyncio
import html
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.enums import (
    AiUseCase,
    WritingDifficulty,
    WritingQuestionSubtype,
    WritingSubmissionStatus,
    WritingTaskStatus,
    WritingTaskType,
)
from app.models.gamification import XPTransaction
from app.models.user import User
from app.models.writing import WritingDraft, WritingEvaluation, WritingEvaluationRun, WritingSubmission, WritingTask
from app.schemas.common import DebugPrincipal
from app.schemas.writing import (
    WritingCriterionFeedback,
    WritingDashboardSummary,
    WritingEvaluationRead,
    WritingActionPlan,
    WritingBandBoundary,
    WritingDraftListItem,
    WritingDraftListResponse,
    WritingDraftRead,
    WritingErrorPattern,
    WritingDraftUpsertRequest,
    WritingHistoryItem,
    WritingHistoryResponse,
    WritingInlineAnnotation,
    WritingChecklistItem,
    WritingLimitRead,
    WritingRevisionDiff,
    WritingRoastFeedback,
    WritingScoreBooster,
    WritingSentenceFix,
    WritingTargetAction,
    WritingVocabularySuggestion,
    WritingSubmissionRead,
    WritingSubmitRequest,
    WritingTaskListItem,
    WritingTaskListResponse,
    WritingTaskRead,
    WritingUploadImageResponse,
)
from app.services.object_storage import upload_test_diagram_image
from app.services.ai_config import resolve_ai_use_case_config
from app.services.writing_limits import WritingLimitStatus, resolve_writing_limit_status


router = APIRouter()


def _serialize_limit_status(limit_status: WritingLimitStatus) -> WritingLimitRead:
    return WritingLimitRead(
        is_premium=limit_status.is_premium,
        premium_until=limit_status.premium_until,
        daily_limit=limit_status.daily_limit,
        used_today=limit_status.used_today,
        remaining_today=limit_status.remaining_today,
        can_submit=limit_status.can_submit,
        reset_at=limit_status.reset_at,
        plan_name=limit_status.plan_name,
    )


async def _ensure_writing_submission_allowed(
    *,
    session: AsyncSession,
    current_user: DebugPrincipal,
) -> WritingLimitStatus:
    limit_status = await resolve_writing_limit_status(session, principal=current_user)
    if not limit_status.is_premium:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Premium is required to check IELTS Writing. Upgrade to unlock Writing feedback.",
        )
    if not limit_status.can_submit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily Writing check limit reached. Upgrade your plan or try again after the daily reset.",
        )
    return limit_status


def _writing_xp_breakdown(rows: list[XPTransaction]) -> dict:
    breakdown = {
        "activity_xp": 0,
        "score_bonus": 0,
        "accuracy_bonus": 0,
        "improvement_bonus": 0,
        "streak_bonus": 0,
        "repeat_multiplier": 1,
        "cap_applied": False,
        "total": 0,
    }
    for row in rows:
        amount = int(row.xp_amount or 0)
        tx_type = str(row.transaction_type)
        if tx_type == "TEST_COMPLETION":
            breakdown["activity_xp"] += amount
        elif tx_type == "SCORE_BONUS":
            breakdown["score_bonus"] += amount
        elif tx_type == "ACCURACY_BONUS":
            breakdown["accuracy_bonus"] += amount
        elif tx_type == "IMPROVEMENT_BONUS":
            breakdown["improvement_bonus"] += amount
        elif tx_type in {"STREAK_DAILY", "STREAK_MILESTONE"}:
            breakdown["streak_bonus"] += amount
        metadata = row.metadata_json or {}
        if metadata.get("repeat_multiplier") is not None:
            breakdown["repeat_multiplier"] = metadata.get("repeat_multiplier")
        if metadata.get("cap_applied"):
            breakdown["cap_applied"] = True
        breakdown["total"] += amount
    return breakdown


async def _dispatch_writing_retry(submission_id: UUID) -> str | None:
    from app.services.writing_dispatch import dispatch_writing_grading

    return await dispatch_writing_grading(submission_id)


def _serialize_task_read(task: WritingTask) -> WritingTaskRead:
    return WritingTaskRead(
        id=task.id,
        title=task.title,
        task_type=task.task_type,
        prompt_html=task.prompt_html,
        image_url=task.image_storage_path,
        image_summary=task.image_summary,
        image_summary_status=task.image_summary_status,
        word_minimum=task.word_minimum,
        time_limit_seconds=task.time_limit_seconds,
        status=task.status,
        source=task.source,
        question_subtype=task.question_subtype.value if task.question_subtype else None,
        description=task.description,
        sample_band=task.sample_band,
        created_at=task.created_at,
    )


def _serialize_task_list_item(task: WritingTask) -> WritingTaskListItem:
    return WritingTaskListItem(
        id=task.id,
        title=task.title,
        task_type=task.task_type,
        image_url=task.image_storage_path,
        word_minimum=task.word_minimum,
        time_limit_seconds=task.time_limit_seconds,
        source=task.source,
        question_subtype=task.question_subtype.value if task.question_subtype else None,
        description=task.description,
    )


def _serialize_draft(draft: WritingDraft) -> WritingDraftRead:
    payload = draft.payload or {}
    return WritingDraftRead(
        draft_key=draft.draft_key,
        task_id=draft.task_id,
        task_type=draft.task_type,
        topic=str(payload.get("topic") or ""),
        essay_text=str(payload.get("essay") or ""),
        image_data_url=payload.get("imageDataUrl") if isinstance(payload, dict) else None,
        started=bool(payload.get("started", False)) if isinstance(payload, dict) else False,
        time_spent_seconds=int(draft.time_spent_seconds or 0),
        updated_at=draft.updated_at,
    )


def _serialize_draft_list_item(draft: WritingDraft, task_title: str | None = None) -> WritingDraftListItem:
    payload = draft.payload or {}
    return WritingDraftListItem(
        draft_key=draft.draft_key,
        task_id=draft.task_id,
        task_type=draft.task_type,
        task_title=task_title,
        topic=str(payload.get("topic") or ""),
        essay_text=str(payload.get("essay") or ""),
        image_data_url=payload.get("imageDataUrl") if isinstance(payload, dict) else None,
        started=bool(payload.get("started", False)) if isinstance(payload, dict) else False,
        time_spent_seconds=int(draft.time_spent_seconds or 0),
        updated_at=draft.updated_at,
    )


def _criterion_from_dict(payload: dict | None) -> WritingCriterionFeedback:
    payload = payload or {}
    return WritingCriterionFeedback(
        band=float(payload.get("band", 0.0) or 0.0),
        summary=str(payload.get("summary", "") or ""),
        strengths=list(payload.get("strengths", []) or []),
        improvements=list(payload.get("improvements", []) or []),
        evidence_quotes=list(payload.get("evidence_quotes", []) or []),
        reasoning=str(payload.get("reasoning", "") or ""),
    )


def _build_action_plan(
    *,
    task_achievement: WritingCriterionFeedback,
    coherence: WritingCriterionFeedback,
    lexical: WritingCriterionFeedback,
    grammar: WritingCriterionFeedback,
    next_steps: list[str],
) -> WritingActionPlan:
    criteria = [
        ("Task Achievement", task_achievement),
        ("Coherence & Cohesion", coherence),
        ("Lexical Resource", lexical),
        ("Grammatical Range & Accuracy", grammar),
    ]
    strongest_name, strongest = max(criteria, key=lambda item: item[1].band)
    weakest_name, weakest = min(criteria, key=lambda item: item[1].band)
    fixes: list[str] = []
    seen: set[str] = set()
    for item in [*next_steps, *weakest.improvements, *coherence.improvements, *grammar.improvements, *lexical.improvements]:
        clean = " ".join(str(item or "").split())
        if clean and clean not in seen:
            seen.add(clean)
            fixes.append(clean)
        if len(fixes) >= 3:
            break
    return WritingActionPlan(
        main_limiter=weakest_name,
        main_limiter_band=weakest.band,
        strongest_area=strongest_name,
        strongest_area_band=strongest.band,
        fixes=fixes[:3],
    )


def _annotation_patterns(raw_items: list[dict], *, limit: int = 6) -> list[WritingErrorPattern]:
    total = len(raw_items)
    if total == 0:
        return []
    def classify(item: dict) -> tuple[str, str, str, str]:
        category = str(item.get("category") or "style").lower()
        text = " ".join(
            str(item.get(key) or "")
            for key in ("short_message", "explanation", "examiner_tip", "original")
        ).lower()
        rules = [
            ("grammar", "articles", "Articles", "Check a/an/the before every noun.", ("article", " a ", " an ", " the ")),
            ("grammar", "prepositions", "Prepositions", "Use one natural preposition per phrase, then reread the sentence.", ("preposition", " in ", " on ", " at ", " to ", " for ")),
            ("grammar", "subject_verb_agreement", "Subject-verb agreement", "Match each verb to its real subject.", ("agreement", "subject", "verb form")),
            ("grammar", "tense", "Tense control", "Keep the same time frame inside one sentence.", ("tense", "past", "present")),
            ("punctuation", "commas", "Comma control", "Split long sentences or add commas around clauses.", ("comma", "punctuation")),
            ("lexical", "collocation", "Collocation", "Replace translated phrases with natural academic collocations.", ("collocation", "word choice", "unnatural", "lexical")),
            ("cohesion", "linking", "Linking and flow", "Use linkers only when they show a real logic relation.", ("cohesion", "linking", "transition", "flow")),
        ]
        for rule_category, subcategory, label, fix, needles in rules:
            if any(needle in text for needle in needles):
                return rule_category or category, subcategory, label, fix
        labels = {
            "spelling": ("spelling", "spelling", "Spelling", "Correct the spelling before improving style."),
            "grammar": ("grammar", "general", "Grammar", "Fix sentence-level grammar before adding complex vocabulary."),
            "lexical": ("lexical", "word_choice", "Word choice", "Use precise words from the topic, not vague substitutes."),
            "cohesion": ("cohesion", "flow", "Cohesion", "Make each sentence connect to the previous one."),
            "style": ("style", "tone", "Style", "Make the sentence more formal and direct."),
            "punctuation": ("punctuation", "punctuation", "Punctuation", "Clean punctuation so the idea is easy to read."),
        }
        return labels.get(category, (category, "general", category.replace("_", " ").title(), "Fix this repeated pattern."))

    buckets: dict[str, dict[str, object]] = {}
    for item in raw_items:
        category, subcategory, label, fix = classify(item)
        key = f"{category}:{subcategory}"
        bucket = buckets.setdefault(key, {"category": category, "subcategory": subcategory, "label": label, "fix": fix, "count": 0, "examples": []})
        bucket["count"] = int(bucket["count"]) + 1
        examples = bucket["examples"]
        if isinstance(examples, list) and len(examples) < 3:
            message = " ".join(str(item.get("short_message") or item.get("original") or "").split())
            if message and message not in examples:
                examples.append(message)
    patterns = [
        WritingErrorPattern(
            category=str(bucket["category"]),
            subcategory=str(bucket["subcategory"]),
            label=str(bucket["label"]),
            count=int(bucket["count"]),
            percentage=round((int(bucket["count"]) / total) * 100, 1),
            examples=list(bucket["examples"]) if isinstance(bucket["examples"], list) else [],
            fix=str(bucket["fix"]),
        )
        for bucket in buckets.values()
    ]
    return sorted(patterns, key=lambda item: item.count, reverse=True)[:limit]


def _status_from_signal(has_signal: bool, has_related_issue: bool) -> str:
    if has_signal and not has_related_issue:
        return "met"
    if has_signal or not has_related_issue:
        return "partial"
    return "missing"


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


def _parse_sentence_fixes(feedback: dict, annotations: list[WritingInlineAnnotation]) -> list[WritingSentenceFix]:
    raw_items = feedback.get("sentence_fixes") or []
    fixes: list[WritingSentenceFix] = []
    seen: set[str] = set()
    if isinstance(raw_items, list):
        for raw in raw_items:
            if not isinstance(raw, dict):
                continue
            try:
                item = WritingSentenceFix.model_validate(raw)
            except Exception:
                continue
            if item.original and item.original not in seen:
                seen.add(item.original)
                fixes.append(item)
            if len(fixes) >= 8:
                break
    for annotation in annotations:
        if len(fixes) >= 8 or annotation.original in seen:
            continue
        replacement = annotation.replacements[0] if annotation.replacements else annotation.improved_sentence
        if not replacement:
            continue
        seen.add(annotation.original)
        fixes.append(
            WritingSentenceFix(
                priority=len(fixes) + 1,
                original=annotation.original,
                replacement=replacement,
                corrected_sentence=annotation.improved_sentence or replacement,
                why=annotation.explanation or annotation.short_message,
                band_impact=annotation.band_impact,
                category=annotation.category.value,
            )
        )
    return fixes


def _build_revision_diff(essay_text: str, improved_version: str | None, sentence_fixes: list[WritingSentenceFix]) -> list[WritingRevisionDiff]:
    if not improved_version:
        return []
    diffs: list[WritingRevisionDiff] = []
    for fix in sentence_fixes[:5]:
        revised = fix.corrected_sentence or fix.replacement
        if not fix.original or not revised:
            continue
        diffs.append(
            WritingRevisionDiff(
                original=fix.original,
                revised=revised,
                reason=fix.why,
                criterion=fix.category,
            )
        )
    if diffs:
        return diffs
    if essay_text.strip() != improved_version.strip():
        return [
            WritingRevisionDiff(
                original=essay_text[:220],
                revised=improved_version[:220],
                reason="Improved draft changes wording, grammar, and clarity.",
                criterion="overall",
            )
        ]
    return []


def _default_word_minimum(task_type: WritingTaskType) -> int:
    return 150 if task_type == WritingTaskType.TASK_1 else 250


def _default_time_limit_seconds(task_type: WritingTaskType) -> int:
    return 20 * 60 if task_type == WritingTaskType.TASK_1 else 40 * 60


def _build_custom_task(
    *,
    task_type: WritingTaskType,
    topic: str,
    image_url: str | None = None,
    image_summary: str | None = None,
) -> WritingTask:
    clean_topic = " ".join((topic or "").split())
    title_topic = clean_topic[:120]
    prompt_html = "".join(
        f"<p>{html.escape(line)}</p>"
        for line in clean_topic.splitlines()
        if line.strip()
    ) or f"<p>{html.escape(clean_topic)}</p>"
    return WritingTask(
        title=f"Custom topic: {title_topic}",
        task_type=task_type,
        prompt_html=prompt_html,
        image_storage_path=image_url if task_type == WritingTaskType.TASK_1 else None,
        image_summary=image_summary if task_type == WritingTaskType.TASK_1 else None,
        image_summary_status=(
            "ready"
            if task_type == WritingTaskType.TASK_1 and image_summary
            else "failed"
            if task_type == WritingTaskType.TASK_1 and image_url
            else "not_required"
        ),
        word_minimum=_default_word_minimum(task_type),
        time_limit_seconds=_default_time_limit_seconds(task_type),
        difficulty=WritingDifficulty.MEDIUM,
        status=WritingTaskStatus.DRAFT,
        source="user_custom",
        description=clean_topic,
        sample_band=None,
        sample_answer=None,
        created_by=None,
    )


@router.post("/upload-image", response_model=WritingUploadImageResponse)
async def upload_image(
    file: UploadFile = File(...),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingUploadImageResponse:
    await _ensure_writing_submission_allowed(session=session, current_user=current_user)
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed.",
        )

    payload = await file.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty.",
        )
    if len(payload) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size must be under 10 MB.",
        )

    try:
        url = upload_test_diagram_image(
            content=payload,
            filename=file.filename or "writing-image",
            content_type=file.content_type or "application/octet-stream",
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return WritingUploadImageResponse(url=url)


@router.get("/limits", response_model=WritingLimitRead)
async def get_writing_limits(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingLimitRead:
    limit_status = await resolve_writing_limit_status(session, principal=current_user)
    return _serialize_limit_status(limit_status)


@router.get("/tasks", response_model=WritingTaskListResponse)
async def list_published_tasks(
    task_type: WritingTaskType | None = Query(default=None),
    question_subtype: WritingQuestionSubtype | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskListResponse:
    filters = [WritingTask.status == WritingTaskStatus.PUBLISHED]
    if task_type is not None:
        filters.append(WritingTask.task_type == task_type)
    if question_subtype is not None:
        filters.append(WritingTask.question_subtype == question_subtype)

    total = await session.scalar(
        select(func.count()).select_from(WritingTask).where(*filters)
    ) or 0

    rows = (
        await session.scalars(
            select(WritingTask)
            .where(*filters)
            .order_by(WritingTask.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    return WritingTaskListResponse(
        items=[_serialize_task_list_item(task) for task in rows],
        total=int(total),
    )


@router.get("/tasks/{task_id}", response_model=WritingTaskRead)
async def get_published_task(
    task_id: UUID,
    session: AsyncSession = Depends(get_db_session),
) -> WritingTaskRead:
    task = await session.get(WritingTask, task_id)
    if task is None or task.status != WritingTaskStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    return _serialize_task_read(task)


@router.get("/drafts/{draft_key}", response_model=WritingDraftRead)
async def get_writing_draft(
    draft_key: str,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingDraftRead:
    draft = await session.scalar(
        select(WritingDraft).where(
            WritingDraft.user_id == current_user.id,
            WritingDraft.draft_key == draft_key,
        )
    )
    if draft is None:
        task_id: UUID | None = None
        task_type = WritingTaskType.TASK_1
        if draft_key.startswith("writing-exam-draft:custom:"):
            suffix = draft_key.removeprefix("writing-exam-draft:custom:")
            if suffix == WritingTaskType.TASK_2.value or suffix.startswith(f"{WritingTaskType.TASK_2.value}:"):
                task_type = WritingTaskType.TASK_2
        elif draft_key.startswith("writing-exam-draft:"):
            raw_task_id = draft_key.removeprefix("writing-exam-draft:")
            try:
                task_id = UUID(raw_task_id)
            except ValueError:
                task_id = None
            if task_id is not None:
                task = await session.get(WritingTask, task_id)
                if task is not None:
                    task_type = task.task_type
        return WritingDraftRead(
            draft_key=draft_key,
            task_id=task_id,
            task_type=task_type,
            topic="",
            essay_text="",
            image_data_url=None,
            started=False,
            time_spent_seconds=0,
            updated_at=datetime.now(UTC),
        )
    return _serialize_draft(draft)


@router.get("/drafts", response_model=WritingDraftListResponse)
async def list_writing_drafts(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingDraftListResponse:
    rows = (
        await session.execute(
            select(WritingDraft, WritingTask.title)
            .outerjoin(WritingTask, WritingTask.id == WritingDraft.task_id)
            .where(WritingDraft.user_id == current_user.id)
            .order_by(WritingDraft.updated_at.desc())
        )
    ).all()

    items = [
        _serialize_draft_list_item(draft, task_title)
        for draft, task_title in rows
    ]
    return WritingDraftListResponse(items=items)


@router.put("/drafts/{draft_key}", response_model=WritingDraftRead)
async def save_writing_draft(
    draft_key: str,
    payload: WritingDraftUpsertRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingDraftRead:
    if payload.task_id is not None:
        task = await session.get(WritingTask, payload.task_id)
        if task is None or task.status != WritingTaskStatus.PUBLISHED:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")

    draft = await session.scalar(
        select(WritingDraft).where(
            WritingDraft.user_id == current_user.id,
            WritingDraft.draft_key == draft_key,
        )
    )
    if draft is None:
        draft = WritingDraft(
            user_id=current_user.id,
            draft_key=draft_key,
            task_id=payload.task_id,
            task_type=payload.task_type,
            payload={},
            time_spent_seconds=payload.time_spent_seconds,
        )
        session.add(draft)

    draft.task_id = payload.task_id
    draft.task_type = payload.task_type
    draft.time_spent_seconds = payload.time_spent_seconds
    draft.payload = {
        "topic": (payload.topic or "").strip(),
        "essay": payload.essay_text,
        "imageDataUrl": payload.image_data_url,
        "started": payload.started,
    }

    await session.commit()
    await session.refresh(draft)
    return _serialize_draft(draft)


@router.delete("/drafts/{draft_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_writing_draft(
    draft_key: str,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    draft = await session.scalar(
        select(WritingDraft).where(
            WritingDraft.user_id == current_user.id,
            WritingDraft.draft_key == draft_key,
        )
    )
    if draft is None:
        return None
    await session.delete(draft)
    await session.commit()
    return None


@router.post(
    "/submissions",
    response_model=WritingSubmissionRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_writing(
    payload: WritingSubmitRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingSubmissionRead:
    await _ensure_writing_submission_allowed(session=session, current_user=current_user)

    task: WritingTask | None
    if payload.task_id is not None:
        task = await session.get(WritingTask, payload.task_id)
        if task is None or task.status != WritingTaskStatus.PUBLISHED:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    else:
        task_type = payload.task_type or WritingTaskType.TASK_2
        image_url = (payload.image_url or "").strip() if task_type == WritingTaskType.TASK_1 else ""
        image_summary = ""
        if image_url:
            from app.services.writing_image_summary import generate_image_summary

            resolved_config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_IMAGE_SUMMARY)
            image_summary = await asyncio.to_thread(
                generate_image_summary,
                image_url,
                resolved_config=resolved_config,
            )
        task = _build_custom_task(
            task_type=task_type,
            topic=(payload.topic or "").strip(),
            image_url=image_url or None,
            image_summary=image_summary or None,
        )
        session.add(task)
        await session.flush()

    word_count = len(payload.essay_text.split())

    from app.services.writing_checker import compute_essay_hash

    essay_hash = compute_essay_hash(str(task.id), payload.essay_text, task.task_type.value)

    submission = WritingSubmission(
        user_id=current_user.id,
        task_id=task.id,
        task_type=task.task_type,
        essay_text=payload.essay_text,
        word_count=word_count,
        essay_hash=essay_hash,
        status=WritingSubmissionStatus.QUEUED,
        submitted_at=datetime.now(UTC),
        time_spent_seconds=payload.time_spent_seconds,
        desired_score=payload.desired_score,
    )
    session.add(submission)
    await session.commit()
    await session.refresh(submission)

    from app.services.writing_dispatch import dispatch_writing_grading

    submission.celery_task_id = await dispatch_writing_grading(submission.id)
    await session.commit()
    await session.refresh(submission)

    return WritingSubmissionRead.model_validate(submission)


@router.get("/submissions/{submission_id}", response_model=WritingSubmissionRead)
async def get_submission(
    submission_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingSubmissionRead:
    submission = await session.get(WritingSubmission, submission_id)
    if submission is None or submission.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")
    return WritingSubmissionRead.model_validate(submission)


@router.post(
    "/submissions/{submission_id}/retry",
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_submission(
    submission_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    submission = await session.get(WritingSubmission, submission_id)
    if submission is None or submission.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    if submission.status != WritingSubmissionStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only failed submissions can be retried.",
        )

    submission.status = WritingSubmissionStatus.QUEUED
    submission.error_message = None
    await session.commit()

    submission.celery_task_id = await _dispatch_writing_retry(submission.id)
    await session.commit()

    return WritingSubmissionRead.model_validate(submission)


@router.get("/submissions/{submission_id}/result", response_model=WritingEvaluationRead)
async def get_submission_result(
    submission_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingEvaluationRead:
    submission = await session.get(WritingSubmission, submission_id)
    if submission is None or submission.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    if submission.status != WritingSubmissionStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Evaluation not ready")

    evaluation = await session.scalar(
        select(WritingEvaluation).where(WritingEvaluation.submission_id == submission.id)
    )
    if evaluation is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Evaluation not ready")

    task = await session.get(WritingTask, submission.task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Writing task not found.")
    evaluation_run = await session.scalar(
        select(WritingEvaluationRun).where(WritingEvaluationRun.submission_id == submission.id)
    )

    feedback = evaluation.feedback or {}
    roast_raw = evaluation.roast_feedback or {}
    roast: WritingRoastFeedback | None = None
    if isinstance(roast_raw, dict) and roast_raw:
        try:
            roast = WritingRoastFeedback.model_validate(roast_raw)
        except Exception:
            roast = None
    annotations_raw = evaluation.inline_annotations or []
    annotations: list[WritingInlineAnnotation] = []
    for item in annotations_raw:
        try:
            annotations.append(WritingInlineAnnotation.model_validate(item))
        except Exception:
            continue
    vocabulary_raw = feedback.get("vocabulary_suggestions") or []
    vocabulary_suggestions: list[WritingVocabularySuggestion] = []
    for item in vocabulary_raw:
        try:
            vocabulary_suggestions.append(WritingVocabularySuggestion.model_validate(item))
        except Exception:
            continue
    task_achievement = _criterion_from_dict(feedback.get("task_achievement"))
    coherence = _criterion_from_dict(feedback.get("coherence"))
    lexical = _criterion_from_dict(feedback.get("lexical"))
    grammar = _criterion_from_dict(feedback.get("grammar"))
    next_steps = list(feedback.get("next_steps", []) or [])
    desired_score = getattr(submission, "desired_score", None)
    action_plan = _build_action_plan(
        task_achievement=task_achievement,
        coherence=coherence,
        lexical=lexical,
        grammar=grammar,
        next_steps=next_steps,
    )
    fallback_checklist = _build_checklist(
        task_type=submission.task_type,
        subtype=task.question_subtype,
        essay_text=submission.essay_text,
        feedback=feedback,
        annotations_raw=[item for item in annotations_raw if isinstance(item, dict)],
    )
    fallback_error_patterns = _annotation_patterns(
        [item for item in annotations_raw if isinstance(item, dict)]
    )
    checklist = _parse_checklist(feedback, fallback_checklist)
    error_patterns = _parse_error_patterns(feedback, fallback_error_patterns)
    target_action_plan = _parse_target_actions(
        feedback,
        action_plan,
        evaluation.overall_band,
        desired_score,
    )
    band_boundaries = _parse_band_boundaries(
        feedback,
        task_achievement=task_achievement,
        coherence=coherence,
        lexical=lexical,
        grammar=grammar,
    )
    score_boosters = _parse_score_boosters(
        feedback,
        task_achievement=task_achievement,
        coherence=coherence,
        lexical=lexical,
        grammar=grammar,
    )
    sentence_fixes = _parse_sentence_fixes(feedback, annotations)
    revision_diff = _build_revision_diff(
        submission.essay_text,
        evaluation.improved_version,
        sentence_fixes,
    )
    history_error_trends = await _build_history_error_trends(
        session=session,
        user_id=current_user.id,
    )
    xp_rows = list(
        (
            await session.scalars(
                select(XPTransaction).where(
                    XPTransaction.user_id == current_user.id,
                    XPTransaction.source_type == "writing_submission",
                    XPTransaction.source_id == str(submission.id),
                )
            )
        ).all()
    )
    xp_breakdown = _writing_xp_breakdown(xp_rows)
    user = await session.get(User, current_user.id)

    return WritingEvaluationRead(
        submission_id=submission.id,
        task_id=task.id,
        task_type=submission.task_type,
        task_title=task.title,
        word_count=submission.word_count,
        word_minimum=task.word_minimum,
        desired_score=desired_score,
        time_spent_seconds=submission.time_spent_seconds,
        submitted_at=submission.submitted_at,
        graded_at=evaluation.graded_at,
        essay_text=submission.essay_text,
        overall_band=evaluation.overall_band,
        potential_band=evaluation.potential_band,
        word_count_penalty=evaluation.word_count_penalty,
        task_achievement=task_achievement,
        coherence=coherence,
        lexical=lexical,
        grammar=grammar,
        inline_annotations=annotations,
        vocabulary_suggestions=vocabulary_suggestions,
        improved_version=evaluation.improved_version,
        overall_summary=str(feedback.get("overall_summary", "") or ""),
        next_steps=next_steps,
        action_plan=action_plan,
        target_action_plan=target_action_plan,
        band_boundaries=band_boundaries,
        score_boosters=score_boosters,
        checklist=checklist,
        error_patterns=error_patterns,
        history_error_trends=history_error_trends,
        sentence_fixes=sentence_fixes,
        revision_diff=revision_diff,
        roast=roast,
        is_ai_estimate=True,
        confidence=evaluation_run.confidence if evaluation_run else "Medium",
        possible_score_range=evaluation_run.possible_score_range if evaluation_run else "",
        selected_benchmarks=evaluation_run.selected_benchmarks if evaluation_run else [],
        calibration_result=evaluation_run.calibration_result if evaluation_run else {},
        audit_result=evaluation_run.audit_result if evaluation_run else {},
        meta_learning_note=evaluation_run.meta_learning_note if evaluation_run else "",
        cache_hit=evaluation.cache_hit,
        model_version=evaluation.model_version,
        prompt_version=evaluation.prompt_version,
        grader_profile_version=evaluation.grader_profile_version,
        rubric_version=evaluation.rubric_version,
        anchor_set_version=evaluation.anchor_set_version,
        roast_profile_version=evaluation.roast_profile_version,
        improved_profile_version=evaluation.improved_profile_version,
        annotation_profile_version=evaluation.annotation_profile_version,
        xp_awarded_total=int(xp_breakdown.get("total", 0) or 0),
        xp_breakdown=xp_breakdown,
        xp_level_after=int(user.current_level or 1) if user is not None else None,
        xp_current_streak=int(user.current_streak or 0) if user is not None else None,
    )


@router.get("/history", response_model=WritingHistoryResponse)
async def list_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingHistoryResponse:
    total = await session.scalar(
        select(func.count())
        .select_from(WritingSubmission)
        .where(WritingSubmission.user_id == current_user.id)
    ) or 0

    rows = (
        await session.execute(
            select(WritingSubmission, WritingTask, WritingEvaluation)
            .join(WritingTask, WritingTask.id == WritingSubmission.task_id)
            .outerjoin(
                WritingEvaluation,
                WritingEvaluation.submission_id == WritingSubmission.id,
            )
            .where(WritingSubmission.user_id == current_user.id)
            .order_by(WritingSubmission.submitted_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    items: list[WritingHistoryItem] = []
    for submission, task, evaluation in rows:
        items.append(
            WritingHistoryItem(
                submission_id=submission.id,
                task_id=task.id,
                task_title=task.title,
                task_type=submission.task_type,
                word_count=submission.word_count,
                time_spent_seconds=int(submission.time_spent_seconds or 0),
                overall_band=evaluation.overall_band if evaluation is not None else None,
                status=submission.status,
                submitted_at=submission.submitted_at,
                graded_at=evaluation.graded_at if evaluation is not None else None,
            )
        )

    return WritingHistoryResponse(items=items, total=int(total))


@router.get("/dashboard-summary", response_model=WritingDashboardSummary)
async def dashboard_summary(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingDashboardSummary:
    completed_filter = [
        WritingSubmission.user_id == current_user.id,
        WritingSubmission.status == WritingSubmissionStatus.COMPLETED,
    ]

    total = await session.scalar(
        select(func.count())
        .select_from(WritingSubmission)
        .where(*completed_filter)
    ) or 0

    if total == 0:
        return WritingDashboardSummary(total_submissions=0)

    avg_band, best_band = (
        await session.execute(
            select(
                func.avg(WritingEvaluation.overall_band),
                func.max(WritingEvaluation.overall_band),
            )
            .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
            .where(*completed_filter)
        )
    ).one()

    last_row = (
        await session.execute(
            select(WritingEvaluation.overall_band, WritingSubmission.submitted_at)
            .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
            .where(*completed_filter)
            .order_by(WritingSubmission.submitted_at.desc())
            .limit(1)
        )
    ).first()

    last_band = float(last_row[0]) if last_row else None
    last_submitted_at = last_row[1] if last_row else None

    task_1_avg = await session.scalar(
        select(func.avg(WritingEvaluation.overall_band))
        .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
        .where(*completed_filter, WritingSubmission.task_type == WritingTaskType.TASK_1)
    )
    task_2_avg = await session.scalar(
        select(func.avg(WritingEvaluation.overall_band))
        .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
        .where(*completed_filter, WritingSubmission.task_type == WritingTaskType.TASK_2)
    )

    return WritingDashboardSummary(
        total_submissions=int(total),
        average_band=float(avg_band) if avg_band is not None else None,
        best_band=float(best_band) if best_band is not None else None,
        last_band=last_band,
        last_submitted_at=last_submitted_at,
        task_1_average=float(task_1_avg) if task_1_avg is not None else None,
        task_2_average=float(task_2_avg) if task_2_avg is not None else None,
    )
