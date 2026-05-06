from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from functools import lru_cache
from pathlib import Path
from typing import Protocol
from uuid import UUID, uuid4

try:
    import fcntl
except ModuleNotFoundError:
    fcntl = None
try:
    from redis import Redis
except ModuleNotFoundError:
    Redis = None

from app.core.config import get_settings
from app.core.enums import AttemptStatus, TestMode, TestScope, TestType
from app.services.fixtures import build_test_snapshot, get_question_fixture
from app.services.scoring import is_answer_correct, mc_multiple_question_weight


READING_BAND_TABLE = [
    (39, 40, Decimal("9.0")),
    (37, 38, Decimal("8.5")),
    (35, 36, Decimal("8.0")),
    (33, 34, Decimal("7.5")),
    (30, 32, Decimal("7.0")),
    (27, 29, Decimal("6.5")),
    (23, 26, Decimal("6.0")),
    (19, 22, Decimal("5.5")),
    (15, 18, Decimal("5.0")),
    (13, 14, Decimal("4.5")),
    (10, 12, Decimal("4.0")),
    (8, 9, Decimal("3.5")),
    (6, 7, Decimal("3.0")),
    (4, 5, Decimal("2.5")),
    (3, 3, Decimal("2.0")),
    (2, 2, Decimal("1.0")),
]

LISTENING_BAND_TABLE = [
    (39, 40, Decimal("9.0")),
    (37, 38, Decimal("8.5")),
    (35, 36, Decimal("8.0")),
    (32, 34, Decimal("7.5")),
    (30, 31, Decimal("7.0")),
    (26, 29, Decimal("6.5")),
    (23, 25, Decimal("6.0")),
    (18, 22, Decimal("5.5")),
    (16, 17, Decimal("5.0")),
    (13, 15, Decimal("4.5")),
    (11, 12, Decimal("4.0")),
    (8, 10, Decimal("3.5")),
    (6, 7, Decimal("3.0")),
    (4, 5, Decimal("2.5")),
    (3, 3, Decimal("2.0")),
    (2, 2, Decimal("1.0")),
]

RUNTIME_STORE_TTL_SECONDS = 60 * 60 * 24 * 30
RUNTIME_STORE_FILE = Path(
    os.environ.get(
        "PRIMESCORE_RUNTIME_STORE_PATH",
        str(Path(tempfile.gettempdir()) / "primescore-runtime-store.json"),
    )
)


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


@dataclass(slots=True)
class AttemptRuntime:
    attempt_id: UUID
    user_id: UUID
    test_id: UUID
    test_version: int
    scope: TestScope
    section_id: UUID | None
    mode: TestMode
    status: AttemptStatus = AttemptStatus.in_progress
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    updated_at: datetime | None = None
    time_spent_sec: int = 0
    raw_score: int | None = None
    total_questions: int = 0
    band_score: Decimal | None = None
    test_snapshot: dict[str, object] = field(default_factory=dict)
    metadata: dict[str, object] = field(default_factory=dict)
    answers: dict[str, str] = field(default_factory=dict)
    answer_numbers: dict[str, int] = field(default_factory=dict)
    scoring_items: list[dict[str, object]] = field(default_factory=list)
    section_breakdown: list[dict[str, object]] = field(default_factory=list)
    question_type_breakdown: list[dict[str, object]] = field(default_factory=list)


def _count_answered_values(answers: dict[str, str]) -> int:
    return sum(1 for value in answers.values() if str(value or "").strip())


def _normalized_attempt_time_spent(
    *,
    saved_time_spent_sec: int | None,
    elapsed_fallback_sec: int,
    mode: TestMode | None,
    time_limit_seconds: int | None,
) -> int:
    normalized = max(0, int(saved_time_spent_sec or 0))
    if normalized <= 0:
        normalized = max(0, int(elapsed_fallback_sec))

    if mode == TestMode.exam and int(time_limit_seconds or 0) > 0:
        normalized = min(normalized, int(time_limit_seconds or 0))

    return normalized


