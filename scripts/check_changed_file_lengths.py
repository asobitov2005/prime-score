from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

MAX_LINES = int(os.getenv("MAX_SOURCE_LINES", "300"))
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


def changed_files() -> list[Path]:
    base_ref = os.getenv("GITHUB_BASE_REF", "").strip()
    if base_ref:
        command = ["git", "diff", "--name-only", f"origin/{base_ref}...HEAD"]
    else:
        command = ["git", "diff", "--name-only", "HEAD~1", "HEAD"]

    try:
        output = subprocess.check_output(command, text=True)
    except subprocess.CalledProcessError:
        output = subprocess.check_output(
            ["git", "show", "--pretty=", "--name-only", "HEAD"],
            text=True,
        )
    return [Path(line.strip()) for line in output.splitlines() if line.strip()]


def is_source_file(path: Path) -> bool:
    return (
        path.suffix in SOURCE_SUFFIXES
        and not any(part in IGNORED_PARTS for part in path.parts)
        and path.is_file()
    )


def line_count(path: Path) -> int:
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        return sum(1 for _ in handle)


def main() -> int:
    violations: list[tuple[Path, int]] = []
    checked = 0
    for path in changed_files():
        if not is_source_file(path):
            continue
        checked += 1
        count = line_count(path)
        if count > MAX_LINES:
            violations.append((path, count))

    print(f"Checked {checked} changed source files (limit: {MAX_LINES} lines).")
    if not violations:
        return 0

    print("Source files exceeding the line limit:", file=sys.stderr)
    for path, count in sorted(violations):
        print(f"- {path}: {count} lines", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
