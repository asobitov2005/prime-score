from __future__ import annotations

from types import SimpleNamespace
from uuid import UUID

import pytest

from app.models.user import User
from app.services import user_cleanup


class _FakeSession:
    def __init__(self) -> None:
        self.statements: list[str] = []

    async def execute(self, statement) -> None:
        self.statements.append(str(statement))


@pytest.mark.asyncio
async def test_purge_user_data_skips_missing_optional_tables(monkeypatch) -> None:
    session = _FakeSession()
    user = User(
        id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        telegram_id=123456789,
        phone="+998901111111",
        first_name="Test",
        last_name=None,
        username=None,
        is_premium=False,
    )

    async def fake_table_exists(_session, table_name: str) -> bool:
        return table_name != "speaking_turns"

    monkeypatch.setattr(user_cleanup, "_table_exists", fake_table_exists)
    monkeypatch.setattr(user_cleanup, "delete_user_attempts", lambda _user_id: None)

    async def fake_delete_contact(_telegram_id: int) -> None:
        return None

    monkeypatch.setattr(
        user_cleanup,
        "get_code_store",
        lambda: SimpleNamespace(delete_contact=fake_delete_contact),
    )

    await user_cleanup.purge_user_data(session, user=user)

    assert any("DELETE FROM users" in statement for statement in session.statements)
    assert all("speaking_turns" not in statement for statement in session.statements)
