from __future__ import annotations

from uuid import UUID, uuid4

from app.core.enums import TestMode, TestScope
from app.services.fixtures import READING_TEST_ID
from app.services import runtime_store


def test_runtime_store_persists_attempts_outside_process_memory(tmp_path, monkeypatch) -> None:
    store_path = tmp_path / "runtime-store.json"
    first_backend = runtime_store.FileRuntimeStore(store_path)
    second_backend = runtime_store.FileRuntimeStore(store_path)
    user_id = UUID("33333333-3333-3333-3333-333333333333")

    monkeypatch.setattr(runtime_store, "_backend", lambda: first_backend)
    attempt = runtime_store.start_attempt(
        user_id=user_id,
        test_id=READING_TEST_ID,
        scope=TestScope.full,
        section_id=None,
        mode=TestMode.practice,
    )

    runtime_store.save_answer(
        attempt.attempt_id,
        UUID("eee10c17-4108-529c-80fe-aadbd729034c"),
        "TRUE",
    )

    monkeypatch.setattr(runtime_store, "_backend", lambda: second_backend)
    restored = runtime_store.get_attempt(attempt.attempt_id)

    assert restored is not None
    assert restored.answers[str(UUID("eee10c17-4108-529c-80fe-aadbd729034c"))] == "TRUE"
    assert store_path.exists()
    assert attempt.attempt_id in {item.attempt_id for item in runtime_store.iter_user_attempts(user_id)}


def test_runtime_store_submit_preserves_scoring_after_backend_reopen(tmp_path, monkeypatch) -> None:
    store_path = tmp_path / "runtime-store.json"
    user_id = uuid4()

    monkeypatch.setattr(runtime_store, "_backend", lambda: runtime_store.FileRuntimeStore(store_path))
    attempt = runtime_store.start_attempt(
        user_id=user_id,
        test_id=READING_TEST_ID,
        scope=TestScope.full,
        section_id=None,
        mode=TestMode.practice,
    )
    runtime_store.save_answer(
        attempt.attempt_id,
        UUID("eee10c17-4108-529c-80fe-aadbd729034c"),
        "TRUE",
    )

    monkeypatch.setattr(runtime_store, "_backend", lambda: runtime_store.FileRuntimeStore(store_path))
    submitted = runtime_store.submit_attempt(attempt.attempt_id)

    assert submitted.raw_score == 1
    assert submitted.metadata["score_status"] == "ready"
    assert submitted.section_breakdown[0]["correct"] >= 1
