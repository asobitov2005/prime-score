from __future__ import annotations

from types import SimpleNamespace
from uuid import UUID

import pytest

from app.tasks.tasks import evaluate_writing_submission_task


SUBMISSION_ID = UUID("aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb")


class _RetrySignal(Exception):
    pass


def _call_task_with(task_self: object, submission_id: UUID) -> object:
    return evaluate_writing_submission_task.run.__func__(task_self, str(submission_id))


def test_writing_celery_task_requeues_before_final_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.tasks import tasks as tasks_module
    from app.services import writing_checker

    events: list[tuple[str, str]] = []

    async def fake_grade_submission(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("transient grader failure")

    async def fake_mark_submission_retrying(submission_id: UUID) -> None:
        events.append(("queued", str(submission_id)))

    async def fake_mark_submission_failed(*_args: object, **_kwargs: object) -> None:
        events.append(("failed", "unexpected"))

    def fake_reset_session_state() -> None:
        events.append(("reset", "db"))

    def fake_retry(*, exc: Exception, countdown: int) -> None:
        events.append(("retry", f"{type(exc).__name__}:{countdown}"))
        raise _RetrySignal()

    monkeypatch.setattr(writing_checker, "grade_submission", fake_grade_submission)
    monkeypatch.setattr(writing_checker, "mark_submission_retrying", fake_mark_submission_retrying)
    monkeypatch.setattr(writing_checker, "mark_submission_failed", fake_mark_submission_failed)
    monkeypatch.setattr(tasks_module, "reset_session_state", fake_reset_session_state)
    fake_task = SimpleNamespace(
        request=SimpleNamespace(retries=0),
        max_retries=2,
        default_retry_delay=15,
        retry=fake_retry,
    )

    with pytest.raises(_RetrySignal):
        _call_task_with(fake_task, SUBMISSION_ID)

    assert events == [
        ("reset", "db"),
        ("reset", "db"),
        ("reset", "db"),
        ("queued", str(SUBMISSION_ID)),
        ("reset", "db"),
        ("retry", "RuntimeError:15"),
    ]


def test_writing_celery_task_marks_failed_after_last_retry(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.tasks import tasks as tasks_module
    from app.services import writing_checker

    events: list[tuple[str, str]] = []

    async def fake_grade_submission(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("permanent grader failure")

    async def fake_mark_submission_retrying(*_args: object, **_kwargs: object) -> None:
        events.append(("queued", "unexpected"))

    async def fake_mark_submission_failed(submission_id: UUID, error_message: str) -> None:
        events.append(("failed", f"{submission_id}:{error_message}"))

    def fake_reset_session_state() -> None:
        events.append(("reset", "db"))

    def fake_retry(**_kwargs: object) -> None:
        raise AssertionError("retry should not be called on the final attempt")

    monkeypatch.setattr(writing_checker, "grade_submission", fake_grade_submission)
    monkeypatch.setattr(writing_checker, "mark_submission_retrying", fake_mark_submission_retrying)
    monkeypatch.setattr(writing_checker, "mark_submission_failed", fake_mark_submission_failed)
    monkeypatch.setattr(tasks_module, "reset_session_state", fake_reset_session_state)
    fake_task = SimpleNamespace(
        request=SimpleNamespace(retries=2),
        max_retries=2,
        default_retry_delay=15,
        retry=fake_retry,
    )

    with pytest.raises(RuntimeError, match="permanent grader failure"):
        _call_task_with(fake_task, SUBMISSION_ID)

    assert events == [
        ("reset", "db"),
        ("reset", "db"),
        ("reset", "db"),
        ("failed", f"{SUBMISSION_ID}:permanent grader failure"),
        ("reset", "db"),
    ]
