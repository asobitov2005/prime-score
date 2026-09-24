from __future__ import annotations

from uuid import uuid4
import pytest
from httpx import ASGITransport, AsyncClient
from app.services.fixtures import LISTENING_TEST_ID, READING_TEST_ID


@pytest.fixture(autouse=True)
def enable_legacy_debug_headers_for_smoke_tests(monkeypatch):
    monkeypatch.setattr("app.core.deps.get_settings", lambda: type("Settings", (), {"allow_debug_auth_headers": True})())

__all__ = [name for name in globals() if not name.startswith('__')]
