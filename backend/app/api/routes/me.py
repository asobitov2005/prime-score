from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.enums import AttemptStatus, NotificationType, PaymentMethod, TestMode, TestScope, TestType
from app.db.session import get_db_session
from app.models.commerce import GiftCode, GiftCodeRedemption, Payment, Plan
from app.models.enums import PaymentStatus
from app.models.ops import Notification
from app.models.test import Test
from app.models.user import User
from app.schemas.common import DebugPrincipal, MessageResponse
from app.schemas.me import (
    FavoriteTestRead,
    MeAccuracyTrendPointRead,
    MeActivityPointRead,
    MeAttemptSummaryRead,
    MeBandProgressPointRead,
    MeDashboardAnalyticsRead,
    MeErrorDistributionItemRead,
    MeGenerateGiftCodeRequest,
    MeGenerateGiftCodeResponse,
    MeGiftCodeRead,
    MeGiftCodeSummaryRead,
    MeImprovementRateRead,
    MePerformanceStudyTimeRead,
    MePerformanceTestCountBucketRead,
    MePerformanceSummaryRead,
    MePersonalBestsRead,
    MeProfileRead,
    MeProfileUpdateRequest,
    MeRedeemCodeRequest,
    MeRedeemCodeResponse,
    MeQuestionTypeAnalysisItemRead,
    MeQuestionTypeComparisonItemRead,
    MeQuestionTypeComparisonRead,
    MeQuestionTypeComparisonTestRead,
    MeScoreDistributionRead,
    MeSpeedMetricsRead,
    MeStatsRead,
    MeWeeklyActivityPointRead,
    MeWritingCriteriaRead,
    MeXpSummaryRead,
    MeXpTransactionRead,
    MeLevelProgressRead,
)
from app.schemas.payments import (
    MePaymentCancelResponse,
    MePaymentCreateRequest,
    MePaymentCreateResponse,
    MePaymentRead,
)
from app.services.attempt_repo import iter_user_attempts_from_db
from app.services.gift_entitlements import (
    ensure_manual_premium_entitlement_for_user,
    generate_user_gift_code,
    get_user_gift_code_summary,
)
from app.services.notification_sender import create_and_send_notification
from app.services.object_storage import upload_user_avatar_image
from app.services.payment_service import (
    DEFAULT_PAYMENT_SUPPORT_CONTACT,
    PENDING_PAYMENT_STATUSES,
    create_plan_payment,
    expire_stale_payments,
)
from app.services.premium_access import reconcile_user_premium_status
from app.services.runtime_store import band_for_raw_score, iter_user_attempts
from app.services.scoring import mc_multiple_question_weight
from app.services.telegram_profile_sync import sync_user_telegram_profile
from app.services.user_names import normalize_user_name_parts
from app.services.xp import (
    PERIOD_ALL_TIME,
    PERIOD_MONTHLY,
    PERIOD_WEEKLY,
    badge_for_user,
    leaderboard_rows,
    level_bounds,
    list_user_xp_transactions,
    get_user_period_xp,
)

router = APIRouter()
MAX_AVATAR_IMAGE_BYTES = 5 * 1024 * 1024

READING_QUESTION_TYPE_LABELS = {
    "reading_mc_single": "Multiple Choice (Single)",
    "reading_mc_multiple": "Multiple Choice (Multiple)",
    "reading_true_false_not_given": "True / False / Not Given",
    "reading_yes_no_not_given": "Yes / No / Not Given",
    "reading_matching_information": "Matching Information",
    "reading_matching_headings": "Matching Headings",
    "reading_matching_features": "Matching Features",
    "reading_matching_sentence_endings": "Matching Sentence Endings",
    "reading_sentence_completion": "Sentence Completion",
    "reading_summary_completion_wordbank": "Summary Completion (Word Bank)",
    "reading_summary_completion_freetext": "Summary Completion (Free Text)",
    "reading_note_completion": "Note Completion",
    "reading_table_completion": "Table Completion",
    "reading_flowchart_completion": "Flow-chart Completion",
    "reading_diagram_labeling": "Diagram Labeling",
    "reading_short_answer": "Short Answer",
}

LISTENING_QUESTION_TYPE_LABELS = {
    "listening_mc_single": "Multiple Choice (Single)",
    "listening_mc_multiple": "Multiple Choice (Multiple)",
    "listening_matching": "Matching",
    "listening_plan_map_labeling": "Plan / Map Labeling",
    "listening_form_completion": "Form Completion",
    "listening_note_completion": "Note Completion",
    "listening_table_completion": "Table Completion",
    "listening_flowchart_completion": "Flow-chart Completion",
    "listening_summary_completion": "Summary Completion",
    "listening_sentence_completion": "Sentence Completion",
    "listening_short_answer": "Short Answer",
}


def _question_type_label(question_type: str, include_module_prefix: bool = False) -> str:
    if question_type in READING_QUESTION_TYPE_LABELS:
        label = READING_QUESTION_TYPE_LABELS[question_type]
        return f"Reading - {label}" if include_module_prefix else label
    if question_type in LISTENING_QUESTION_TYPE_LABELS:
        label = LISTENING_QUESTION_TYPE_LABELS[question_type]
        return f"Listening - {label}" if include_module_prefix else label
    cleaned = question_type.removeprefix("reading_").removeprefix("listening_").replace("_", " ")
    return cleaned.title()


def _question_type_catalog(test_type: TestType | None) -> list[tuple[str, str]]:
    if test_type == TestType.reading:
        return list(READING_QUESTION_TYPE_LABELS.items())
    if test_type == TestType.listening:
        return list(LISTENING_QUESTION_TYPE_LABELS.items())
    return [
        *((key, f"Reading - {label}") for key, label in READING_QUESTION_TYPE_LABELS.items()),
        *((key, f"Listening - {label}") for key, label in LISTENING_QUESTION_TYPE_LABELS.items()),
    ]


def _safe_accuracy(correct_count: int, worked_count: int) -> float:
    if worked_count <= 0:
        return 0.0
    return round((correct_count / worked_count) * 100, 1)


def _count_answered_slots(snapshot: dict[str, object], answers: dict[str, str] | None) -> int:
    if not answers:
        return 0

    answered_slots = 0
    for question in snapshot.get("questions", []):
        if not isinstance(question, dict):
            continue
        question_id = str(question.get("question_id") or "").strip()
        if not question_id:
            continue
        answer_value = str(answers.get(question_id) or "").strip()
        if not answer_value:
            continue

        question_type = str(question.get("question_type") or "")
        if "mc_multiple" in question_type:
            slot_weight = mc_multiple_question_weight(
                question_label=str(question.get("label") or question.get("question_number") or ""),
                accepted_answers=[],
            )
            selected_count = len([part for part in answer_value.split(",") if part.strip()])
            answered_slots += min(slot_weight, max(1, selected_count))
            continue

        answered_slots += 1

    return answered_slots


