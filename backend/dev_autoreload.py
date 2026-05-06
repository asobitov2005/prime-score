from __future__ import annotations

import hashlib
import os
import signal
import subprocess
import sys
import time
from pathlib import Path


WATCH_EXTENSIONS = {
    ".env",
    ".ini",
    ".json",
    ".py",
    ".toml",
    ".txt",
    ".yaml",
    ".yml",
}
DEFAULT_WATCH_PATHS = [
    "/app/app",
    "/app/alembic",
    "/app/.env",
    "/app/alembic.ini",
    "/app/pyproject.toml",
    "/app/dev_autoreload.py",
]


def iter_files(path: Path):
    if not path.exists():
        return
    if path.is_file():
        yield path
        return
    for child in path.rglob("*"):
        if child.is_file():
            yield child


def should_watch(path: Path) -> bool:
    return path.name == ".env" or path.suffix.lower() in WATCH_EXTENSIONS


def snapshot(paths: list[Path]) -> str:
    digest = hashlib.blake2b(digest_size=16)
    for root in paths:
        for file_path in sorted(iter_files(root) or (), key=lambda item: str(item)):
            if not should_watch(file_path):
                continue
            stat = file_path.stat()
            digest.update(str(file_path).encode())
            digest.update(str(stat.st_mtime_ns).encode())
            digest.update(str(stat.st_size).encode())
    return digest.hexdigest()


def watch_paths() -> list[Path]:
    raw = os.environ.get("WATCH_PATHS")
    items = raw.split(",") if raw else DEFAULT_WATCH_PATHS
    return [Path(item.strip()) for item in items if item.strip()]


def main() -> int:
    if "--" not in sys.argv:
        print("usage: python /app/dev_autoreload.py -- <command...>", file=sys.stderr)
        return 2

    command = sys.argv[sys.argv.index("--") + 1 :]
    if not command:
        print("missing command after --", file=sys.stderr)
        return 2

    paths = watch_paths()
    interval = float(os.environ.get("WATCH_INTERVAL", "1"))
    stopping = False
    child: subprocess.Popen[str] | None = None

    def stop_child() -> None:
        nonlocal child
        if child is None or child.poll() is not None:
            return
        child.terminate()
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=5)

    def handle_signal(signum: int, _frame) -> None:
        nonlocal stopping
        stopping = True
        stop_child()
        raise SystemExit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    last_snapshot = ""

    while not stopping:
        child = subprocess.Popen(command)
        last_snapshot = snapshot(paths)

        while not stopping:
            time.sleep(interval)
            current_snapshot = snapshot(paths)
            if current_snapshot != last_snapshot:
                print("dev-autoreload: change detected, restarting", flush=True)
                stop_child()
                break
            if child.poll() is not None:
                print(
                    f"dev-autoreload: process exited with code {child.returncode}, restarting",
                    flush=True,
                )
                break

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
