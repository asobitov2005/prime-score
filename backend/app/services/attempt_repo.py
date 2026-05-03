from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import AttemptStatus, TestMode, TestScope, TestType
from app.schemas.common import DebugPrincipal
from app.models.attempt import Attempt, AttemptEvent, UserAnswer
from app.models.test import Question
from app.models.enums import AttemptMode as ModelAttemptMode
from app.models.enums import AttemptScope as ModelAttemptScope
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.enums import TestType as ModelTestType
from app.models.user import User
from app.services.fixtures import build_test_snapshot, get_question_fixture
from app.services.runtime_store import AttemptRuntime, _band_for_raw_score
from app.services.scoring import is_answer_correct, mc_multiple_question_weight
from app.services.snapshots import freeze_test_snapshot
from app.services.test_content_repo import build_test_snapshot_from_db


def _principal_phone(principal: DebugPrincipal) -> str:
    return f"dbg-{principal.id.hex[:16]}"


def _principal_telegram_id(principal: DebugPrincipal) -> int:
    if principal.telegram_id is not None:
        return principal.telegram_id
    return int(principal.id.int % 9_000_000_000) + 1_000_000_000


def _attempt_query() -> Select[tuple[Attempt]]:
    return select(Attempt).order_by(
        func.coalesce(Attempt.submitted_at, Attempt.updated_at, Attempt.created_at).desc(),
        Attempt.created_at.desc(),
    )


def _snapshot_questions(snapshot: dict[str, object]) -> dict[str, dict[str, object]]:
    return {
        str(item["question_id"]): item
        for item in snapshot.get("questions", [])
    }


def _snapshot_answer_key(snapshot: dict[str, object]) -> dict[str, dict[str, object]]:
    payload = snapshot.get("answer_key", {})
    if isinstance(payload, dict):
        return {
            str(key): value
            for key, value in payload.items()
            if isinstance(value, dict)
        }
    return {}


def _snapshot_group_shared_options(snapshot: dict[str, object]) -> dict[str, list[str]]:
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


def _count_non_empty_answer_values(values: list[str] | tuple[str, ...]) -> int:
    return sum(1 for value in values if str(value or "").strip())


def _normalized_attempt_time_spent(
    *,
    saved_time_spent_sec: int | None,
    elapsed_fallback_sec: int,
    mode: ModelAttemptMode | TestMode | None,
    time_limit_seconds: int | None,
) -> int:
    normalized = max(0, int(saved_time_spent_sec or 0))
    if normalized <= 0:
        normalized = max(0, int(elapsed_fallback_sec))

    if str(mode) in {ModelAttemptMode.EXAM.value, TestMode.exam.value} and int(time_limit_seconds or 0) > 0:
        normalized = min(normalized, int(time_limit_seconds or 0))

    return normalized


async def _db_answer_key(session: AsyncSession, question_ids: list[UUID]) -> dict[str, dict[str, object]]:
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
        }
        for question in questions
    }


async def ensure_debug_user(session: AsyncSession, principal: DebugPrincipal) -> User:
    user = await session.get(User, principal.id)
    if user is None:
        user = User(
            id=principal.id,
            telegram_id=_principal_telegram_id(principal),
            phone=_principal_phone(principal),
            first_name=principal.first_name,
            last_name=principal.last_name,
            username=principal.username,
            is_premium=principal.is_premium,
            show_on_leaderboard=principal.show_on_leaderboard,
            last_active_at=datetime.now(timezone.utc),
        )
        session.add(user)
    else:
        user.first_name = principal.first_name
        user.last_name = principal.last_name
        user.username = principal.username
        user.is_premium = principal.is_premium
        user.show_on_leaderboard = principal.show_on_leaderboard
        user.last_active_at = datetime.now(timezone.utc)
    await session.flush()
    return user


