from __future__ import annotations

import os
import subprocess
import sys
from collections.abc import Iterable
from pathlib import Path

MAX_LINES = int(os.getenv("MAX_SOURCE_LINES", "300"))
FULL_SOURCE_SCAN = os.getenv("FULL_SOURCE_SCAN", "").strip().lower() in {
    "1",
    "true",
    "yes",
}
SOURCE_SUFFIXES = {".py", ".js", ".jsx", ".ts", ".tsx"}
IGNORED_PARTS = {
    ".git",
    ".next",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "migrations",
    "alembic",
}


def base_ref() -> str | None:
    value = os.getenv("GITHUB_BASE_REF", "").strip()
    return f"origin/{value}" if value else None


def changed_files() -> list[Path]:
    base = base_ref()
    command = (
        ["git", "diff", "--name-only", f"{base}...HEAD"]
        if base
        else ["git", "diff", "--name-only", "HEAD~1", "HEAD"]
    )
    try:
        output = subprocess.check_output(command, text=True)
    except subprocess.CalledProcessError:
        output = subprocess.check_output(
            ["git", "show", "--pretty=", "--name-only", "HEAD"],
            text=True,
        )
    return [Path(line.strip()) for line in output.splitlines() if line.strip()]


def repository_files() -> Iterable[Path]:
    return Path(".").rglob("*")


def source_files() -> Iterable[Path]:
    return repository_files() if FULL_SOURCE_SCAN else changed_files()


def is_source_file(path: Path) -> bool:
    return (
        path.suffix in SOURCE_SUFFIXES
        and not any(part in IGNORED_PARTS for part in path.parts)
        and path.is_file()
    )


def line_count(path: Path) -> int:
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        return sum(1 for _ in handle)


def base_line_count(path: Path) -> int | None:
    base = base_ref()
    if not base:
        return None
    try:
        content = subprocess.check_output(
            ["git", "show", f"{base}:{path.as_posix()}"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        return None
    return len(content.splitlines())


def main() -> int:
    violations: list[tuple[Path, int, int | None]] = []
    legacy_non_growing: list[tuple[Path, int, int]] = []
    checked = 0

    for path in source_files():
        if not is_source_file(path):
            continue
        checked += 1
        current_count = line_count(path)
        if current_count <= MAX_LINES:
            continue

        previous_count = None if FULL_SOURCE_SCAN else base_line_count(path)
        if (
            previous_count is not None
            and previous_count > MAX_LINES
            and current_count <= previous_count
        ):
            legacy_non_growing.append((path, previous_count, current_count))
            continue
        violations.append((path, current_count, previous_count))

    scope = "all" if FULL_SOURCE_SCAN else "changed"
    print(f"Checked {checked} {scope} source files (limit: {MAX_LINES} lines).")
    for path, previous, current in sorted(legacy_non_growing):
        print(
            f"Legacy oversized file did not grow: {path} "
            f"({previous} -> {current} lines)."
        )
    if not violations:
        return 0

    print("Source file size violations:", file=sys.stderr)
    for path, current, previous in sorted(violations):
        baseline = "repository-wide scan" if FULL_SOURCE_SCAN else (
            "new file" if previous is None else f"previously {previous}"
        )
        print(
            f"- {path}: {current} lines ({baseline}, limit {MAX_LINES})",
            file=sys.stderr,
        )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