class RuntimeStoreBackend(Protocol):
    def save_attempt(self, attempt: AttemptRuntime) -> None: ...

    def get_attempt(self, attempt_id: UUID) -> AttemptRuntime | None: ...

    def iter_user_attempts(self, user_id: UUID) -> list[AttemptRuntime]: ...


def _band_for_raw_score(test_type: TestType, raw_score: int) -> Decimal | None:
    table = READING_BAND_TABLE if test_type == TestType.reading else LISTENING_BAND_TABLE
    for minimum, maximum, band in table:
        if minimum <= raw_score <= maximum:
            return band
    return None


def _serialize(value: object) -> object:
    if isinstance(value, dict):
        return {str(key): _serialize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, Enum):
        return value.value
    return value


def _deserialize_attempt(payload: dict[str, object]) -> AttemptRuntime:
    completed_at_raw = payload.get("completed_at")
    updated_at_raw = payload.get("updated_at")
    band_score_raw = payload.get("band_score")
    return AttemptRuntime(
        attempt_id=UUID(str(payload["attempt_id"])),
        user_id=UUID(str(payload["user_id"])),
        test_id=UUID(str(payload["test_id"])),
        test_version=int(payload["test_version"]),
        scope=TestScope(str(payload["scope"])),
        section_id=UUID(str(payload["section_id"])) if payload.get("section_id") else None,
        mode=TestMode(str(payload["mode"])),
        status=AttemptStatus(str(payload.get("status", AttemptStatus.in_progress.value))),
        started_at=datetime.fromisoformat(str(payload["started_at"])),
        completed_at=datetime.fromisoformat(str(completed_at_raw)) if completed_at_raw else None,
        updated_at=datetime.fromisoformat(str(updated_at_raw)) if updated_at_raw else None,
        time_spent_sec=int(payload.get("time_spent_sec", 0)),
        raw_score=int(payload["raw_score"]) if payload.get("raw_score") is not None else None,
        total_questions=int(payload.get("total_questions", 0)),
        band_score=Decimal(str(band_score_raw)) if band_score_raw is not None else None,
        test_snapshot=dict(payload.get("test_snapshot", {})),
        metadata=dict(payload.get("metadata", {})),
        answers={str(key): str(value) for key, value in dict(payload.get("answers", {})).items()},
        answer_numbers={str(key): int(value) for key, value in dict(payload.get("answer_numbers", {})).items()},
        scoring_items=list(payload.get("scoring_items", [])),
        section_breakdown=list(payload.get("section_breakdown", [])),
        question_type_breakdown=list(payload.get("question_type_breakdown", [])),
    )


def _attempt_payload(attempt: AttemptRuntime) -> dict[str, object]:
    return {
        "attempt_id": str(attempt.attempt_id),
        "user_id": str(attempt.user_id),
        "test_id": str(attempt.test_id),
        "test_version": attempt.test_version,
        "scope": attempt.scope.value,
        "section_id": str(attempt.section_id) if attempt.section_id else None,
        "mode": attempt.mode.value,
        "status": attempt.status.value,
        "started_at": attempt.started_at.isoformat(),
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
        "updated_at": attempt.updated_at.isoformat() if attempt.updated_at else None,
        "time_spent_sec": attempt.time_spent_sec,
        "raw_score": attempt.raw_score,
        "total_questions": attempt.total_questions,
        "band_score": str(attempt.band_score) if attempt.band_score is not None else None,
        "test_snapshot": _serialize(attempt.test_snapshot),
        "metadata": _serialize(attempt.metadata),
        "answers": _serialize(attempt.answers),
        "answer_numbers": _serialize(attempt.answer_numbers),
        "scoring_items": _serialize(attempt.scoring_items),
        "section_breakdown": _serialize(attempt.section_breakdown),
        "question_type_breakdown": _serialize(attempt.question_type_breakdown),
    }


def _attempt_sort_timestamp(attempt: AttemptRuntime) -> float:
    return (attempt.completed_at or attempt.updated_at or attempt.started_at).timestamp()