def _to_runtime(
    attempt: Attempt,
    *,
    answers: list[UserAnswer],
) -> AttemptRuntime:
    snapshot = dict(attempt.test_snapshot or {})
    metadata = dict(attempt.attempt_metadata or {})
    answer_map: dict[str, str] = {}
    answer_numbers: dict[str, int] = {}
    questions_by_id = {
        str(item["question_id"]): item
        for item in snapshot.get("questions", [])
    }

    latest_answers: dict[str, UserAnswer] = {}
    for answer in answers:
        question_key = str(answer.question_id)
        previous = latest_answers.get(question_key)
        if previous is None or answer.updated_at > previous.updated_at:
            latest_answers[question_key] = answer

    for question_id, answer in latest_answers.items():
        value = answer.value.get("value")
        answer_map[question_id] = "" if value is None else str(value)
        question = questions_by_id.get(question_id)
        if question is not None:
            answer_numbers[question_id] = int(question["question_number"])

    return AttemptRuntime(
        attempt_id=attempt.id,
        user_id=attempt.user_id,
        test_id=attempt.test_id,
        test_version=int(snapshot.get("version", 1)),
        scope=TestScope(attempt.scope.value),
        section_id=attempt.section_id,
        mode=TestMode(attempt.mode.value),
        status=AttemptStatus(attempt.status.value),
        started_at=attempt.created_at,
        completed_at=attempt.submitted_at,
        updated_at=attempt.updated_at or attempt.created_at,
        time_spent_sec=_normalized_attempt_time_spent(
            saved_time_spent_sec=int(metadata.get("time_spent_sec", 0) or 0),
            elapsed_fallback_sec=0,
            mode=attempt.mode,
            time_limit_seconds=attempt.time_limit_seconds,
        ),
        raw_score=attempt.raw_score,
        total_questions=int(snapshot.get("total_questions", attempt.max_score or 0)),
        band_score=Decimal(str(attempt.band_score)) if attempt.band_score is not None else None,
        test_snapshot=snapshot,
        metadata=metadata,
        answers=answer_map,
        answer_numbers=answer_numbers,
        scoring_items=list(metadata.get("scoring_items", [])),
        section_breakdown=list(metadata.get("section_breakdown", [])),
        question_type_breakdown=list(metadata.get("question_type_breakdown", [])),
    )


async def _load_answers(session: AsyncSession, attempt_id: UUID) -> list[UserAnswer]:
    result = await session.scalars(
        select(UserAnswer).where(UserAnswer.attempt_id == attempt_id).order_by(UserAnswer.created_at.asc())
    )
    return list(result.all())


async def _load_existing_in_progress_attempt(
    session: AsyncSession,
    *,
    user_id: UUID,
    test_id: UUID,
    scope: TestScope,
    section_id: UUID | None,
    mode: TestMode,
) -> AttemptRuntime | None:
    query = _attempt_query().where(
        Attempt.user_id == user_id,
        Attempt.test_id == test_id,
        Attempt.scope == ModelAttemptScope(scope.value),
        Attempt.mode == ModelAttemptMode(mode.value),
        Attempt.status == ModelAttemptStatus.IN_PROGRESS,
    )
    if section_id is None:
        query = query.where(Attempt.section_id.is_(None))
    else:
        query = query.where(Attempt.section_id == section_id)

    attempts = list((await session.scalars(query)).all())
    if not attempts:
        return None

    best_runtime: AttemptRuntime | None = None
    best_score: tuple[int, float, float] | None = None
    for attempt in attempts:
        answers = await _load_answers(session, attempt.id)
        runtime = _to_runtime(attempt, answers=answers)
        highlights_count = sum(
            len(items)
            for items in dict(runtime.metadata.get("text_highlights") or {}).values()
            if isinstance(items, list)
        )
        has_answers_or_highlights = int(any(value.strip() for value in runtime.answers.values()) or bool(highlights_count))
        has_time_progress = int(int(runtime.time_spent_sec or 0) > 0)
        updated_ts = (attempt.updated_at or attempt.created_at).timestamp()
        created_ts = attempt.created_at.timestamp()
        progress_score = (has_answers_or_highlights, has_time_progress, updated_ts, created_ts)
        if best_score is None or progress_score > best_score:
            best_score = progress_score
            best_runtime = runtime

    return best_runtime


