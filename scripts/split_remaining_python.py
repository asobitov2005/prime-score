from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path

MAX_PART_LINES = 270
TARGETS = [
    "backend/app/services/admin_example_reading_seed.py",
    "backend/app/scripts/generate_reading_explanations.py",
    "backend/app/services/fixtures.py",
    "backend/app/api/routes/admin_ai.py",
    "backend/app/services/writing_config.py",
    "backend/app/api/routes/admin_writing.py",
    "backend/app/bot/main.py",
    "backend/app/services/runtime_store.py",
    "backend/app/schemas/admin.py",
    "backend/app/services/writing_blueprint.py",
    "backend/app/api/routes/admin_writing_config.py",
    "backend/app/services/ai_generation.py",
    "backend/app/schemas/writing.py",
    "backend/app/api/routes/admin_speaking.py",
    "backend/app/services/gift_entitlements.py",
    "backend/app/schemas/me.py",
    "backend/app/models/writing.py",
    "backend/app/schemas/admin_ai.py",
    "backend/tests/test_admin_telegram_otp_auth.py",
    "backend/tests/test_telegram_login.py",
    "backend/tests/test_writing_checker.py",
    "backend/tests/test_premium_bonus.py",
    "backend/tests/test_admin_test_publish_guards.py",
    "backend/tests/test_speaking_admin_api.py",
    "backend/tests/test_smoke.py",
    "backend/tests/test_speaking_user_api.py",
    "backend/tests/test_xp_system.py",
]


@dataclass
class Unit:
    node: ast.AST
    text: str
    names: set[str]
    refs: set[str]
    globals: set[str]
    lines: int
    route: bool


class RefCollector(ast.NodeVisitor):
    def __init__(self) -> None:
        self.refs: set[str] = set()
        self.globals: set[str] = set()

    def visit_Name(self, node: ast.Name) -> None:
        if isinstance(node.ctx, ast.Load):
            self.refs.add(node.id)
        self.generic_visit(node)

    def visit_Global(self, node: ast.Global) -> None:
        self.globals.update(node.names)


def segment(source: str, node: ast.AST) -> str:
    value = ast.get_source_segment(source, node)
    if value is None:
        raise RuntimeError(f"Cannot extract line {node.lineno}")
    return value.rstrip()


def assigned_names(node: ast.AST) -> set[str]:
    def names(target: ast.AST) -> set[str]:
        if isinstance(target, ast.Name):
            return {target.id}
        if isinstance(target, (ast.Tuple, ast.List)):
            return set().union(*(names(item) for item in target.elts))
        return set()

    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        return {node.name}
    if isinstance(node, ast.Assign):
        return set().union(*(names(item) for item in node.targets))
    if isinstance(node, ast.AnnAssign):
        return names(node.target)
    return set()


def route_node(node: ast.AST) -> bool:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return False
    for decorator in node.decorator_list:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name):
            if target.value.id == "router":
                return True
    return False


def router_assignment(node: ast.AST) -> bool:
    return isinstance(node, ast.Assign) and any(
        isinstance(target, ast.Name) and target.id == "router"
        for target in node.targets
    )


def build_units(source: str, tree: ast.Module) -> tuple[list[Unit], list[str]]:
    units: list[Unit] = []
    imports: list[str] = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            if not (isinstance(node, ast.ImportFrom) and node.module == "__future__"):
                imports.append(segment(source, node))
            continue
        if router_assignment(node):
            continue
        collector = RefCollector()
        collector.visit(node)
        text = segment(source, node)
        units.append(
            Unit(
                node=node,
                text=text,
                names=assigned_names(node),
                refs=collector.refs,
                globals=collector.globals,
                lines=len(text.splitlines()),
                route=route_node(node),
            )
        )
    return units, imports


def graph_for(units: list[Unit]) -> list[set[int]]:
    owners: dict[str, list[int]] = {}
    for index, unit in enumerate(units):
        for name in unit.names:
            owners.setdefault(name, []).append(index)
    graph = [set() for _ in units]
    for index, unit in enumerate(units):
        for name in unit.refs | unit.globals:
            for owner in owners.get(name, []):
                if owner != index:
                    graph[index].add(owner)
        for name in unit.globals:
            for other, candidate in enumerate(units):
                if other != index and name in (candidate.names | candidate.refs | candidate.globals):
                    graph[index].add(other)
                    graph[other].add(index)
    return graph


