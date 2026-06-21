from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

from httpx import ASGITransport, AsyncClient

from app.core.deps import get_current_user
from app.api.routes.speaking import _build_live_system_instruction
from app.db.session import get_db_session
from app.models.enums import AiProvider, AiUseCase
from app.schemas.common import DebugPrincipal


TEST_ID = UUID("33333333-3333-3333-3333-333333333333")
SESSION_ID = UUID("44444444-4444-4444-4444-444444444444")
MODEL_RECORD_ID = UUID("66666666-6666-6666-6666-666666666666")
PROVIDER_CONFIG_ID = UUID("77777777-7777-7777-7777-777777777777")


def _debug_user() -> DebugPrincipal:
    return DebugPrincipal(
        id=UUID("55555555-5555-5555-5555-555555555555"),
        first_name="Azizbek",
        last_name="Prime",
        username="azizbek",
        phone="+998901234567",
        role="user",
        is_premium=True,
        show_on_leaderboard=True,
    )


def _published_test() -> SimpleNamespace:
    return SimpleNamespace(
        id=TEST_ID,
        title="Speaking Mock Test 1",
        slug="speaking-mock-test-1",
        status="published",
        access_type="public",
        mode_kind="full",
        source="real_exam",
        source_detail="May-Aug 2026",
        description="A dedicated speaking mock.",
        estimated_minutes=14,
        version=1,
        created_by=None,
        created_at=datetime(2026, 5, 10, tzinfo=UTC),
        updated_at=datetime(2026, 5, 10, tzinfo=UTC),
    )


class _FakeScalarResult:
    def __init__(self, rows: list[SimpleNamespace]) -> None:
        self._rows = rows

    def all(self) -> list[SimpleNamespace]:
        return self._rows


class _FakeExecuteResult:
    def __init__(self, rows: list[tuple[SimpleNamespace, SimpleNamespace, SimpleNamespace | None]]) -> None:
        self._rows = rows

    def all(self) -> list[tuple[SimpleNamespace, SimpleNamespace, SimpleNamespace | None]]:
        return self._rows

    def first(self) -> tuple[SimpleNamespace, SimpleNamespace, SimpleNamespace | None] | None:
        return self._rows[0] if self._rows else None


class _FakeSession:
    def __init__(self) -> None:
        self.test = _published_test()
        self.added: list[object] = []

    async def scalar(self, _statement: object) -> int:
        return 1

    async def scalars(self, _statement: object) -> _FakeScalarResult:
        return _FakeScalarResult([self.test])

    async def execute(self, _statement: object) -> _FakeExecuteResult:
        return _FakeExecuteResult([])

    async def get(self, _model: object, _identity: object) -> SimpleNamespace:
        return self.test

    def add(self, item: object) -> None:
        self.added.append(item)

    async def flush(self) -> None:
        for item in self.added:
            if getattr(item, "id", None) is None:
                item.id = SESSION_ID

    async def commit(self) -> None:
        return None

    async def refresh(self, item: object) -> None:
        if getattr(item, "id", None) is None:
            item.id = SESSION_ID
        if getattr(item, "created_at", None) is None:
            item.created_at = datetime(2026, 5, 10, tzinfo=UTC)
        if getattr(item, "updated_at", None) is None:
            item.updated_at = datetime(2026, 5, 10, tzinfo=UTC)


async def _fake_resolve_ai_use_case_config(_session: object, use_case: AiUseCase) -> SimpleNamespace:
    model_id = "gemini-live-2.5-flash-native-audio" if use_case == AiUseCase.SPEAKING_EXAMINER else "gemini-3-flash-preview"
    return SimpleNamespace(
        use_case=use_case,
        provider=AiProvider.GOOGLE,
        provider_config_id=PROVIDER_CONFIG_ID,
        provider_label="Google",
        api_key="test-key",
        base_url=None,
        model_id=model_id,
        model_record_id=MODEL_RECORD_ID,
        settings_json={},
        context_window=None,
        source="db",
    )


