from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path

MAX_PART_LINES = 270
TARGETS = [
    "backend/app/services/writing_checker.py",
    "backend/app/services/admin_ai_agent.py",
    "backend/app/api/routes/me.py",
    "backend/app/services/test_content_repo.py",
    "backend/app/services/xp.py",
    "backend/app/api/routes/writing.py",
    "backend/app/api/routes/leaderboard.py",
    "backend/app/services/gemini_audio_transcription.py",
    "backend/app/services/ai_config.py",
    "backend/app/api/routes/attempts.py",
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
        self.generic_visit(node)


def source_segment(source: str, node: ast.AST) -> str:
    value = ast.get_source_segment(source, node)
    if value is None:
        raise RuntimeError(f"Cannot extract node at line {node.lineno}")
    return value.rstrip()


def target_names(target: ast.AST) -> set[str]:
    if isinstance(target, ast.Name):
        return {target.id}
    if isinstance(target, (ast.Tuple, ast.List)):
        return set().union(*(target_names(item) for item in target.elts))
    return set()


def defined_names(node: ast.AST) -> set[str]:
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        return {node.name}
    if isinstance(node, ast.Assign):
        return set().union(*(target_names(item) for item in node.targets))
    if isinstance(node, ast.AnnAssign):
        return target_names(node.target)
    return set()


def is_router_assignment(node: ast.AST) -> bool:
    return isinstance(node, ast.Assign) and any(
        isinstance(target, ast.Name) and target.id == "router"
        for target in node.targets
    )


def is_type_checking_block(node: ast.AST) -> bool:
    return isinstance(node, ast.If) and isinstance(node.test, ast.Name) and node.test.id == "TYPE_CHECKING"


def has_router_decorator(node: ast.AST) -> bool:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return False
    for decorator in node.decorator_list:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        if isinstance(target, ast.Attribute) and isinstance(target.value, ast.Name):
            if target.value.id == "router":
                return True
    return False


def build_units(source: str, tree: ast.Module) -> tuple[list[Unit], list[str]]:
    units: list[Unit] = []
    dependency_nodes: list[str] = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            if isinstance(node, ast.ImportFrom) and node.module == "__future__":
                continue
            dependency_nodes.append(source_segment(source, node))
            continue
        if is_type_checking_block(node):
            dependency_nodes.append(source_segment(source, node))
            continue
        if is_router_assignment(node):
            continue
        collector = RefCollector()
        collector.visit(node)
        text = source_segment(source, node)
        units.append(
            Unit(
                node=node,
                text=text,
                names=defined_names(node),
                refs=collector.refs,
                globals=collector.globals,
                lines=len(text.splitlines()),
                route=has_router_decorator(node),
            )
        )
    return units, dependency_nodes


def strongly_connected(graph: list[set[int]]) -> list[list[int]]:
    index = 0
    stack: list[int] = []
    indices = [-1] * len(graph)
    low = [0] * len(graph)
    on_stack = [False] * len(graph)
    result: list[list[int]] = []

    def visit(vertex: int) -> None:
        nonlocal index
        indices[vertex] = low[vertex] = index
        index += 1
        stack.append(vertex)
        on_stack[vertex] = True
        for target in graph[vertex]:
            if indices[target] == -1:
                visit(target)
                low[vertex] = min(low[vertex], low[target])
            elif on_stack[target]:
                low[vertex] = min(low[vertex], indices[target])
        if low[vertex] == indices[vertex]:
            component: list[int] = []
            while True:
                item = stack.pop()
                on_stack[item] = False
                component.append(item)
                if item == vertex:
                    break
            result.append(component)

    for vertex in range(len(graph)):
        if indices[vertex] == -1:
            visit(vertex)
    return result


def dependency_graph(units: list[Unit]) -> list[set[int]]:
    definitions: dict[str, list[int]] = {}
    for index, unit in enumerate(units):
        for name in unit.names:
            definitions.setdefault(name, []).append(index)
    graph = [set() for _ in units]
    for index, unit in enumerate(units):
        for name in unit.refs | unit.globals:
            for target in definitions.get(name, []):
                if target != index:
                    graph[index].add(target)
        for name in unit.globals:
            related = [
                other
                for other, candidate in enumerate(units)
                if name in candidate.names or name in candidate.refs or name in candidate.globals
            ]
            for other in related:
                if other != index:
                    graph[index].add(other)
                    graph[other].add(index)
    return graph


def pack_parts(units: list[Unit], components: list[list[int]]) -> list[list[int]]:
    ordered = sorted((sorted(group) for group in components), key=lambda group: group[0])
    parts: list[list[int]] = []
    current: list[int] = []
    current_lines = 0
    for group in ordered:
        group_lines = sum(units[index].lines + 2 for index in group)
        if group_lines > MAX_PART_LINES:
            names = sorted(set().union(*(units[index].names for index in group)))
            raise RuntimeError(f"Dependency component exceeds limit: {names} ({group_lines} lines)")
        if current and current_lines + group_lines > MAX_PART_LINES:
            parts.append(sorted(current))
            current = []
            current_lines = 0
        current.extend(group)
        current_lines += group_lines
    if current:
        parts.append(sorted(current))
    return parts


def module_path(path: Path) -> str:
    relative = path.with_suffix("").relative_to("backend")
    return ".".join(relative.parts)


def split_module(path_text: str) -> tuple[str, int]:
    path = Path(path_text)
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source)
    units, dependency_nodes = build_units(source, tree)
    graph = dependency_graph(units)
    parts = pack_parts(units, strongly_connected(graph))
    stem = path.stem
    package = module_path(path).rsplit(".", 1)[0]
    definitions = {
        name: part_index
        for part_index, indexes in enumerate(parts)
        for index in indexes
        for name in units[index].names
    }

    dependency_text = "from __future__ import annotations\n\n" + "\n".join(dependency_nodes)
    dependency_text += "\n\n__all__ = [name for name in globals() if not name.startswith('__')]\n"
    (path.parent / f"{stem}_dependencies.py").write_text(dependency_text, encoding="utf-8")

    for part_index, indexes in enumerate(parts):
        imports: dict[int, set[str]] = {}
        for index in indexes:
            for name in units[index].refs | units[index].globals:
                owner = definitions.get(name)
                if owner is not None and owner != part_index:
                    imports.setdefault(owner, set()).add(name)
        header = [
            "from __future__ import annotations",
            "",
            "# ruff: noqa: F401,F403,F405,E501",
            f"from {package}.{stem}_dependencies import *",
        ]
        for owner, names in sorted(imports.items()):
            imported = ", ".join(sorted(names))
            header.append(f"from {package}.{stem}_part_{owner + 1:02d} import {imported}")
        if any(units[index].route for index in indexes):
            header.extend(["", "router = APIRouter()"])
        body = "\n\n".join(units[index].text for index in indexes)
        content = "\n".join(header) + "\n\n" + body + "\n"
        if len(content.splitlines()) > 300:
            raise RuntimeError(f"Generated part exceeds 300 lines: {path} part {part_index + 1}")
        (path.parent / f"{stem}_part_{part_index + 1:02d}.py").write_text(content, encoding="utf-8")

    imports = "\n".join(
        f"from {package} import {stem}_part_{index + 1:02d} as _part_{index + 1:02d}"
        for index in range(len(parts))
    )
    tuple_items = ", ".join(f"_part_{index + 1:02d}" for index in range(len(parts)))
    facade = f'''from __future__ import annotations

import sys
import types

from fastapi import APIRouter

{imports}

_PARTS = ({tuple_items},)
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
    return path_text, len(parts)


def main() -> None:
    report = ["status\tparts\tpath\tdetail"]
    for target in TARGETS:
        try:
            path, count = split_module(target)
            report.append(f"split\t{count}\t{path}\t")
        except Exception as exc:
            report.append(f"failed\t0\t{target}\t{type(exc).__name__}: {exc}")
    Path("artifacts/python-split-report.tsv").write_text("\n".join(report) + "\n")


if __name__ == "__main__":
    main()
