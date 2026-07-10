from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.runtime_store_dependencies import *

try:
    import fcntl
except ModuleNotFoundError:
    fcntl = None

try:
    from redis import Redis
except ModuleNotFoundError:
    Redis = None

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

    def delete_user_attempts(self, user_id: UUID) -> None: ...

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

    def delete_user_attempts(self, user_id: UUID) -> None:
        attempt_ids = self.client.zrevrange(self._user_key(user_id), 0, -1)
        pipe = self.client.pipeline()
        if attempt_ids:
            for attempt_id in attempt_ids:
                pipe.delete(self._attempt_key(attempt_id))
        pipe.delete(self._user_key(user_id))
        pipe.execute()