def _attempt_type_stats(attempt, include_module_prefix: bool = False) -> dict[str, dict[str, int]]:
    stats: dict[str, dict[str, int]] = {}
    for item in attempt.scoring_items or []:
        label = _question_type_label(str(item.get("question_type", "")), include_module_prefix=include_module_prefix)
        answer_value = item.get("answer_value")
        worked = 1 if answer_value is not None and str(answer_value).strip() else 0
        correct = 1 if worked and bool(item.get("is_correct")) else 0
        bucket = stats.setdefault(label, {"worked_count": 0, "correct_count": 0, "error_count": 0})
        bucket["worked_count"] += worked
        bucket["correct_count"] += correct
        bucket["error_count"] += max(0, worked - correct)
    return stats


def _build_progress_series(attempts) -> list[MeBandProgressPointRead]:
    grouped: dict[object, dict[str, object]] = {}
    scored_attempts = sorted(
        [attempt for attempt in attempts if _effective_attempt_band_score(attempt) is not None],
        key=lambda attempt: attempt.completed_at or attempt.started_at,
    )

    for attempt in scored_attempts:
        occurred_at = attempt.completed_at or attempt.started_at
        key = occurred_at.date()
        point = grouped.setdefault(
            key,
            {
                "label": occurred_at.strftime("%d %b"),
                "occurred_at": occurred_at,
                "reading": [],
                "listening": [],
                "writing": [],
            },
        )
        if occurred_at > point["occurred_at"]:
            point["occurred_at"] = occurred_at
        band_score = _effective_attempt_band_score(attempt)
        if band_score is None:
            continue
        band_value = float(band_score)
        test_type = str(attempt.test_snapshot.get("test_type"))
        if test_type == TestType.reading:
            point["reading"].append(band_value)
        elif test_type == TestType.listening:
            point["listening"].append(band_value)
        elif test_type == TestType.writing:
            point["writing"].append(band_value)

    def _average(values: list[float]) -> float | None:
        if not values:
            return None
        return round(sum(values) / len(values), 2)

    return sorted(
        [
            MeBandProgressPointRead(
                label=str(point["label"]),
                occurred_at=point["occurred_at"],
                reading=_average(point["reading"]),
                listening=_average(point["listening"]),
                writing=_average(point["writing"]),
            )
            for point in grouped.values()
        ],
        key=lambda item: item.occurred_at,
    )


def _build_question_type_analysis(attempts, test_type: TestType | None) -> list[MeQuestionTypeAnalysisItemRead]:
    aggregate: dict[str, dict[str, int]] = {
        label: {"worked_count": 0, "correct_count": 0, "error_count": 0}
        for _, label in _question_type_catalog(test_type)
    }
    include_module_prefix = test_type is None
    for attempt in attempts:
        for label, values in _attempt_type_stats(attempt, include_module_prefix=include_module_prefix).items():
            bucket = aggregate.setdefault(label, {"worked_count": 0, "correct_count": 0, "error_count": 0})
            bucket["worked_count"] += values["worked_count"]
            bucket["correct_count"] += values["correct_count"]
            bucket["error_count"] += values["error_count"]

    items = [
        MeQuestionTypeAnalysisItemRead(
            label=label,
            worked_count=values["worked_count"],
            correct_count=values["correct_count"],
            accuracy=_safe_accuracy(values["correct_count"], values["worked_count"]),
            error_count=values["error_count"],
        )
        for label, values in aggregate.items()
    ]
    return sorted(items, key=lambda item: (-item.worked_count, item.label))


def _build_comparison(attempts, test_type: TestType | None) -> MeQuestionTypeComparisonRead:
    completed_attempts = sorted(
        attempts,
        key=lambda attempt: attempt.completed_at or attempt.started_at,
        reverse=True,
    )
    if len(completed_attempts) < 2:
        return MeQuestionTypeComparisonRead()

    attempts_for_comparison = list(reversed(completed_attempts[:4]))
    if len(attempts_for_comparison) < 2:
        return MeQuestionTypeComparisonRead()

    include_module_prefix = test_type is None
    attempt_stats = [_attempt_type_stats(attempt, include_module_prefix=include_module_prefix) for attempt in attempts_for_comparison]
    labels = [label for _, label in _question_type_catalog(test_type)]

    items = [
        MeQuestionTypeComparisonItemRead(
            label=label,
            accuracies=[
                (
                    _safe_accuracy(stats[label]["correct_count"], stats[label]["worked_count"])
                    if label in stats and stats[label]["worked_count"] > 0
                    else None
                )
                for stats in attempt_stats
            ],
        )
        for label in labels
    ]

    for item in items:
        previous_values = [value for value in item.accuracies[:-1] if value is not None]
        item.previous_accuracy = round(sum(previous_values) / len(previous_values), 1) if previous_values else None
        item.current_accuracy = item.accuracies[-1] if item.accuracies else None
        item.delta = (
            round(item.current_accuracy - item.previous_accuracy, 1)
            if item.current_accuracy is not None and item.previous_accuracy is not None
            else None
        )

    items.sort(
        key=lambda item: (
            -(abs(item.delta) if item.delta is not None else -1),
            item.label,
        )
    )

    current_attempt = attempts_for_comparison[-1]
    previous_attempt = attempts_for_comparison[-2]

    return MeQuestionTypeComparisonRead(
        previous_test_title=str(previous_attempt.test_snapshot.get("title", "Previous test")),
        previous_test_date=previous_attempt.completed_at or previous_attempt.started_at,
        current_test_title=str(current_attempt.test_snapshot.get("title", "Current test")),
        current_test_date=current_attempt.completed_at or current_attempt.started_at,
        tests=[
            MeQuestionTypeComparisonTestRead(
                test_title=str(attempt.test_snapshot.get("title", "Test")),
                test_date=attempt.completed_at or attempt.started_at,
            )
            for attempt in attempts_for_comparison
        ],
        items=items,
    )


def _build_error_distribution(analysis: list[MeQuestionTypeAnalysisItemRead]) -> list[MeErrorDistributionItemRead]:
    total_errors = sum(item.error_count for item in analysis)
    if total_errors <= 0:
        return []
    items = [
        MeErrorDistributionItemRead(
            label=item.label,
            error_count=item.error_count,
            share=round((item.error_count / total_errors) * 100, 1),
        )
        for item in analysis
        if item.error_count > 0
    ]
    return sorted(items, key=lambda item: (-item.error_count, item.label))


