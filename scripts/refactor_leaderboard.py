from __future__ import annotations

import ast
from pathlib import Path

PATH = Path("backend/app/api/routes/leaderboard.py")
PART_LIMIT = 250

WRAPPER = '''def _build_achievement_catalog(
    *,
    user: User,
    reading_attempt_count: int,
    reading_average_accuracy: float | None,
    listening_perfect_score_reached: bool,
    listening_best_score: int,
    listening_best_target: int,
    writing_submission_count: int,
    writing_best_band: float | None,
    speaking_completed_count: int,
    recent_full_mock_accuracy: float | None,
    recent_full_mock_count: int,
    full_mock_completions: int,
    weekend_day_count: int,
    early_session_count: int,
    late_session_count: int,
    rank: int,
    weekly_rank: int | None,
    leaderboard_size: int,
) -> list[LeaderboardUserAchievementStateRead]:
    context = AchievementCatalogContext(
        user=user,
        reading_attempt_count=reading_attempt_count,
        reading_average_accuracy=reading_average_accuracy,
        listening_perfect_score_reached=listening_perfect_score_reached,
        listening_best_score=listening_best_score,
        listening_best_target=listening_best_target,
        writing_submission_count=writing_submission_count,
        writing_best_band=writing_best_band,
        speaking_completed_count=speaking_completed_count,
        recent_full_mock_accuracy=recent_full_mock_accuracy,
        recent_full_mock_count=recent_full_mock_count,
        full_mock_completions=full_mock_completions,
        weekend_day_count=weekend_day_count,
        early_session_count=early_session_count,
        late_session_count=late_session_count,
        rank=rank,
        weekly_rank=weekly_rank,
        leaderboard_size=leaderboard_size,
    )
    return build_achievement_catalog(context)
'''


def segment(source: str, node: ast.AST) -> str:
    value = ast.get_source_segment(source, node)
    if value is None:
        raise RuntimeError(f"Cannot extract node on line {node.lineno}")
    return value.rstrip()


def patch_catalog(source: str) -> str:
    tree = ast.parse(source)
    target = next(
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef)
        and node.name == "_build_achievement_catalog"
    )
    lines = source.splitlines()
    lines[target.lineno - 1 : target.end_lineno] = WRAPPER.rstrip().splitlines()
    patched = "\n".join(lines) + "\n"
    patched = patched.replace("from math import ceil\n", "")
    marker = "from app.services.xp import (\n"
    imports = (
        "from app.services.leaderboard_achievement_catalog import "
        "build_achievement_catalog\n"
        "from app.services.leaderboard_achievement_common import "
        "AchievementCatalogContext\n"
    )
    if imports not in patched:
        patched = patched.replace(marker, imports + marker, 1)
    return patched


def names_for(node: ast.AST) -> set[str]:
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        return {node.name}
    targets: list[ast.AST] = []
    if isinstance(node, ast.Assign):
        targets = list(node.targets)
    elif isinstance(node, ast.AnnAssign):
        targets = [node.target]
    output: set[str] = set()
    for target in targets:
        if isinstance(target, ast.Name):
            output.add(target.id)
    return output


def refs_for(node: ast.AST) -> set[str]:
    return {
        item.id
        for item in ast.walk(node)
        if isinstance(item, ast.Name) and isinstance(item.ctx, ast.Load)
    }


def is_router_assignment(node: ast.AST) -> bool:
    return isinstance(node, ast.Assign) and any(
        isinstance(target, ast.Name) and target.id == "router"
        for target in node.targets
    )


def is_route(node: ast.AST) -> bool:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return False
    for decorator in node.decorator_list:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        if (
            isinstance(target, ast.Attribute)
            and isinstance(target.value, ast.Name)
            and target.value.id == "router"
        ):
            return True
    return False


def split(patched: str) -> None:
    tree = ast.parse(patched)
    imports = [
        segment(patched, node)
        for node in tree.body
        if isinstance(node, (ast.Import, ast.ImportFrom))
        and not (isinstance(node, ast.ImportFrom) and node.module == "__future__")
    ]
    units = [
        node
        for node in tree.body
        if not isinstance(node, (ast.Import, ast.ImportFrom))
        and not is_router_assignment(node)
    ]
    parts: list[list[ast.AST]] = []
    current: list[ast.AST] = []
    count = 0
    for node in units:
        node_lines = len(segment(patched, node).splitlines()) + 2
        if node_lines > PART_LIMIT:
            raise RuntimeError(f"Node {names_for(node)} remains {node_lines} lines")
        if current and count + node_lines > PART_LIMIT:
            parts.append(current)
            current, count = [], 0
        current.append(node)
        count += node_lines
    if current:
        parts.append(current)

    ownership = {
        name: index
        for index, nodes in enumerate(parts)
        for node in nodes
        for name in names_for(node)
    }
    dependency_path = PATH.with_name("leaderboard_dependencies.py")
    dependency_path.write_text(
        "from __future__ import annotations\n\n"
        + "\n".join(imports)
        + "\n\n__all__ = [name for name in globals() if not name.startswith('__')]\n"
    )

    for index, nodes in enumerate(parts):
        cross: dict[int, set[str]] = {}
        for node in nodes:
            for name in refs_for(node):
                owner = ownership.get(name)
                if owner is not None and owner != index:
                    cross.setdefault(owner, set()).add(name)
        header = [
            "from __future__ import annotations",
            "",
            "# ruff: noqa: F401,F403,F405,E501",
            "from app.api.routes.leaderboard_dependencies import *",
        ]
        for owner, names in sorted(cross.items()):
            header.append(
                "from app.api.routes.leaderboard_part_"
                f"{owner + 1:02d} import {', '.join(sorted(names))}"
            )
        if any(is_route(node) for node in nodes):
            header.extend(["", "router = APIRouter()"])
        body = "\n\n".join(segment(patched, node) for node in nodes)
        content = "\n".join(header) + "\n\n" + body + "\n"
        if len(content.splitlines()) > 300:
            raise RuntimeError(f"Part {index + 1} exceeds 300 lines")
        PATH.with_name(f"leaderboard_part_{index + 1:02d}.py").write_text(content)

    module_imports = "\n".join(
        f"from app.api.routes import leaderboard_part_{index + 1:02d} as _part_{index + 1:02d}"
        for index in range(len(parts))
    )
    tuple_value = ", ".join(
        f"_part_{index + 1:02d}" for index in range(len(parts))
    )
    PATH.write_text(
        f'''from __future__ import annotations

import sys
import types

from fastapi import APIRouter

{module_imports}

_PARTS = ({tuple_value},)
router = APIRouter()
for _part in _PARTS:
    if hasattr(_part, "router"):
        router.routes.extend(_part.router.routes)
    for _name, _value in vars(_part).items():
        if _name == "router" or _name.startswith("__"):
            continue
        globals().setdefault(_name, _value)


class _LeaderboardFacade(types.ModuleType):
    def __setattr__(self, name: str, value: object) -> None:
        super().__setattr__(name, value)
        if name.startswith("__") or name == "router":
            return
        for part in _PARTS:
            if hasattr(part, name):
                setattr(part, name, value)


sys.modules[__name__].__class__ = _LeaderboardFacade
__all__ = [name for name in globals() if not name.startswith("_")]
'''
    )


def main() -> None:
    split(patch_catalog(PATH.read_text()))


if __name__ == "__main__":
    main()
