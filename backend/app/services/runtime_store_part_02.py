from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.runtime_store_dependencies import *
from app.services.runtime_store_part_01 import RUNTIME_STORE_FILE, RedisRuntimeStore, RuntimeStoreBackend, _attempt_payload, _attempt_sort_timestamp, _count_answered_values, _deserialize_attempt

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

    def delete_user_attempts(self, user_id: UUID) -> None:
        def mutator(document: dict[str, object]):
            attempts = dict(document.get("attempts", {}))
            filtered_attempts = {
                attempt_id: payload
                for attempt_id, payload in attempts.items()
                if str(payload.get("user_id")) != str(user_id)
            }
            if len(filtered_attempts) == len(attempts):
                return None, False
            document["attempts"] = filtered_attempts
            return None, True

        self._with_document(mutator)

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

def delete_user_attempts(user_id: UUID) -> None:
    _backend().delete_user_attempts(user_id)

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