class _HistorySession(_FakeSession):
    def __init__(self) -> None:
        super().__init__()
        self.evaluation = SimpleNamespace(overall_band=6.5)
        self.history_session = SimpleNamespace(
            id=SESSION_ID,
            speaking_test_id=TEST_ID,
            status="graded",
            entry_mode="full",
            current_part=None,
            warning_count=0,
            termination_reason=None,
            created_at=datetime(2026, 5, 10, 9, 0, tzinfo=UTC),
            updated_at=datetime(2026, 5, 10, 9, 20, tzinfo=UTC),
            started_at=datetime(2026, 5, 10, 9, 5, tzinfo=UTC),
            ended_at=datetime(2026, 5, 10, 9, 18, tzinfo=UTC),
            graded_at=datetime(2026, 5, 10, 9, 20, tzinfo=UTC),
            session_metadata={
                "transcript": {
                    "full": "Examiner: What do you do?\n\nCandidate: I am a student.",
                    "candidate": "I am a student.",
                    "examiner": "What do you do?",
                }
            },
        )

    async def scalars(self, statement: object) -> _FakeScalarResult:
        statement_str = str(statement)
        if "speaking_sessions" in statement_str:
            return _FakeScalarResult([self.history_session])
        return await super().scalars(statement)

    async def execute(self, _statement: object) -> _FakeExecuteResult:
        return _FakeExecuteResult([(self.history_session, self.test, self.evaluation)])


class _DeleteSession(_HistorySession):
    def __init__(self) -> None:
        super().__init__()
        self.execute_count = 0

    async def scalar(self, _statement: object) -> SimpleNamespace:
        return self.history_session

    async def execute(self, _statement: object) -> _FakeExecuteResult:
        self.execute_count += 1
        return _FakeExecuteResult([])


async def test_user_can_list_published_speaking_tests(app) -> None:
    async def override_db_session():
        yield _FakeSession()

    async def override_user():
        return _debug_user()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/speaking/tests")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == str(TEST_ID)


async def test_user_can_create_speaking_session(app, monkeypatch) -> None:
    monkeypatch.setattr("app.api.routes.speaking.resolve_ai_use_case_config", _fake_resolve_ai_use_case_config)
    fake_session = _FakeSession()

    async def override_db_session():
        yield fake_session

    async def override_user():
        return _debug_user()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/speaking/sessions",
                json={"speaking_test_id": str(TEST_ID), "entry_mode": "full"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    payload = response.json()
    assert payload["session_id"] == str(SESSION_ID)
    assert payload["entry_mode"] == "full"
    created_session = fake_session.added[0]
    assert created_session.live_provider == "google"
    assert created_session.live_model_code == "gemini-live-2.5-flash-native-audio"
    assert len(fake_session.added) == 4


def test_live_system_instruction_keeps_examiner_human_but_formal() -> None:
    instruction = _build_live_system_instruction(
        {
            "system_instruction": "You are the PrimeScore IELTS Speaking examiner.",
            "part_instructions": {"part_1": "Ask familiar-topic questions."},
        },
        mode="strict_exam",
        entry_mode="part_1",
        part=1,
        topic="work and studies",
        random_topic=False,
    )

    assert "real person" in instruction
    assert "warm professional tone" in instruction
    assert "small natural reactions" in instruction
    assert "do not reveal scores" in instruction


def test_live_system_instruction_uses_admin_mode_prompt_override() -> None:
    instruction = _build_live_system_instruction(
        {
            "system_instruction": "Base admin prompt.",
            "mode_instructions": {
                "uzbek_roast": "CUSTOM ADMIN ROAST PROMPT. Hard Uzbek pressure, but no hate or violent threats.",
            },
        },
        mode="uzbek_roast",
        entry_mode="full",
        part=2,
        topic="technology",
        random_topic=False,
    )

    assert "Base admin prompt." in instruction
    assert "CUSTOM ADMIN ROAST PROMPT" in instruction
    assert "Selected topic: technology" in instruction
    assert "strict exam" not in instruction.lower()


def test_live_system_instruction_supports_multiple_selected_topics() -> None:
    instruction = _build_live_system_instruction(
        {"system_instruction": "You are the PrimeScore IELTS Speaking examiner."},
        mode="strict_exam",
        entry_mode="part_1",
        part=1,
        topics=["Work", "Hometown", "Food"],
        random_topic=False,
    )

    assert "Selected topics (3): Work; Hometown; Food" in instruction


async def test_user_can_list_submitted_speaking_history(app) -> None:
    async def override_db_session():
        yield _HistorySession()

    async def override_user():
        return _debug_user()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/speaking/sessions/history")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"][0]["session_id"] == str(SESSION_ID)
    assert payload["items"][0]["overall_band"] == 6.5


async def test_user_can_delete_speaking_session(app) -> None:
    fake_session = _DeleteSession()

    async def override_db_session():
        yield fake_session

    async def override_user():
        return _debug_user()

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(f"/api/speaking/sessions/{SESSION_ID}")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert fake_session.execute_count == 6