def _build_performance_summary(attempts) -> MePerformanceSummaryRead:
    reading = MePerformanceTestCountBucketRead()
    listening = MePerformanceTestCountBucketRead()
    writing = MePerformanceTestCountBucketRead()
    study_time = MePerformanceStudyTimeRead()
    seen_test_keys: set[tuple[str, str, str]] = set()

    for attempt in attempts:
        test_type = attempt.test_snapshot.get("test_type")
        scope = attempt.test_snapshot.get("scope") or getattr(attempt, "scope", None)
        bucket = None
        if test_type == TestType.reading:
            bucket = reading
        elif test_type == TestType.listening:
            bucket = listening
        elif test_type == "writing":
            bucket = writing

        if bucket is None:
            continue

        time_spent_sec = max(0, int(getattr(attempt, "time_spent_sec", 0) or 0))
        study_time.total_time_sec += time_spent_sec
        if test_type == TestType.reading:
            study_time.reading_time_sec += time_spent_sec
        elif test_type == TestType.listening:
            study_time.listening_time_sec += time_spent_sec
        elif test_type == "writing":
            study_time.writing_time_sec += time_spent_sec

        sections = list(attempt.test_snapshot.get("sections") or [])
        section_number = 0
        if sections:
            try:
                section_number = int(sections[0].get("section_number") or 0)
            except (TypeError, ValueError):
                section_number = 0

        format_key = str(attempt.test_snapshot.get("format") or "").strip().lower()
        if not format_key:
            if str(scope) == TestScope.full.value:
                format_key = TestScope.full.value
            elif section_number > 0:
                format_key = f"section_{section_number}"
            else:
                format_key = "unknown"

        test_key = (str(getattr(attempt, "test_id", "")), str(test_type), format_key)
        if test_key in seen_test_keys:
            continue
        seen_test_keys.add(test_key)

        if str(scope) == TestScope.full.value or format_key == TestScope.full.value:
            bucket.full_count += 1
        else:
            if section_number == 1:
                bucket.section_1_count += 1
            elif section_number == 2:
                bucket.section_2_count += 1
            elif section_number == 3:
                bucket.section_3_count += 1
            elif section_number == 4:
                bucket.section_4_count += 1

    return MePerformanceSummaryRead(study_time=study_time, reading=reading, listening=listening, writing=writing)


def _profile_from_principal(principal: DebugPrincipal) -> MeProfileRead:
    return MeProfileRead(
        id=principal.id,
        first_name=principal.first_name,
        last_name=principal.last_name,
        username=principal.username,
        phone=principal.phone,
        role=principal.role,
        is_premium=principal.is_premium,
        premium_until=principal.premium_until,
        show_on_leaderboard=principal.show_on_leaderboard,
        telegram_id=principal.telegram_id,
        avatar_url=principal.avatar_url,
        created_at=principal.created_at,
    )


def _profile_from_user(user: User) -> MeProfileRead:
    return MeProfileRead(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        phone=user.phone,
        is_premium=user.is_premium,
        premium_until=user.premium_until,
        show_on_leaderboard=user.show_on_leaderboard,
        telegram_id=user.telegram_id,
        avatar_url=user.avatar_url,
        last_active_at=user.last_active_at,
        created_at=user.created_at,
        total_xp=int(user.total_xp or 0),
        current_level=int(user.current_level or 1),
        current_streak=int(user.current_streak or 0),
        best_streak=int(user.best_streak or 0),
    )


def _build_level_progress(total_xp: int, level: int) -> MeLevelProgressRead:
    floor_xp, next_level_xp = level_bounds(level)
    xp_into_level = max(0, total_xp - floor_xp)
    level_span = max(1, next_level_xp - floor_xp)
    remaining = max(0, next_level_xp - total_xp)
    return MeLevelProgressRead(
        level=level,
        level_floor_xp=floor_xp,
        next_level_xp=next_level_xp,
        xp_into_level=xp_into_level,
        xp_needed_for_next_level=remaining,
        progress_percent=round((xp_into_level / level_span) * 100, 1),
    )


async def _user_xp_summary(session: AsyncSession, user: User) -> MeXpSummaryRead:
    total_xp = int(user.total_xp or 0)
    level = int(user.current_level or 1)
    weekly_xp = await get_user_period_xp(session, user_id=user.id, period_type=PERIOD_WEEKLY)
    monthly_xp = await get_user_period_xp(session, user_id=user.id, period_type=PERIOD_MONTHLY)
    latest_transactions = await list_user_xp_transactions(session, user_id=user.id, limit=20)
    latest_positive_transaction = next(
        (transaction for transaction in latest_transactions if int(transaction.xp_amount or 0) > 0),
        None,
    )
    latest_xp_gain = int(latest_positive_transaction.xp_amount or 0) if latest_positive_transaction else None
    return MeXpSummaryRead(
        total_xp=total_xp,
        level=level,
        current_streak=int(user.current_streak or 0),
        best_streak=int(user.best_streak or 0),
        weekly_xp=weekly_xp,
        monthly_xp=monthly_xp,
        latest_xp_gain=latest_xp_gain,
        progress=_build_level_progress(total_xp, level),
    )


async def _leaderboard_rank_for_user(session: AsyncSession, *, user_id: UUID) -> int | None:
    rank = None
    rows = await leaderboard_rows(session, period_type=PERIOD_ALL_TIME)
    ordered_rows = sorted(
        rows,
        key=lambda item: (
            int(item[0].xp_total or 0),
            int(item[1].current_streak or 0),
            float(item[0].average_score or 0.0),
            int(item[0].full_mock_completions or 0),
            -(
                item[0].achieved_at.timestamp()
                if item[0].achieved_at is not None
                else float("inf")
            ),
        ),
        reverse=True,
    )
    for index, (_, row_user) in enumerate(ordered_rows, start=1):
        if row_user.id == user_id:
            rank = index
            break
    return rank


def _serialize_xp_transaction(row) -> MeXpTransactionRead:
    metadata = dict(row.metadata_json or {})
    return MeXpTransactionRead(
        id=row.id,
        type=row.transaction_type,
        source_type=row.source_type,
        source_id=row.source_id,
        xp_amount=int(row.xp_amount or 0),
        message=str(metadata.get("message") or f"{int(row.xp_amount or 0):+d} XP"),
        flagged=bool(metadata.get("flagged")),
        created_at=row.created_at,
        metadata=metadata,
    )