async def start_attempt_in_db(
    session: AsyncSession,
    *,
    principal: DebugPrincipal,
    test_id: UUID,
    scope: TestScope,
    section_id: UUID | None,
    mode: TestMode,
    force_new: bool = False,
) -> AttemptRuntime:
    await ensure_debug_user(session, principal)
    existing_attempt = None if force_new else await _load_existing_in_progress_attempt(
        session,
        user_id=principal.id,
        test_id=test_id,
        scope=scope,
        section_id=section_id,
        mode=mode,
    )
    if existing_attempt is not None:
        return existing_attempt

    snapshot = await build_test_snapshot_from_db(
        session,
        test_id=test_id,
        scope=scope,
        mode=mode,
        section_id=section_id,
    )
    if snapshot is None:
        snapshot = build_test_snapshot(test_id=test_id, scope=scope, mode=mode.value, section_id=section_id)
    if snapshot is None:
        raise KeyError("test_not_found")

    frozen_snapshot = freeze_test_snapshot(snapshot)
    attempt = Attempt(
        user_id=principal.id,
        test_id=test_id,
        test_type=ModelTestType(str(frozen_snapshot["test_type"])),
        mode=ModelAttemptMode(mode.value),
        scope=ModelAttemptScope(scope.value),
        status=ModelAttemptStatus.IN_PROGRESS,
        section_id=section_id,
        test_snapshot=frozen_snapshot,
        raw_score=None,
        max_score=int(frozen_snapshot["total_questions"]),
        band_score=None,
        time_limit_seconds=int(frozen_snapshot["time_limit_seconds"]),
        attempt_metadata={
            "score_status": "draft",
            "payment_paused": True,
            "question_bank_enabled": False,
            "answers_count": 0,
            "time_spent_sec": 0,
            "scoring_items": [],
            "section_breakdown": [],
            "question_type_breakdown": [],
        },
    )
    session.add(attempt)
    await session.flush()
    session.add(
        AttemptEvent(
            attempt_id=attempt.id,
            event_type="attempt_started",
            payload={"mode": mode.value, "scope": scope.value},
            created_at=datetime.now(timezone.utc),
        )
    )
    await session.commit()
    await session.refresh(attempt)
    return _to_runtime(attempt, answers=[])


async def get_attempt_from_db(
    session: AsyncSession,
    *,
    attempt_id: UUID,
    user_id: UUID | None = None,
) -> AttemptRuntime | None:
    query = _attempt_query().where(Attempt.id == attempt_id)
    if user_id is not None:
        query = query.where(Attempt.user_id == user_id)
    attempt = (await session.scalars(query)).first()
    if attempt is None:
        return None
    answers = await _load_answers(session, attempt.id)
    return _to_runtime(attempt, answers=answers)


async def iter_user_attempts_from_db(session: AsyncSession, *, user_id: UUID) -> list[AttemptRuntime]:
    attempts = (await session.scalars(_attempt_query().where(Attempt.user_id == user_id))).all()
    if not attempts:
        return []

    answer_rows = (
        await session.scalars(
            select(UserAnswer).where(UserAnswer.attempt_id.in_([attempt.id for attempt in attempts]))
        )
    ).all()
    grouped_answers: dict[UUID, list[UserAnswer]] = {}
    for answer in answer_rows:
        grouped_answers.setdefault(answer.attempt_id, []).append(answer)

    return [
        _to_runtime(attempt, answers=grouped_answers.get(attempt.id, []))
        for attempt in attempts
    ]


async def save_answer_in_db(
    session: AsyncSession,
    *,
    attempt_id: UUID,
    question_id: UUID,
    value: str | None,
) -> tuple[AttemptRuntime, int]:
    attempt = await session.get(Attempt, attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")

    snapshot = dict(attempt.test_snapshot or {})
    snapshot_question = _snapshot_questions(snapshot).get(str(question_id))
    if snapshot_question is None and get_question_fixture(attempt.test_id, question_id) is None:
        raise KeyError("question_not_found")

    existing_answers = list(
        (
            await session.scalars(
                select(UserAnswer)
                .where(
                    UserAnswer.attempt_id == attempt_id,
                    UserAnswer.question_id == question_id,
                )
                .order_by(UserAnswer.updated_at.desc(), UserAnswer.created_at.desc())
            )
        ).all()
    )
    existing = existing_answers[0] if existing_answers else None
    if existing is None:
        existing = UserAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            value={"value": value or ""},
        )
        session.add(existing)
    else:
        existing.value = {"value": value or ""}
        for duplicate in existing_answers[1:]:
            await session.delete(duplicate)

    question_number = int(snapshot_question["question_number"]) if snapshot_question is not None else int(get_question_fixture(attempt.test_id, question_id)["question_number"])
    await session.flush()
    persisted_answers = list(
        (
            await session.scalars(
                select(UserAnswer).where(UserAnswer.attempt_id == attempt_id)
            )
        ).all()
    )
    answers_count = _count_non_empty_answer_values(
        [str(answer.value.get("value") or "") for answer in persisted_answers]
    )
    metadata = dict(attempt.attempt_metadata or {})
    metadata["last_answered_question_id"] = str(question_id)
    metadata["last_answered_question_number"] = question_number
    metadata["answers_count"] = answers_count
    metadata["score_status"] = "draft"
    attempt.attempt_metadata = metadata
    session.add(
        AttemptEvent(
            attempt_id=attempt_id,
            event_type="answer_saved",
            payload={"question_id": str(question_id), "question_number": question_number},
            created_at=datetime.now(timezone.utc),
        )
    )
    await session.commit()
    await session.refresh(attempt)
    answers = await _load_answers(session, attempt_id)
    return _to_runtime(attempt, answers=answers), question_number


