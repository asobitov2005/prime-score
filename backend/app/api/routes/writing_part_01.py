from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.writing_dependencies import *

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
        created_at=task.created_at,
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
    # Aggregate supplied classifications only. Text never determines a category.
    buckets: dict[tuple[str, str], dict] = {}
    total = 0
    for item in raw_items:
        category = item.get("category")
        category = getattr(category, "value", category)
        if not isinstance(category, str) or not category.strip():
            continue
        category = category.strip()
        subcategory = item.get("subcategory") or ""
        if not isinstance(subcategory, str):
            subcategory = ""
        key = (category, subcategory)
        bucket = buckets.setdefault(key, {"count": 0, "examples": []})
        bucket["count"] += 1
        total += 1
        original = item.get("original")
        if isinstance(original, str) and original.strip() and original not in bucket["examples"]:
            bucket["examples"].append(original)
    return sorted(
        [
            WritingErrorPattern(
                category=category, subcategory=subcategory,
                label=(subcategory or category).replace("_", " ").title(),
                count=bucket["count"],
                percentage=round(bucket["count"] / total * 100, 1),
                examples=bucket["examples"][:3],
                fix="",
            )
            for (category, subcategory), bucket in buckets.items()
        ],
        key=lambda item: item.count, reverse=True,
    )[:max(0, limit)]