def _serialize_me_payment(payment: Payment, plan: Plan | None) -> MePaymentRead:
    payment_method_values = {item.value for item in PaymentMethod}
    method_value = payment.provider if payment.provider in payment_method_values else PaymentMethod.card_transfer.value
    exposes_card_details = str(payment.status or "") in PENDING_PAYMENT_STATUSES
    support_contact = str(payment.meta.get("support_contact") or DEFAULT_PAYMENT_SUPPORT_CONTACT)
    payment_instructions = str(
        payment.meta.get("payment_instructions")
        or "Transfer the amount to the card, then send a screenshot to Telegram support."
    )
    return MePaymentRead(
        id=payment.id,
        invoice_code=payment.invoice_code,
        plan_id=payment.plan_id,
        plan_name=plan.name if plan is not None else str(payment.meta.get("plan_name", "Unknown plan")),
        duration_days=plan.duration_days if plan is not None else None,
        method=PaymentMethod(method_value),
        status=str(payment.status or "pending"),
        base_amount=payment.base_amount,
        compare_at_amount=payment.compare_at_amount,
        amount=payment.amount,
        discount_amount=payment.discount_amount,
        currency=payment.currency,
        card_label=payment.card_label if exposes_card_details else None,
        card_number=payment.card_number if exposes_card_details else None,
        support_contact=support_contact,
        payment_instructions=payment_instructions,
        expires_at=payment.expires_at,
        matched_at=payment.matched_at,
        paid_at=payment.paid_at,
        archived_at=payment.archived_at,
        granted_until=payment.granted_until,
        status_reason=payment.status_reason,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
    )


def _serialize_me_gift_code_summary(payload: dict[str, object]) -> MeGiftCodeSummaryRead:
    items = payload.get("items", [])
    recent_codes = payload.get("recent_codes", [])
    return MeGiftCodeSummaryRead(
        items=list(items),
        recent_codes=[MeGiftCodeRead(**item) for item in recent_codes if isinstance(item, dict)],
        total_available_count=int(payload.get("total_available_count", 0) or 0),
        can_generate=bool(payload.get("can_generate", False)),
    )


