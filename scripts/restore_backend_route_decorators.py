from __future__ import annotations

import ast
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SplitMapping:
    source_ref: str
    source_path: str
    part_glob: str


MAPPINGS = (
    SplitMapping("cba60c5^", "backend/app/api/routes/attempts.py", "backend/app/api/routes/attempts_part_*.py"),
    SplitMapping("cba60c5^", "backend/app/api/routes/me.py", "backend/app/api/routes/me_part_*.py"),
    SplitMapping("cba60c5^", "backend/app/api/routes/writing.py", "backend/app/api/routes/writing_part_*.py"),
    SplitMapping("cba60c5^", "backend/app/api/routes/admin_speaking.py", "backend/app/api/routes/admin_speaking_part_*.py"),
    SplitMapping("2b2d3218^", "backend/app/api/routes/admin.py", "backend/app/api/routes/admin_*_routes.py"),
    SplitMapping("911c7001^", "backend/app/api/routes/leaderboard.py", "backend/app/api/routes/leaderboard_part_*.py"),
)


def git_show(ref: str, path: str) -> str:
    return subprocess.check_output(
        ["git", "show", f"{ref}:{path}"],
        text=True,
    )


def decorator_text(source: str, decorator: ast.expr) -> str:
    segment = ast.get_source_segment(source, decorator)
    if segment is None:
        raise RuntimeError("Could not recover decorator source")
    return "@" + segment


def route_decorators_by_function(source: str) -> dict[str, list[str]]:
    tree = ast.parse(source)
    result: dict[str, list[str]] = {}
    for node in tree.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        decorators = [
            decorator_text(source, decorator)
            for decorator in node.decorator_list
            if decorator_text(source, decorator).startswith("@router.")
        ]
        if decorators:
            result[node.name] = decorators
    return result


def restore_file(path: Path, wanted: dict[str, list[str]]) -> int:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))
    lines = source.splitlines(keepends=True)
    changes = 0

    functions = [
        node
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name in wanted
    ]
    for node in sorted(functions, key=lambda item: item.lineno, reverse=True):
        desired = wanted[node.name]
        current_route_decorators = [
            decorator
            for decorator in node.decorator_list
            if decorator_text(source, decorator).startswith("@router.")
        ]
        current = [decorator_text(source, decorator) for decorator in current_route_decorators]
        if current == desired:
            continue

        insertion_index = min(
            [decorator.lineno for decorator in node.decorator_list] or [node.lineno]
        ) - 1
        for decorator in sorted(
            current_route_decorators,
            key=lambda item: item.lineno,
            reverse=True,
        ):
            start = decorator.lineno - 1
            end = decorator.end_lineno or decorator.lineno
            del lines[start:end]

        lines.insert(insertion_index, "\n".join(desired) + "\n")
        changes += 1

    if changes:
        path.write_text("".join(lines), encoding="utf-8")
    return changes


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    restored = 0
    for mapping in MAPPINGS:
        original = git_show(mapping.source_ref, mapping.source_path)
        wanted = route_decorators_by_function(original)
        for part_path in sorted(root.glob(mapping.part_glob)):
            count = restore_file(part_path, wanted)
            if count:
                print(f"{part_path}: restored {count} exact route decorator block(s)")
                restored += count
    print(f"Restored {restored} route decorator block(s) total.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
