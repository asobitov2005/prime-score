from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def _read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_payment_detector_marks_account_offline_and_uses_single_active_bot() -> None:
    source = _read("backend/app/scripts/payment_detector.py")

    assert "UpdateStatusRequest(offline=True)" in source
    assert "active_bot = setting.active_bot or \"HUMOcardbot\"" in source
    assert "@client.on(events.NewMessage(from_users=active_bot))" in source


def test_compose_files_persist_telegram_and_redis_state() -> None:
    for compose_path in ("docker-compose.yml", "docker-compose.dev.yml", "docker-compose.prod.yml"):
        source = _read(compose_path)
        assert "telegram_session_data" in source
        assert "redis_data" in source

    default_compose = _read("docker-compose.yml")
    assert "payment-detector:" in default_compose
    assert "TELEGRAM_SESSION_PATH" in default_compose


def test_docker_image_prepares_telegram_session_dir_and_entrypoint_drops_to_appuser() -> None:
    dockerfile = _read("backend/Dockerfile")
    entrypoint = _read("backend/docker-entrypoint.sh")

    assert "mkdir -p /var/lib/primescore/telegram" in dockerfile
    assert "chown -R appuser:appuser /app /var/lib/primescore" in dockerfile
    assert "USER appuser" not in dockerfile
    assert 'if [ -n "${TELEGRAM_SESSION_PATH:-}" ]; then' in entrypoint
    assert 'chown -R appuser:appuser "$SESSION_DIR"' in entrypoint
    assert 'exec su -s /bin/sh appuser -c "cd /app && exec $*"' in entrypoint