async def save_progress_in_db(
    session: AsyncSession,
    *,
    attempt_id: UUID,
    time_spent_sec: int | None = None,
    active_question_id: str | None = None,
    text_highlights: dict[str, list[dict[str, object]]] | None = None,
    ui_state: dict[str, object] | None = None,
) -> AttemptRuntime:
    attempt = await session.get(Attempt, attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")

    metadata = dict(attempt.attempt_metadata or {})

    if time_spent_sec is not None:
        normalized_time_spent = max(0, int(time_spent_sec))
        if attempt.mode == ModelAttemptMode.EXAM and attempt.time_limit_seconds:
            normalized_time_spent = min(normalized_time_spent, int(attempt.time_limit_seconds))
        metadata["time_spent_sec"] = normalized_time_spent

    if active_question_id is not None:
        normalized_active_question_id = str(active_question_id).strip()
        if normalized_active_question_id:
            metadata["active_question_id"] = normalized_active_question_id
        else:
            metadata.pop("active_question_id", None)

    if text_highlights is not None:
        normalized_highlights: dict[str, list[dict[str, object]]] = {}
        for block_key, items in text_highlights.items():
            if not isinstance(block_key, str):
                continue
            normalized_items: list[dict[str, object]] = []
            for item in items:
                try:
                    start = max(0, int(item.get("start", 0)))
                    end = max(start, int(item.get("end", 0)))
                except (TypeError, ValueError):
                    continue
                if end <= start:
                    continue
                item_id = str(item.get("id") or f"{block_key}-{start}-{end}")
                normalized_items.append({"id": item_id, "start": start, "end": end})
            normalized_highlights[block_key] = normalized_items
        metadata["text_highlights"] = normalized_highlights

    if ui_state is not None:
        normalized_ui_state: dict[str, object] = {}
        theme = ui_state.get("theme")
        if isinstance(theme, str) and theme in {"light", "dark"}:
            normalized_ui_state["theme"] = theme
        split_ratio = ui_state.get("split_ratio")
        if split_ratio is not None:
            try:
                normalized_ui_state["split_ratio"] = round(min(58, max(42, float(split_ratio))), 1)
            except (TypeError, ValueError):
                pass
        font_scale = ui_state.get("font_scale")
        if font_scale is not None:
            try:
                normalized_ui_state["font_scale"] = round(min(1.2, max(0.9, float(font_scale))), 2)
            except (TypeError, ValueError):
                pass
        metadata["ui_state"] = normalized_ui_state

    attempt.attempt_metadata = metadata
    session.add(
        AttemptEvent(
            attempt_id=attempt_id,
            event_type="progress_saved",
            payload={
                "time_spent_sec": metadata.get("time_spent_sec", 0),
                "has_highlights": text_highlights is not None,
                "has_ui_state": ui_state is not None,
            },
            created_at=datetime.now(timezone.utc),
        )
    )
    await session.commit()
    await session.refresh(attempt)
    answers = await _load_answers(session, attempt_id)
    return _to_runtime(attempt, answers=answers)


async def submit_attempt_in_db(session: AsyncSession, *, attempt_id: UUID) -> AttemptRuntime:
    attempt = await session.get(Attempt, attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")

    answers = await _load_answers(session, attempt_id)
    answer_map = {str(answer.question_id): str(answer.value.get("value") or "") for answer in answers}
    snapshot = dict(attempt.test_snapshot or {})
    snapshot_questions = _snapshot_questions(snapshot)
    snapshot_group_shared_options = _snapshot_group_shared_options(snapshot)
    db_answer_key = await _db_answer_key(session, [UUID(question_id) for question_id in snapshot_questions])
    snapshot_answer_key = _snapshot_answer_key(snapshot)
    now = datetime.now(timezone.utc)
    time_spent_sec = _normalized_attempt_time_spent(
        saved_time_spent_sec=int((attempt.attempt_metadata or {}).get("time_spent_sec", 0) or 0),
        elapsed_fallback_sec=max(0, int((now - attempt.created_at).total_seconds())),
        mode=attempt.mode,
        time_limit_seconds=attempt.time_limit_seconds,
    )

    scoring_items: list[dict[str, object]] = []
    section_counts: dict[str, dict[str, object]] = {}
    type_counts: dict[str, dict[str, object]] = {}
    raw_score = 0

    for snapshot_question in snapshot.get("questions", []):
        question_id = UUID(str(snapshot_question["question_id"]))
        question_payload = {
            "question_number": int(snapshot_question["question_number"]),
            "section_id": str(snapshot_question["section_id"]),
            "section_title": str(snapshot_question["section_title"]),
            "group_title": str(snapshot_question["group_title"]),
            "question_type": str(snapshot_question["question_type"]),
            "prompt": str(snapshot_question["prompt"]),
            "options": (
                [str(option) for option in snapshot_question.get("options", [])]
                or snapshot_group_shared_options.get(str(snapshot_question.get("group_id", "")), [])
            ),
        }
        answer_key = db_answer_key.get(str(question_id)) or snapshot_answer_key.get(str(question_id))
        fixture = get_question_fixture(attempt.test_id, question_id)
        if answer_key is None and fixture is not None:
            answer_key = {
                "accepted_answers": list(fixture["accepted_answers"]),
                "explanation": fixture["explanation"],
            }
        if answer_key is None:
            continue
        answer_value = answer_map.get(str(question_id))
        accepted_answers = [str(item) for item in answer_key.get("accepted_answers", [])]
        explanation = str(answer_key.get("explanation") or "")
        is_correct = bool(answer_value) and is_answer_correct(answer_value, accepted_answers)
        question_weight = (
            mc_multiple_question_weight(
                question_label=str(snapshot_question.get("label") or question_payload["question_number"]),
                accepted_answers=accepted_answers,
            )
            if "mc_multiple" in str(question_payload["question_type"])
            else 1
        )
        raw_score += question_weight if is_correct else 0

        scoring_item = {
            "question_id": str(question_id),
            "question_number": question_payload["question_number"],
            "section_id": question_payload["section_id"],
            "section_title": question_payload["section_title"],
            "group_title": question_payload["group_title"],
            "question_type": question_payload["question_type"],
            "prompt": question_payload["prompt"],
            "options": question_payload["options"],
            "answer_value": answer_value,
            "is_correct": is_correct,
            "correct_answers": accepted_answers,
            "explanation": explanation,
        }
        scoring_items.append(scoring_item)

        section_key = str(question_payload["section_id"])
        section_state = section_counts.setdefault(
            section_key,
            {"title": question_payload["section_title"], "correct": 0, "total": 0},
        )
        section_state["total"] += question_weight
        section_state["correct"] += question_weight if is_correct else 0

        type_key = str(question_payload["question_type"])
        type_state = type_counts.setdefault(
            type_key,
            {"question_type": question_payload["question_type"], "correct": 0, "total": 0},
        )
        type_state["total"] += question_weight
        type_state["correct"] += question_weight if is_correct else 0

    band_score = (
        _band_for_raw_score(TestType(str(snapshot["test_type"])), raw_score)
        if TestScope(str(snapshot["scope"])) == TestScope.full
        else None
    )

    metadata = dict(attempt.attempt_metadata or {})
    metadata["answers_count"] = _count_non_empty_answer_values(list(answer_map.values()))
    metadata["score_status"] = "ready"
    metadata["time_spent_sec"] = time_spent_sec
    metadata["scoring_items"] = freeze_test_snapshot(sorted(scoring_items, key=lambda item: item["question_number"]))
    metadata["section_breakdown"] = freeze_test_snapshot(list(section_counts.values()))
    metadata["question_type_breakdown"] = freeze_test_snapshot(list(type_counts.values()))

    attempt.status = ModelAttemptStatus.AUTO_SUBMITTED if metadata.get("auto_submitted") else ModelAttemptStatus.COMPLETED
    attempt.submitted_at = now
    attempt.raw_score = raw_score
    attempt.max_score = int(snapshot.get("total_questions", 0))
    attempt.band_score = float(band_score) if band_score is not None else None
    attempt.attempt_metadata = metadata
    session.add(
        AttemptEvent(
            attempt_id=attempt_id,
            event_type="attempt_submitted",
            payload={"raw_score": raw_score, "band_score": float(band_score) if band_score is not None else None},
            created_at=now,
        )
    )
    await session.commit()
    await session.refresh(attempt)
    answers = await _load_answers(session, attempt_id)
    return _to_runtime(attempt, answers=answers)
