from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import TestMode
from app.models.attempt import Attempt
from app.models.enums import AttemptMode as ModelAttemptMode
from app.models.enums import AttemptScope as ModelAttemptScope
from app.models.enums import TestType as ModelTestType
from app.models.test import Question
from app.models.user import User
from app.schemas.common import DebugPrincipal


def principal_phone(principal: DebugPrincipal) -> str:
    if principal.phone is not None:
        return principal.phone
    return f"dbg-{principal.id.hex[:16]}"


def principal_telegram_id(principal: DebugPrincipal) -> int:
    if principal.telegram_id is not None:
        return principal.telegram_id
    return int(principal.id.int % 9_000_000_000) + 1_000_000_000


def snapshot_questions(snapshot: dict[str, object]) -> dict[str, dict[str, object]]:
    return {
        str(item["question_id"]): item
        for item in snapshot.get("questions", [])
        if isinstance(item, dict) and item.get("question_id")
    }


def snapshot_answer_key(snapshot: dict[str, object]) -> dict[str, dict[str, object]]:
    payload = snapshot.get("answer_key", {})
    if not isinstance(payload, dict):
        return {}
    return {
        str(key): value
        for key, value in payload.items()
        if isinstance(value, dict)
    }


def snapshot_group_shared_options(snapshot: dict[str, object]) -> dict[str, list[str]]:
    group_options: dict[str, list[str]] = {}
    for section in snapshot.get("sections", []):
        if not isinstance(section, dict):
            continue
        for group in section.get("question_groups", []):
            if not isinstance(group, dict):
                continue
            group_id = str(group.get("group_id", "")).strip()
            if not group_id:
                continue
            shared_options = [
                str(option)
                for option in group.get("shared_options", [])
                if isinstance(option, (str, int, float))
            ]
            group_options[group_id] = shared_options
    return group_options


def count_non_empty_answer_values(values: list[str] | tuple[str, ...]) -> int:
    return sum(1 for value in values if str(value or "").strip())


def should_grant_premium_bonus(
    *,
    attempt: Attempt,
    metadata: dict[str, object],
) -> bool:
    if metadata.get("premium_bonus_granted"):
        return False
    if int(metadata.get("answers_count", 0) or 0) <= 0:
        return False
    return (
        attempt.scope == ModelAttemptScope.FULL
        and attempt.test_type in {ModelTestType.READING, ModelTestType.LISTENING}
    )


def user_can_receive_full_test_premium_bonus(user: User | None) -> bool:
    return bool(user is not None and user.full_test_premium_bonus_granted_at is None)


def normalized_attempt_time_spent(
    *,
    saved_time_spent_sec: int | None,
    elapsed_fallback_sec: int,
    mode: ModelAttemptMode | TestMode | None,
    time_limit_seconds: int | None,
) -> int:
    normalized = max(0, int(saved_time_spent_sec or 0))
    elapsed = max(0, int(elapsed_fallback_sec))
    if str(mode) in {ModelAttemptMode.EXAM.value, TestMode.exam.value}:
        normalized = max(normalized, elapsed)
    elif normalized <= 0:
        normalized = elapsed

    if (
        str(mode) in {ModelAttemptMode.EXAM.value, TestMode.exam.value}
        and int(time_limit_seconds or 0) > 0
    ):
        normalized = min(normalized, int(time_limit_seconds or 0))
    return normalized


def elapsed_attempt_seconds(attempt: Attempt, *, now: datetime | None = None) -> int:
    from app.models.enums import AttemptStatus as ModelAttemptStatus

    if attempt.status != ModelAttemptStatus.IN_PROGRESS:
        return 0
    current_time = now or datetime.now(timezone.utc)
    return max(0, int((current_time - attempt.created_at).total_seconds()))


def normalize_section_time_spent_sec(
    raw: dict[str, object] | None,
    *,
    snapshot: dict[str, object],
    time_limit_seconds: int | None = None,
) -> dict[str, int]:
    if not isinstance(raw, dict):
        return {}

    valid_section_ids = {
        str(section.get("section_id") or section.get("id") or "").strip()
        for section in snapshot.get("sections", [])
        if isinstance(section, dict)
    }
    valid_section_ids.discard("")
    max_section_seconds = max(0, int(time_limit_seconds or 0))
    normalized: dict[str, int] = {}
    for section_id, value in raw.items():
        normalized_section_id = str(section_id).strip()
        if not normalized_section_id:
            continue
        if valid_section_ids and normalized_section_id not in valid_section_ids:
            continue
        try:
            normalized_value = max(0, int(value or 0))
        except (TypeError, ValueError):
            continue
        if max_section_seconds:
            normalized_value = min(normalized_value, max_section_seconds)
        normalized[normalized_section_id] = normalized_value
    return normalized


async def db_answer_key(
    session: AsyncSession,
    question_ids: list[UUID],
) -> dict[str, dict[str, object]]:
    if not question_ids:
        return {}
    query = (
        select(Question)
        .options(selectinload(Question.answer_variants))
        .where(Question.id.in_(question_ids))
    )
    questions = (await session.scalars(query)).unique().all()
    return {
        str(question.id): {
            "accepted_answers": [answer.value for answer in question.answer_variants],
            "explanation": question.explanation or "",
            "explanation_reference": question.explanation_reference or {},
        }
        for question in questions
    }


async def ensure_debug_user(session: AsyncSession, principal: DebugPrincipal) -> User:
    user = await session.get(User, principal.id)
    if user is None:
        user = User(
            id=principal.id,
            telegram_id=principal_telegram_id(principal),
            phone=principal_phone(principal),
            first_name=principal.first_name,
            last_name=principal.last_name,
            username=principal.username,
            avatar_url=principal.avatar_url,
            telegram_contact_updated_at=datetime.now(timezone.utc),
            is_premium=principal.is_premium,
            show_on_leaderboard=principal.show_on_leaderboard,
            last_active_at=datetime.now(timezone.utc),
        )
        session.add(user)
    else:
        user.first_name = principal.first_name
        user.last_name = principal.last_name
        user.phone = principal_phone(principal)
        user.username = principal.username
        if not user.avatar_is_custom:
            user.avatar_url = principal.avatar_url
        user.telegram_contact_updated_at = datetime.now(timezone.utc)
        user.is_premium = principal.is_premium
        user.show_on_leaderboard = principal.show_on_leaderboard
        user.last_active_at = datetime.now(timezone.utc)
    await session.flush()
    return user