class RedisRuntimeStore:
    def __init__(self, redis_url: str):
        if Redis is None:
            raise RuntimeError("redis_dependency_missing")
        self.client = Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=0.2,
            socket_timeout=0.2,
        )

    def ping(self) -> None:
        self.client.ping()

    def _attempt_key(self, attempt_id: UUID | str) -> str:
        return f"primescore:runtime:attempt:{attempt_id}"

    def _user_key(self, user_id: UUID | str) -> str:
        return f"primescore:runtime:user:{user_id}:attempts"

    def save_attempt(self, attempt: AttemptRuntime) -> None:
        payload = json.dumps(_attempt_payload(attempt), separators=(",", ":"))
        pipe = self.client.pipeline()
        pipe.set(self._attempt_key(attempt.attempt_id), payload, ex=RUNTIME_STORE_TTL_SECONDS)
        pipe.zadd(self._user_key(attempt.user_id), {str(attempt.attempt_id): _attempt_sort_timestamp(attempt)})
        pipe.expire(self._user_key(attempt.user_id), RUNTIME_STORE_TTL_SECONDS)
        pipe.execute()

    def get_attempt(self, attempt_id: UUID) -> AttemptRuntime | None:
        raw = self.client.get(self._attempt_key(attempt_id))
        if raw is None:
            return None
        return _deserialize_attempt(json.loads(raw))

    def iter_user_attempts(self, user_id: UUID) -> list[AttemptRuntime]:
        attempt_ids = self.client.zrevrange(self._user_key(user_id), 0, -1)
        if not attempt_ids:
            return []
        pipe = self.client.pipeline()
        for attempt_id in attempt_ids:
            pipe.get(self._attempt_key(attempt_id))
        payloads = pipe.execute()
        return [
            _deserialize_attempt(json.loads(payload))
            for payload in payloads
            if payload is not None
        ]


class FileRuntimeStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _with_document(self, mutator):
        self.path.touch(exist_ok=True)
        with self.path.open("r+", encoding="utf-8") as handle:
            if fcntl:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            raw = handle.read().strip()
            document = json.loads(raw) if raw else {"attempts": {}}
            result, changed = mutator(document)
            if changed:
                handle.seek(0)
                handle.truncate()
                json.dump(document, handle, separators=(",", ":"))
                handle.flush()
            if fcntl:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            return result

    def save_attempt(self, attempt: AttemptRuntime) -> None:
        payload = _attempt_payload(attempt)

        def mutator(document: dict[str, object]):
            attempts = document.setdefault("attempts", {})
            attempts[str(attempt.attempt_id)] = payload
            return None, True

        self._with_document(mutator)

    def get_attempt(self, attempt_id: UUID) -> AttemptRuntime | None:
        def mutator(document: dict[str, object]):
            attempts = dict(document.get("attempts", {}))
            payload = attempts.get(str(attempt_id))
            return (_deserialize_attempt(payload) if payload is not None else None), False

        return self._with_document(mutator)

    def iter_user_attempts(self, user_id: UUID) -> list[AttemptRuntime]:
        def mutator(document: dict[str, object]):
            attempts = [
                _deserialize_attempt(payload)
                for payload in dict(document.get("attempts", {})).values()
                if str(payload.get("user_id")) == str(user_id)
            ]
            attempts.sort(key=_attempt_sort_timestamp, reverse=True)
            return attempts, False

        return self._with_document(mutator)


@lru_cache
def _backend() -> RuntimeStoreBackend:
    try:
        backend = RedisRuntimeStore(get_settings().redis_url)
        backend.ping()
        return backend
    except Exception:
        return FileRuntimeStore(RUNTIME_STORE_FILE)