@router.get("", response_model=MeProfileRead)
async def get_me(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeProfileRead:
    user = await session.get(User, current_user.id)
    if user is None:
        return _profile_from_principal(current_user)

    await reconcile_user_premium_status(session, user=user)
    await sync_user_telegram_profile(user)
    if current_user.avatar_url and not user.avatar_is_custom:
        user.avatar_url = current_user.avatar_url
    await session.commit()
    await session.refresh(user)
    return _profile_from_user(user)


@router.patch("", response_model=MeProfileRead)
async def update_me(
    payload: MeProfileUpdateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeProfileRead:
    updates = payload.model_dump(exclude_unset=True)
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    await reconcile_user_premium_status(session, user=user)

    if "first_name" in updates or "last_name" in updates:
        normalized_first, normalized_last = normalize_user_name_parts(
            updates.get("first_name", user.first_name),
            updates.get("last_name", user.last_name),
        )
        updates["first_name"] = normalized_first
        updates["last_name"] = normalized_last
        user.name_is_custom = True

    if "username" in updates:
        user.username_is_custom = True

    for field_name, value in updates.items():
        setattr(user, field_name, value)

    await session.commit()
    await session.refresh(user)
    return _profile_from_user(user)


async def _read_avatar_upload(file: UploadFile) -> bytes:
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed.")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty.")
    if len(payload) > MAX_AVATAR_IMAGE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar image must be under 5 MB.")
    return payload


@router.post("/avatar", response_model=MeProfileRead)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeProfileRead:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    await reconcile_user_premium_status(session, user=user)

    payload = await _read_avatar_upload(file)
    try:
        user.avatar_url = upload_user_avatar_image(
            content=payload,
            filename=file.filename or "avatar-image",
            content_type=file.content_type or "application/octet-stream",
        )
        user.avatar_is_custom = True
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    await session.commit()
    await session.refresh(user)
    return _profile_from_user(user)


@router.delete("/avatar", response_model=MeProfileRead)
async def delete_my_avatar(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeProfileRead:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    await reconcile_user_premium_status(session, user=user)

    user.avatar_url = None
    user.avatar_is_custom = True
    await session.commit()
    await session.refresh(user)
    return _profile_from_user(user)


@router.get("/gift-codes", response_model=MeGiftCodeSummaryRead)
async def list_my_gift_codes(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeGiftCodeSummaryRead:
    user = await session.get(User, current_user.id)
    if user is not None:
        await ensure_manual_premium_entitlement_for_user(session, user=user)
        await session.commit()
    summary = await get_user_gift_code_summary(session, user_id=current_user.id)
    return _serialize_me_gift_code_summary(summary)


@router.post("/gift-codes/generate", response_model=MeGenerateGiftCodeResponse)
async def generate_my_gift_code(
    payload: MeGenerateGiftCodeRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeGenerateGiftCodeResponse:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    try:
        gift_code = await generate_user_gift_code(
            session,
            user=user,
            gift_days=payload.gift_days,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await session.commit()
    summary = await get_user_gift_code_summary(session, user_id=user.id)
    duration_days = 0
    for item in summary.get("recent_codes", []):
        if isinstance(item, dict) and item.get("id") == gift_code.id:
            duration_days = int(item.get("duration_days", 0) or 0)
            break

    return MeGenerateGiftCodeResponse(
        message=f"Gift code generated for {payload.gift_days} premium days.",
        gift_code=MeGiftCodeRead(
            id=gift_code.id,
            code=gift_code.code,
            duration_days=duration_days or payload.gift_days,
            status="available",
            expires_at=gift_code.expires_at,
            redeemed_at=gift_code.redeemed_at,
            created_at=gift_code.created_at,
        ),
        summary=_serialize_me_gift_code_summary(summary),
    )


@router.post("/redeem-code", response_model=MeRedeemCodeResponse)
async def redeem_code(
    payload: MeRedeemCodeRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeRedeemCodeResponse:
    normalized_code = payload.code.strip().replace(" ", "").upper()
    now = datetime.now(UTC)

    if not normalized_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a redeem code first.")

    gift_code = await session.scalar(
        select(GiftCode).where(func.upper(GiftCode.code) == normalized_code)
    )
    if gift_code is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redeem code was not found.")

    if gift_code.expires_at and gift_code.expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code has expired.")

    if gift_code.starts_at and gift_code.starts_at > now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code is not active yet.")

    if gift_code.status == PaymentStatus.PAUSED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code is not active yet.")

    if gift_code.status == PaymentStatus.FAILED or gift_code.status == PaymentStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code is no longer available.")

    if gift_code.used_count >= gift_code.max_uses:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This redeem code has reached its usage limit.")

    if gift_code.plan_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This redeem code is not linked to a premium plan yet.")

    plan = await session.get(Plan, gift_code.plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The plan linked to this redeem code was not found.")

    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    if gift_code.purchaser_user_id == user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot redeem your own gift code.")

    has_active_premium = bool(user.is_premium and user.premium_until and user.premium_until > now)
    if gift_code.target_user_type == "premium" and not has_active_premium:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This redeem code is only for premium users.")
    if gift_code.target_user_type == "free" and has_active_premium:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This redeem code is only for free users.")

    prior_uses = await session.scalar(
        select(func.count())
        .select_from(GiftCodeRedemption)
        .where(
            GiftCodeRedemption.gift_code_id == gift_code.id,
            GiftCodeRedemption.user_id == user.id,
        )
    ) or 0
    if prior_uses >= gift_code.per_user_limit:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already reached the per-user limit for this redeem code.")

    premium_start = user.premium_until if has_active_premium and user.premium_until else now
    premium_until = premium_start + timedelta(days=plan.duration_days)

    user.is_premium = True
    user.premium_until = premium_until

    redemption = GiftCodeRedemption(
        gift_code_id=gift_code.id,
        user_id=user.id,
        redeemed_at=now,
        premium_starts_at=premium_start,
        premium_until=premium_until,
    )
    session.add(redemption)

    gift_code.recipient_user_id = user.id
    gift_code.redeemed_at = now
    gift_code.used_count += 1
    if gift_code.used_count >= gift_code.max_uses:
        gift_code.status = PaymentStatus.COMPLETED

    message = f"Premium unlocked for {plan.duration_days} days. Active until {premium_until.strftime('%d %b %Y')}."

    await create_and_send_notification(
        session,
        user_id=user.id,
        type=NotificationType.gift_received,
        title="Premium activated!",
        body=message,
        telegram_text=f"🎉 <b>Premium activated!</b>\n\n{message}",
    )

    await session.commit()

    return MeRedeemCodeResponse(
        message=message,
        code=gift_code.code,
        plan_name=plan.name,
        duration_days=plan.duration_days,
        is_premium=True,
        premium_until=premium_until,
    )


@router.get("/payments", response_model=list[MePaymentRead])
async def list_my_payments(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MePaymentRead]:
    expired_count = await expire_stale_payments(session)
    if expired_count:
        await session.commit()

    rows = (
        await session.execute(
            select(Payment, Plan)
            .outerjoin(Plan, Payment.plan_id == Plan.id)
            .where(
                Payment.user_id == current_user.id,
                Payment.status.in_(("pending", "matched", "expired", "canceled", "review", "failed")),
            )
            .order_by(Payment.created_at.desc())
            .limit(20)
        )
    ).all()
    return [_serialize_me_payment(payment, plan) for payment, plan in rows]


@router.post("/payments", response_model=MePaymentCreateResponse, status_code=201)
async def create_my_payment(
    payload: MePaymentCreateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MePaymentCreateResponse:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    plan = await session.get(Plan, payload.plan_id)
    if plan is None or str(plan.catalog or "public") != "public" or not plan.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected subscription plan was not found.")

    try:
        payment = await create_plan_payment(session, user=user, plan=plan)
        await session.commit()
        await session.refresh(payment)
    except ValueError as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create payment invoice.") from exc

    return MePaymentCreateResponse(
        message="Invoice created. Transfer the amount to the card and send the screenshot to Telegram support.",
        payment=_serialize_me_payment(
            payment,
            await session.get(Plan, payment.plan_id) if payment.plan_id else None,
        ),
    )


@router.post("/payments/{payment_id}/cancel", response_model=MePaymentCancelResponse)
async def cancel_my_payment(
    payment_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MePaymentCancelResponse:
    payment = await session.get(Payment, payment_id)
    if payment is None or payment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment invoice was not found.")
    if str(payment.status) not in PENDING_PAYMENT_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only active invoices can be canceled.")

    payment.status = "canceled"
    payment.archived_at = datetime.now(UTC)
    payment.status_reason = "Canceled by user."

    await session.commit()
    plan = await session.get(Plan, payment.plan_id) if payment.plan_id else None
    return MePaymentCancelResponse(
        message="Payment invoice canceled.",
        payment=_serialize_me_payment(payment, plan),
    )


async def _load_attempts(current_user: DebugPrincipal, session: AsyncSession):
    try:
        attempts = await iter_user_attempts_from_db(session, user_id=current_user.id)
        if attempts:
            return attempts
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
    return iter_user_attempts(current_user.id)


def _filter_attempts_by_type(attempts, test_type: TestType | None):
    if test_type is None:
        return attempts
    return [
        attempt
        for attempt in attempts
        if attempt.test_snapshot.get("test_type") == test_type
    ]


def _attempt_scope_value(attempt) -> str:
    snapshot = attempt.test_snapshot if isinstance(attempt.test_snapshot, dict) else {}
    scope = snapshot.get("scope")
    if scope is None:
        scope = getattr(attempt, "scope", None)
    return str(getattr(scope, "value", scope) or "")


def _effective_attempt_band_score(attempt) -> Decimal | float | None:
    snapshot = attempt.test_snapshot if isinstance(attempt.test_snapshot, dict) else {}
    test_type = TestType(str(snapshot.get("test_type", TestType.reading)))
    if attempt.band_score is not None and (
        _attempt_scope_value(attempt) == TestScope.full.value
        or test_type == TestType.writing
    ):
        return attempt.band_score
    if attempt.raw_score is None:
        return None

    return band_for_raw_score(test_type, int(attempt.raw_score))


async def _load_writing_attempts(current_user: DebugPrincipal, session: AsyncSession):
    from app.models.writing import WritingSubmission, WritingEvaluation, WritingTask
    from app.models.enums import WritingSubmissionStatus
    from app.core.enums import AttemptStatus
    from app.services.runtime_store import AttemptRuntime

    rows = (await session.execute(
        select(WritingSubmission, WritingEvaluation, WritingTask)
        .outerjoin(WritingEvaluation, WritingEvaluation.submission_id == WritingSubmission.id)
        .join(WritingTask, WritingTask.id == WritingSubmission.task_id)
        .where(WritingSubmission.user_id == current_user.id)
    )).all()

    adapters = []
    for sub, ev, task in rows:
        status = AttemptStatus.completed if sub.status == WritingSubmissionStatus.COMPLETED else AttemptStatus.in_progress
        section_number = 1 if sub.task_type.value == "task_1" else 2

        snapshot = {
            "test_type": "writing",
            "scope": "section",
            "format": f"section_{section_number}",
            "sections": [{"section_number": section_number}],
            "title": task.title,
        }

        band_score = ev.overall_band if ev else None

        metadata = {
            "writing_criteria": {
                "task_achievement": ev.task_achievement_band if ev else None,
                "coherence_cohesion": ev.coherence_band if ev else None,
                "lexical_resource": ev.lexical_band if ev else None,
                "grammatical_range_accuracy": ev.grammar_band if ev else None,
            }
        }

        adapters.append(AttemptRuntime(
            attempt_id=sub.id,
            user_id=sub.user_id,
            test_id=task.id,
            test_version=1,
            scope=TestScope.section,
            section_id=None,
            mode=TestMode.practice, # Writing is generally practice for now
            status=status,
            started_at=sub.submitted_at,
            completed_at=sub.submitted_at,
            time_spent_sec=sub.time_spent_seconds,
            raw_score=None,
            total_questions=0,
            band_score=Decimal(str(band_score)) if band_score is not None else None,
            test_snapshot=snapshot,
            metadata=metadata,
            scoring_items=[]
        ))

    return adapters


@router.get("/stats", response_model=MeStatsRead)
async def get_stats(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeStatsRead:
    attempts = await _load_attempts(current_user, session)
    user = await session.get(User, current_user.id)
    completed = [attempt for attempt in attempts if attempt.status == AttemptStatus.completed]
    banded = [
        band
        for attempt in completed
        if (band := _effective_attempt_band_score(attempt)) is not None
    ]
    reading_bands = [
        band
        for attempt in completed
        if attempt.test_snapshot.get("test_type") == TestType.reading
        and (band := _effective_attempt_band_score(attempt)) is not None
    ]
    listening_bands = [
        band
        for attempt in completed
        if attempt.test_snapshot.get("test_type") == TestType.listening
        and (band := _effective_attempt_band_score(attempt)) is not None
    ]
    average_band = (
        sum(banded, start=banded[0].__class__("0")) / len(banded)
        if banded
        else None
    )
    weekly_xp = await get_user_period_xp(session, user_id=current_user.id, period_type=PERIOD_WEEKLY)
    monthly_xp = await get_user_period_xp(session, user_id=current_user.id, period_type=PERIOD_MONTHLY)
    leaderboard_rank = await _leaderboard_rank_for_user(session, user_id=current_user.id)
    return MeStatsRead(
        attempts_total=len(attempts),
        current_streak=int((user.current_streak if user else current_user.model_dump().get("current_streak")) or 0),
        average_band=average_band,
        reading_band=max(reading_bands) if reading_bands else None,
        listening_band=max(listening_bands) if listening_bands else None,
        leaderboard_rank=leaderboard_rank if current_user.show_on_leaderboard else None,
        active_sessions=2,
        total_xp=int(user.total_xp or 0) if user is not None else 0,
        current_level=int(user.current_level or 1) if user is not None else 1,
        weekly_xp=weekly_xp,
        monthly_xp=monthly_xp,
    )


@router.get("/xp-summary", response_model=MeXpSummaryRead)
async def get_xp_summary(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeXpSummaryRead:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")
    return await _user_xp_summary(session, user)


@router.get("/xp-transactions", response_model=list[MeXpTransactionRead])
async def get_xp_transactions(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    limit: int = Query(default=30, ge=1, le=100),
) -> list[MeXpTransactionRead]:
    rows = await list_user_xp_transactions(session, user_id=current_user.id, limit=limit)
    return [_serialize_xp_transaction(row) for row in rows]


@router.get("/activity", response_model=list[MeActivityPointRead])
async def get_activity(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MeActivityPointRead]:
    attempts = await _load_attempts(current_user, session)
    grouped: dict[date, dict[str, int]] = {}
    for attempt in attempts:
        key = attempt.started_at.date()
        entry = grouped.setdefault(key, {
            "attempts_count": 0, 
            "time_spent_sec": 0,
            "reading_time_sec": 0,
            "listening_time_sec": 0,
            "writing_time_sec": 0,
        })
        entry["attempts_count"] += 1
        entry["time_spent_sec"] += attempt.time_spent_sec
        
        test_type = str(attempt.test_snapshot.get("test_type", ""))
        if test_type == "reading":
            entry["reading_time_sec"] += attempt.time_spent_sec
        elif test_type == "listening":
            entry["listening_time_sec"] += attempt.time_spent_sec
        elif test_type == "writing":
            entry["writing_time_sec"] += attempt.time_spent_sec

    return [
        MeActivityPointRead(activity_date=activity_date, **values)
        for activity_date, values in sorted(grouped.items(), reverse=True)
    ]


@router.get("/attempts", response_model=list[MeAttemptSummaryRead])
async def get_attempts(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MeAttemptSummaryRead]:
    attempts = await _load_attempts(current_user, session)
    test_ids = {attempt.test_id for attempt in attempts}
    attempt_ids = {attempt.attempt_id for attempt in attempts}
    
    source_by_test_id: dict[UUID, str] = {}
    format_by_test_id: dict[UUID, str] = {}
    if test_ids:
        rows = await session.execute(select(Test.id, Test.source, Test.format).where(Test.id.in_(test_ids)))
        for test_id, source, test_format in rows.all():
            source_by_test_id[test_id] = str(source.value if hasattr(source, "value") else source)
            format_by_test_id[test_id] = str(test_format.value if hasattr(test_format, "value") else test_format)
            
    violations_by_attempt_id: dict[UUID, int] = {}
    if attempt_ids:
        from app.models.attempt import AttemptEvent
        violation_events = await session.execute(
            select(AttemptEvent.attempt_id, func.count(AttemptEvent.id))
            .where(AttemptEvent.attempt_id.in_(attempt_ids))
            .where(AttemptEvent.event_type.in_(["violation_exit_fullscreen", "violation_tab_switch", "violation_window_blur", "violation_devtools"]))
            .group_by(AttemptEvent.attempt_id)
        )
        violations_by_attempt_id = {row[0]: row[1] for row in violation_events.all()}

    items: list[MeAttemptSummaryRead] = []
    for attempt in attempts:
        snapshot = attempt.test_snapshot
        snapshot_source = snapshot.get("source")
        if snapshot_source is None and isinstance(snapshot.get("metadata"), dict):
            snapshot_source = snapshot["metadata"].get("source")
        total_questions = max(0, int(getattr(attempt, "total_questions", 0) or 0))
        answered_count = _count_answered_slots(snapshot, getattr(attempt, "answers", None))
        progress_percent = round((answered_count / total_questions) * 100) if total_questions > 0 else 0
        items.append(
            MeAttemptSummaryRead(
                attempt_id=attempt.attempt_id,
                test_id=attempt.test_id,
                test_title=str(snapshot.get("title", "Untitled")),
                test_type=snapshot.get("test_type"),
                test_format=str(snapshot.get("format") or format_by_test_id.get(attempt.test_id) or "full"),
                mode=attempt.mode,
                status=attempt.status,
                access_type=snapshot.get("access_type"),
                source=snapshot_source or source_by_test_id.get(attempt.test_id),
                raw_score=attempt.raw_score,
                band_score=_effective_attempt_band_score(attempt),
                total_questions=total_questions,
                time_spent_sec=max(0, int(getattr(attempt, "time_spent_sec", 0) or 0)),
                answered_count=answered_count,
                progress_percent=max(0, min(progress_percent, 100)),
                time_limit_seconds=max(0, int(snapshot.get("time_limit_seconds", 0) or 0)),
                last_answered_question_number=(
                    int(attempt.metadata.get("last_answered_question_number"))
                    if attempt.metadata.get("last_answered_question_number") is not None
                    else None
                ),
                started_at=attempt.started_at,
                completed_at=getattr(attempt, "completed_at", None),
                updated_at=getattr(attempt, "updated_at", None) or attempt.started_at,
                violation_count=violations_by_attempt_id.get(attempt.attempt_id, 0),
            )
        )
    return items


def _build_accuracy_trend(attempts) -> list[MeAccuracyTrendPointRead]:
    scored = sorted(
        [a for a in attempts if a.raw_score is not None and getattr(a, "total_questions", 0)],
        key=lambda a: a.completed_at or a.started_at,
    )
    items: list[MeAccuracyTrendPointRead] = []
    for attempt in scored[-20:]:
        total_q = max(1, int(getattr(attempt, "total_questions", 0) or 1))
        accuracy = round((int(attempt.raw_score) / total_q) * 100, 1)
        occurred = attempt.completed_at or attempt.started_at
        items.append(MeAccuracyTrendPointRead(
            date=occurred.strftime("%d %b"),
            accuracy=accuracy,
            band=(
                float(band_score)
                if (band_score := _effective_attempt_band_score(attempt)) is not None
                else None
            ),
            test_type=attempt.test_snapshot.get("test_type"),
        ))
    return items


def _build_weekly_activity(attempts) -> list[MeWeeklyActivityPointRead]:
    now = datetime.now(UTC)
    items: list[MeWeeklyActivityPointRead] = []
    for week_offset in range(11, -1, -1):
        week_end = now - timedelta(days=week_offset * 7)
        week_start = week_end - timedelta(days=7)
        week_attempts = [
            a for a in attempts
            if (a.started_at and week_start <= a.started_at <= week_end)
        ]
        total_time = sum(max(0, int(getattr(a, "time_spent_sec", 0) or 0)) for a in week_attempts)
        label = week_start.strftime("%d %b")
        items.append(MeWeeklyActivityPointRead(
            week_label=label,
            attempts_count=len(week_attempts),
            time_spent_min=total_time // 60,
        ))
    return items


def _build_score_distribution(attempts) -> MeScoreDistributionRead:
    dist = MeScoreDistributionRead()
    for attempt in attempts:
        band = _effective_attempt_band_score(attempt)
        if band is None:
            continue
        b = float(band)
        if b < 3.5:
            dist.band_1_to_3 += 1
        elif b < 5.0:
            dist.band_3_5_to_5 += 1
        elif b < 6.5:
            dist.band_5_to_6_5 += 1
        elif b < 7.5:
            dist.band_6_5_to_7_5 += 1
        else:
            dist.band_7_5_to_9 += 1
    return dist


def _build_personal_bests(all_attempts, completed_attempts) -> MePersonalBestsRead:
    bands = [
        float(band)
        for attempt in completed_attempts
        if (band := _effective_attempt_band_score(attempt)) is not None
    ]
    accuracies = [
        round((int(a.raw_score) / max(1, int(getattr(a, "total_questions", 0) or 1))) * 100, 1)
        for a in completed_attempts if a.raw_score is not None
    ]

    # Streak calculation
    dates_set: set[str] = set()
    for a in all_attempts:
        d = a.started_at
        if d:
            dates_set.add(d.strftime("%Y-%m-%d"))

    today = datetime.now(UTC).date()
    current_streak = 0
    longest_streak = 0
    streak = 0
    check_date = today
    while True:
        if check_date.isoformat() in dates_set:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    current_streak = streak

    # Longest streak from all dates
    if dates_set:
        sorted_dates = sorted(dates_set)
        streak = 1
        for i in range(1, len(sorted_dates)):
            prev = datetime.strptime(sorted_dates[i - 1], "%Y-%m-%d").date()
            curr = datetime.strptime(sorted_dates[i], "%Y-%m-%d").date()
            if (curr - prev).days == 1:
                streak += 1
            else:
                longest_streak = max(longest_streak, streak)
                streak = 1
        longest_streak = max(longest_streak, streak)

    # Fastest full test
    full_times = [
        int(getattr(a, "time_spent_sec", 0) or 0)
        for a in completed_attempts
        if (a.test_snapshot.get("scope") or "") == "full" and int(getattr(a, "time_spent_sec", 0) or 0) > 0
    ]

    return MePersonalBestsRead(
        best_band=max(bands) if bands else None,
        best_accuracy=max(accuracies) if accuracies else None,
        longest_streak=longest_streak,
        current_streak=current_streak,
        fastest_full_test_sec=min(full_times) if full_times else None,
    )


def _build_speed_metrics(completed_attempts) -> MeSpeedMetricsRead:
    reading_times: list[float] = []
    listening_times: list[float] = []
    all_times: list[float] = []

    for a in completed_attempts:
        time_sec = max(0, int(getattr(a, "time_spent_sec", 0) or 0))
        total_q = max(1, int(getattr(a, "total_questions", 0) or 1))
        if time_sec <= 0:
            continue
        tpq = time_sec / total_q
        all_times.append(tpq)
        test_type = a.test_snapshot.get("test_type")
        if test_type == TestType.reading:
            reading_times.append(tpq)
        elif test_type == TestType.listening:
            listening_times.append(tpq)

    return MeSpeedMetricsRead(
        avg_time_per_question_sec=round(sum(all_times) / len(all_times), 1) if all_times else None,
        reading_avg_sec_per_question=round(sum(reading_times) / len(reading_times), 1) if reading_times else None,
        listening_avg_sec_per_question=round(sum(listening_times) / len(listening_times), 1) if listening_times else None,
    )


def _build_improvement_rate(completed_attempts) -> MeImprovementRateRead:
    banded = sorted(
        [a for a in completed_attempts if _effective_attempt_band_score(a) is not None],
        key=lambda a: a.completed_at or a.started_at,
    )
    if len(banded) < 2:
        return MeImprovementRateRead()

    last_5 = banded[-5:]
    prev_start = max(0, len(banded) - 10)
    prev_end = max(0, len(banded) - 5)
    prev_5 = banded[prev_start:prev_end] if prev_end > prev_start else []

    last_avg = sum(float(_effective_attempt_band_score(a) or 0) for a in last_5) / len(last_5)
    if not prev_5:
        return MeImprovementRateRead(last_5_avg_band=round(last_avg, 2))

    prev_avg = sum(float(_effective_attempt_band_score(a) or 0) for a in prev_5) / len(prev_5)
    delta = round(last_avg - prev_avg, 2)
    pct = round((delta / prev_avg) * 100, 1) if prev_avg > 0 else 0.0

    return MeImprovementRateRead(
        last_5_avg_band=round(last_avg, 2),
        prev_5_avg_band=round(prev_avg, 2),
        delta=delta,
        percent_change=pct,
    )


@router.get("/analytics", response_model=MeDashboardAnalyticsRead)
async def get_dashboard_analytics(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    test_type: TestType | None = Query(default=None),
) -> MeDashboardAnalyticsRead:
    all_attempts = await _load_attempts(current_user, session)
    writing_attempts = await _load_writing_attempts(current_user, session)
    all_attempts.extend(writing_attempts)
    completed = [
        attempt
        for attempt in all_attempts
        if attempt.status in {AttemptStatus.completed, AttemptStatus.auto_submitted}
    ]
    filtered_completed = _filter_attempts_by_type(completed, test_type)
    analysis = _build_question_type_analysis(filtered_completed, test_type)
    return MeDashboardAnalyticsRead(
        performance_summary=_build_performance_summary(filtered_completed),
        writing_criteria=_build_writing_criteria(filtered_completed),
        question_type_analysis=analysis,
        comparison=_build_comparison(filtered_completed, test_type),
        error_distribution=_build_error_distribution(analysis),
        progress_series=_build_progress_series(filtered_completed),
        accuracy_trend=_build_accuracy_trend(filtered_completed),
        weekly_activity=_build_weekly_activity(all_attempts),
        score_distribution=_build_score_distribution(filtered_completed),
        personal_bests=_build_personal_bests(all_attempts, filtered_completed),
        speed_metrics=_build_speed_metrics(filtered_completed),
        improvement_rate=_build_improvement_rate(filtered_completed),
    )


def _build_writing_criteria(attempts) -> MeWritingCriteriaRead | None:
    writing_attempts = [
        a for a in attempts
        if a.test_snapshot.get("test_type") == "writing"
        and a.metadata.get("writing_criteria")
    ]
    if not writing_attempts:
        return None

    ta, cc, lr, gra = 0.0, 0.0, 0.0, 0.0
    count_ta, count_cc, count_lr, count_gra = 0, 0, 0, 0

    for a in writing_attempts:
        c = a.metadata["writing_criteria"]
        if c.get("task_achievement") is not None:
            ta += float(c["task_achievement"])
            count_ta += 1
        if c.get("coherence_cohesion") is not None:
            cc += float(c["coherence_cohesion"])
            count_cc += 1
        if c.get("lexical_resource") is not None:
            lr += float(c["lexical_resource"])
            count_lr += 1
        if c.get("grammatical_range_accuracy") is not None:
            gra += float(c["grammatical_range_accuracy"])
            count_gra += 1

    if all(count == 0 for count in [count_ta, count_cc, count_lr, count_gra]):
        return None

    return MeWritingCriteriaRead(
        task_achievement=round(ta / count_ta, 2) if count_ta > 0 else None,
        coherence_cohesion=round(cc / count_cc, 2) if count_cc > 0 else None,
        lexical_resource=round(lr / count_lr, 2) if count_lr > 0 else None,
        grammatical_range_accuracy=round(gra / count_gra, 2) if count_gra > 0 else None,
    )


@router.get("/favorites", response_model=list[FavoriteTestRead])
async def get_favorites(current_user: DebugPrincipal = Depends(get_current_user)) -> list[FavoriteTestRead]:
    _ = current_user
    return []


@router.post("/favorites/{test_id}", response_model=MessageResponse)
async def add_favorite(test_id: UUID, current_user: DebugPrincipal = Depends(get_current_user)) -> MessageResponse:
    _ = (test_id, current_user)
    return MessageResponse(message="Favorite added.")


@router.delete("/favorites/{test_id}", response_model=MessageResponse)
async def remove_favorite(test_id: UUID, current_user: DebugPrincipal = Depends(get_current_user)) -> MessageResponse:
    _ = (test_id, current_user)
    return MessageResponse(message="Favorite removed.")


class NotificationRead(BaseModel):
    id: UUID
    type: str
    title: str
    body: str
    is_read: bool
    created_at: str


@router.get("/notifications", response_model=list[NotificationRead])
async def list_notifications(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[NotificationRead]:
    try:
        result = await session.scalars(
            select(Notification)
            .where(Notification.user_id == current_user.id)
            .order_by(Notification.created_at.desc())
            .limit(50)
        )
        notifications = list(result.all())
        return [
            NotificationRead(
                id=n.id,
                type=n.type.value if hasattr(n.type, "value") else str(n.type),
                title=n.title,
                body=n.body,
                is_read=n.is_read,
                created_at=n.created_at.isoformat() if n.created_at else "",
            )
            for n in notifications
        ]
    except Exception:
        return []


@router.patch("/notifications/{notification_id}/read", response_model=MessageResponse)
async def mark_notification_read(
    notification_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    n = await session.get(Notification, notification_id)
    if n and n.user_id == current_user.id:
        n.is_read = True
        await session.commit()
    return MessageResponse(message="Marked as read.")


@router.patch("/notifications/read-all", response_model=MessageResponse)
async def mark_all_read(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    await session.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await session.commit()
    return MessageResponse(message="All marked as read.")
