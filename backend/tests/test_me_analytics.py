from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.api.routes import auth as auth_routes
from app.api.routes import me as me_routes
from app.core.enums import UserRole
from app.models.enums import WritingTaskType, WritingSubmissionStatus
from app.models.user import Session as UserSession
from app.models.user import User
from app.models.writing import WritingSubmission, WritingTask
from app.schemas.common import DebugPrincipal


class _FakeExecuteResult:
    def __init__(self, *, rows: list[tuple[object, ...]] | None = None, first_row: tuple[object, ...] | None = None) -> None:
        self._rows = rows or []
        self._first_row = first_row

    def all(self) -> list[tuple[object, ...]]:
        return self._rows

    def first(self) -> tuple[object, ...] | None:
        return self._first_row


class _FakeSession:
    def __init__(self, result: _FakeExecuteResult) -> None:
        self._result = result
        self.commits = 0

    async def execute(self, _statement):
        return self._result

    async def commit(self) -> None:
        self.commits += 1


def test_effective_attempt_band_score_falls_back_for_full_attempts() -> None:
    attempt = SimpleNamespace(
        band_score=None,
        raw_score=35,
        total_questions=40,
        scope=None,
        test_snapshot={"test_type": "reading", "scope": "full"},
    )

    assert me_routes._effective_attempt_band_score(attempt) == Decimal("8.0")


def test_effective_attempt_band_score_scales_section_attempts() -> None:
    attempt = SimpleNamespace(
        band_score=None,
        raw_score=9,
        total_questions=13,
        scope=None,
        test_snapshot={"test_type": "reading", "scope": "section"},
    )

    assert me_routes._effective_attempt_band_score(attempt) == Decimal("6.5")


def test_effective_attempt_band_score_returns_zero_for_low_scores() -> None:
    attempt = SimpleNamespace(
        band_score=None,
        raw_score=1,
        total_questions=40,
        scope=None,
        test_snapshot={"test_type": "reading", "scope": "full"},
    )

    assert me_routes._effective_attempt_band_score(attempt) == Decimal("0.0")


@pytest.mark.asyncio
async def test_load_writing_attempts_maps_time_spent_seconds() -> None:
    current_user = DebugPrincipal(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        first_name="Prime",
        last_name="User",
        username="prime_user",
        phone="+998901234567",
        role=UserRole.user,
        is_premium=True,
        show_on_leaderboard=True,
    )
    submission = WritingSubmission(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        user_id=current_user.id,
        task_id=UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        task_type=WritingTaskType.TASK_2,
        essay_text="Sample essay",
        word_count=250,
        essay_hash="hash",
        status=WritingSubmissionStatus.COMPLETED,
        submitted_at=datetime(2026, 5, 9, 12, 0, tzinfo=UTC),
        time_spent_seconds=1540,
    )
    task = WritingTask(
        id=submission.task_id,
        title="Writing Task 2",
        task_type=WritingTaskType.TASK_2,
        prompt_html="<p>Prompt</p>",
        word_minimum=250,
        time_limit_seconds=2400,
        difficulty="medium",
        status="published",
    )
    session = _FakeSession(_FakeExecuteResult(rows=[(submission, None, task)]))

    attempts = await me_routes._load_writing_attempts(current_user, session)

    assert len(attempts) == 1
    assert attempts[0].time_spent_sec == 1540
    assert attempts[0].test_snapshot["test_type"] == "writing"


@pytest.mark.asyncio
async def test_get_session_status_returns_current_user_session() -> None:
    current_user = DebugPrincipal(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        first_name="Prime",
        last_name="User",
        username="prime_user",
        phone="+998901234567",
        role=UserRole.user,
        is_premium=True,
        show_on_leaderboard=True,
    )
    session = UserSession(
        id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        user_id=current_user.id,
        refresh_token_hash="hash",
        device_info={"browser": "Chrome"},
        is_active=True,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    user = User(
        id=current_user.id,
        telegram_id=123456789,
        phone=current_user.phone or "+998901234567",
        first_name="Prime",
        last_name="User",
        username="prime_user",
        is_premium=True,
        show_on_leaderboard=True,
    )
    db = _FakeSession(_FakeExecuteResult(first_row=(session, user)))

    response = await auth_routes.get_session_status(
        session_id=session.id,
        current_user=current_user,
        db=db,
    )

    assert response.session_id == session.id
    assert response.user.id == current_user.id
    assert response.user.telegram_id == 123456789
    assert db.commits == 1
    assert session.last_used_at is not None