def start_attempt(
    *,
    user_id: UUID,
    test_id: UUID,
    scope: TestScope,
    section_id: UUID | None,
    mode: TestMode,
) -> AttemptRuntime:
    matching_attempts = [
        attempt
        for attempt in iter_user_attempts(user_id)
        if attempt.test_id == test_id
        and attempt.scope == scope
        and attempt.section_id == section_id
        and attempt.mode == mode
        and attempt.status == AttemptStatus.in_progress
    ]
    if matching_attempts:
        def progress_score(attempt: AttemptRuntime) -> tuple[int, int, float, float]:
            highlights_count = sum(
                len(items)
                for items in dict(attempt.metadata.get("text_highlights") or {}).values()
                if isinstance(items, list)
            )
            has_answers_or_highlights = int(any(value.strip() for value in attempt.answers.values()) or bool(highlights_count))
            has_time_progress = int(int(attempt.time_spent_sec or 0) > 0)
            return (
                has_answers_or_highlights,
                has_time_progress,
                _attempt_sort_timestamp(attempt),
                float(attempt.attempt_id.int),
            )

        return max(matching_attempts, key=progress_score)

    snapshot = build_test_snapshot(test_id=test_id, scope=scope, mode=mode.value, section_id=section_id)
    if snapshot is None:
        raise KeyError("test_not_found")

    now = datetime.now(timezone.utc)
    attempt = AttemptRuntime(
        attempt_id=uuid4(),
        user_id=user_id,
        test_id=test_id,
        test_version=int(snapshot["version"]),
        scope=scope,
        section_id=section_id,
        mode=mode,
        started_at=now,
        updated_at=now,
        total_questions=int(snapshot["total_questions"]),
        test_snapshot=snapshot,
        metadata={
            "score_status": "draft",
            "payment_paused": bool(snapshot.get("payment_paused", True)),
            "question_bank_enabled": bool(snapshot.get("question_bank_enabled", False)),
            "answers_count": 0,
        },
    )
    _backend().save_attempt(attempt)
    return attempt


def get_attempt(attempt_id: UUID) -> AttemptRuntime | None:
    return _backend().get_attempt(attempt_id)


def iter_user_attempts(user_id: UUID) -> list[AttemptRuntime]:
    return _backend().iter_user_attempts(user_id)


