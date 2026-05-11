from __future__ import annotations

import importlib


def test_payment_detector_uses_env_session_path(monkeypatch) -> None:
    monkeypatch.setenv("TELEGRAM_SESSION_PATH", "/tmp/primescore-telegram/session")

    import app.scripts.payment_detector as payment_detector

    reloaded = importlib.reload(payment_detector)

    assert str(reloaded.SESSION_PATH) == "/tmp/primescore-telegram/session"