def components(graph: list[set[int]]) -> list[list[int]]:
    index = 0
    stack: list[int] = []
    indexes = [-1] * len(graph)
    low = [0] * len(graph)
    active = [False] * len(graph)
    output: list[list[int]] = []

    def visit(vertex: int) -> None:
        nonlocal index
        indexes[vertex] = low[vertex] = index
        index += 1
        stack.append(vertex)
        active[vertex] = True
        for target in graph[vertex]:
            if indexes[target] == -1:
                visit(target)
                low[vertex] = min(low[vertex], low[target])
            elif active[target]:
                low[vertex] = min(low[vertex], indexes[target])
        if low[vertex] == indexes[vertex]:
            group: list[int] = []
            while True:
                item = stack.pop()
                active[item] = False
                group.append(item)
                if item == vertex:
                    break
            output.append(group)

    for vertex in range(len(graph)):
        if indexes[vertex] == -1:
            visit(vertex)
    return output


def pack(units: list[Unit], groups: list[list[int]]) -> list[list[int]]:
    ordered = sorted((sorted(group) for group in groups), key=lambda group: group[0])
    parts: list[list[int]] = []
    current: list[int] = []
    lines = 0
    for group in ordered:
        group_lines = sum(units[index].lines + 2 for index in group)
        if group_lines > MAX_PART_LINES:
            labels = sorted(set().union(*(units[index].names for index in group)))
            raise RuntimeError(f"component {labels} is {group_lines} lines")
        if current and lines + group_lines > MAX_PART_LINES:
            parts.append(sorted(current))
            current, lines = [], 0
        current.extend(group)
        lines += group_lines
    if current:
        parts.append(sorted(current))
    return parts


def module_name(path: Path) -> str:
    return ".".join(path.with_suffix("").relative_to("backend").parts)


def split(path_text: str) -> int:
    path = Path(path_text)
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source)
    units, imports = build_units(source, tree)
    parts = pack(units, components(graph_for(units)))
    stem = path.stem
    package = module_name(path).rsplit(".", 1)[0]
    ownership = {
        name: part
        for part, indexes in enumerate(parts)
        for index in indexes
        for name in units[index].names
    }
    dependency = "from __future__ import annotations\n\n" + "\n".join(imports)
    dependency += "\n\n__all__ = [name for name in globals() if not name.startswith('__')]\n"
    (path.parent / f"{stem}_dependencies.py").write_text(dependency, encoding="utf-8")

    for part, indexes in enumerate(parts):
        cross: dict[int, set[str]] = {}
        for index in indexes:
            for name in units[index].refs | units[index].globals:
                owner = ownership.get(name)
                if owner is not None and owner != part:
                    cross.setdefault(owner, set()).add(name)
        header = [
            "from __future__ import annotations",
            "",
            "# ruff: noqa: F401,F403,F405,E501",
            f"from {package}.{stem}_dependencies import *",
        ]
        for owner, names in sorted(cross.items()):
            header.append(
                f"from {package}.{stem}_part_{owner + 1:02d} import {', '.join(sorted(names))}"
            )
        if any(units[index].route for index in indexes):
            header += ["", "router = APIRouter()"]
        body = "\n\n".join(units[index].text for index in indexes)
        content = "\n".join(header) + "\n\n" + body + "\n"
        if len(content.splitlines()) > 300:
            raise RuntimeError(f"part {part + 1} exceeds limit")
        (path.parent / f"{stem}_part_{part + 1:02d}.py").write_text(content, encoding="utf-8")

    imports_text = "\n".join(
        f"from {package} import {stem}_part_{part + 1:02d} as _part_{part + 1:02d}"
        for part in range(len(parts))
    )
    part_tuple = ", ".join(f"_part_{part + 1:02d}" for part in range(len(parts)))
    facade = f'''from __future__ import annotations

import sys
import types

from fastapi import APIRouter

{imports_text}

_PARTS = ({part_tuple},)
router = APIRouter()
for _part in _PARTS:
    if hasattr(_part, "router"):
        router.routes.extend(_part.router.routes)
    for _name, _value in vars(_part).items():
        if _name == "router" or _name.startswith("__"):
            continue
        globals().setdefault(_name, _value)


class _FacadeModule(types.ModuleType):
    def __setattr__(self, name: str, value: object) -> None:
        super().__setattr__(name, value)
        if name.startswith("__") or name == "router":
            return
        for part in _PARTS:
            if hasattr(part, name):
                setattr(part, name, value)


sys.modules[__name__].__class__ = _FacadeModule
__all__ = [name for name in globals() if not name.startswith("_")]
'''
    path.write_text(facade, encoding="utf-8")
    return len(parts)


def main() -> None:
    rows = ["status\tparts\tpath\tdetail"]
    for target in TARGETS:
        try:
            rows.append(f"split\t{split(target)}\t{target}\t")
        except Exception as exc:
            rows.append(f"failed\t0\t{target}\t{type(exc).__name__}: {exc}")
    Path("artifacts").mkdir(exist_ok=True)
    Path("artifacts/python-batch-2.tsv").write_text("\n".join(rows) + "\n")


if __name__ == "__main__":
    main()