def save_answer(attempt_id: UUID, question_id: UUID, value: str | None) -> tuple[AttemptRuntime, int]:
    attempt = get_attempt(attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")

    fixture = get_question_fixture(attempt.test_id, question_id)
    if fixture is None:
        raise KeyError("question_not_found")

    question_number = int(fixture["question_number"])
    attempt.answers[str(question_id)] = value or ""
    attempt.answer_numbers[str(question_id)] = question_number
    attempt.metadata["last_answered_question_id"] = str(question_id)
    attempt.metadata["last_answered_question_number"] = question_number
    attempt.metadata["answers_count"] = _count_answered_values(attempt.answers)
    attempt.metadata["score_status"] = "draft"
    attempt.updated_at = datetime.now(timezone.utc)
    _backend().save_attempt(attempt)
    return attempt, question_number


def save_progress(
    attempt_id: UUID,
    *,
    time_spent_sec: int | None = None,
    active_question_id: str | None = None,
    text_highlights: dict[str, list[dict[str, object]]] | None = None,
    ui_state: dict[str, object] | None = None,
) -> AttemptRuntime:
    attempt = get_attempt(attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")

    if time_spent_sec is not None:
        normalized_time_spent = max(0, int(time_spent_sec))
        if attempt.mode == TestMode.exam and attempt.test_snapshot.get("time_limit_seconds"):
            normalized_time_spent = min(normalized_time_spent, int(attempt.test_snapshot.get("time_limit_seconds", 0)))
        attempt.time_spent_sec = normalized_time_spent
        attempt.metadata["time_spent_sec"] = normalized_time_spent

    if active_question_id is not None:
        normalized_active_question_id = str(active_question_id).strip()
        if normalized_active_question_id:
            attempt.metadata["active_question_id"] = normalized_active_question_id
        else:
            attempt.metadata.pop("active_question_id", None)

    if text_highlights is not None:
        normalized_highlights: dict[str, list[dict[str, object]]] = {}
        for block_key, items in text_highlights.items():
            normalized_items: list[dict[str, object]] = []
            for item in items:
                try:
                    start = max(0, int(item.get("start", 0)))
                    end = max(start, int(item.get("end", 0)))
                except (TypeError, ValueError):
                    continue
                if end <= start:
                    continue
                normalized_items.append({
                    "id": str(item.get("id") or f"{block_key}-{start}-{end}"),
                    "start": start,
                    "end": end,
                })
            normalized_highlights[str(block_key)] = normalized_items
        attempt.metadata["text_highlights"] = normalized_highlights

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
        attempt.metadata["ui_state"] = normalized_ui_state

    attempt.updated_at = datetime.now(timezone.utc)
    _backend().save_attempt(attempt)
    return attempt


def submit_attempt(attempt_id: UUID) -> AttemptRuntime:
    attempt = get_attempt(attempt_id)
    if attempt is None:
        raise KeyError("attempt_not_found")

    now = datetime.now(timezone.utc)
    attempt.completed_at = now
    attempt.updated_at = now
    attempt.time_spent_sec = _normalized_attempt_time_spent(
        saved_time_spent_sec=attempt.time_spent_sec,
        elapsed_fallback_sec=max(0, int((now - attempt.started_at).total_seconds())),
        mode=attempt.mode,
        time_limit_seconds=int(attempt.test_snapshot.get("time_limit_seconds", 0) or 0),
    )
    attempt.status = AttemptStatus.completed

    snapshot_questions = list(attempt.test_snapshot.get("questions", []))
    snapshot_group_shared_options = _snapshot_group_shared_options(attempt.test_snapshot)
    scoring_items: list[dict[str, object]] = []
    section_counts: dict[str, dict[str, object]] = {}
    type_counts: dict[str, dict[str, object]] = {}
    raw_score = 0

    for snapshot_question in snapshot_questions:
        question_id = UUID(str(snapshot_question["question_id"]))
        fixture = get_question_fixture(attempt.test_id, question_id)
        if fixture is None:
            continue
        answer_value = attempt.answers.get(str(question_id))
        is_correct = bool(answer_value) and is_answer_correct(answer_value, list(fixture["accepted_answers"]))
        question_weight = (
            mc_multiple_question_weight(
                question_label=str(snapshot_question.get("label") or fixture["question_number"]),
                accepted_answers=list(fixture["accepted_answers"]),
            )
            if "mc_multiple" in str(fixture["question_type"])
            else 1
        )
        raw_score += question_weight if is_correct else 0

        scoring_item = {
            "question_id": str(question_id),
            "question_number": fixture["question_number"],
            "section_id": str(fixture["section_id"]),
            "section_title": fixture["section_title"],
            "group_title": fixture["group_title"],
            "question_type": str(fixture["question_type"]),
            "prompt": fixture["prompt"],
            "options": (
                [str(option) for option in snapshot_question.get("options", [])]
                or snapshot_group_shared_options.get(str(snapshot_question.get("group_id", "")), [])
            ),
            "answer_value": answer_value,
            "is_correct": is_correct,
            "correct_answers": list(fixture.get("accepted_answers", [])),
            "explanation": fixture.get("explanation"),
            "explanation_reference": fixture.get("explanation_reference", {}),
        }
        scoring_items.append(scoring_item)

        section_key = str(fixture["section_id"])
        section_state = section_counts.setdefault(
            section_key,
            {"title": fixture["section_title"], "correct": 0, "total": 0},
        )
        section_state["total"] += question_weight
        section_state["correct"] += question_weight if is_correct else 0

        type_key = str(fixture["question_type"])
        type_state = type_counts.setdefault(
            type_key,
            {"question_type": str(fixture["question_type"]), "correct": 0, "total": 0},
        )
        type_state["total"] += question_weight
        type_state["correct"] += question_weight if is_correct else 0

    attempt.scoring_items = sorted(scoring_items, key=lambda item: item["question_number"])
    attempt.section_breakdown = list(section_counts.values())
    attempt.question_type_breakdown = list(type_counts.values())
    attempt.raw_score = raw_score
    attempt.band_score = (
        _band_for_raw_score(TestType(str(attempt.test_snapshot["test_type"])), raw_score)
        if TestScope(str(attempt.test_snapshot["scope"])) == TestScope.full
        else None
    )
    attempt.metadata["answers_count"] = _count_answered_values(attempt.answers)
    attempt.metadata["score_status"] = "ready"
    _backend().save_attempt(attempt)
    return attempt
