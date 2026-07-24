from __future__ import annotations

import ast
import os
import subprocess
import sys
from pathlib import Path


def _python_modules(app_dir: Path) -> dict[str, Path]:
    modules: dict[str, Path] = {}
    for path in app_dir.rglob("*.py"):
        relative = path.relative_to(app_dir)
        parts = list(relative.with_suffix("").parts)
        if parts[-1] == "__init__":
            parts.pop()
        module_name = ".".join(["app", *parts])
        modules[module_name] = path
    return modules


def _top_level_import_graph(modules: dict[str, Path]) -> dict[str, set[str]]:
    graph = {module: set() for module in modules}
    known_modules = set(modules)

    for current_module, path in modules.items():
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in tree.body:
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in known_modules:
                        graph[current_module].add(alias.name)
                continue

            if not isinstance(node, ast.ImportFrom) or node.level != 0 or not node.module:
                continue

            base_module = node.module
            for alias in node.names:
                candidate = f"{base_module}.{alias.name}"
                if candidate in known_modules:
                    graph[current_module].add(candidate)
                elif base_module in known_modules:
                    graph[current_module].add(base_module)

    return graph


def _strongly_connected_components(graph: dict[str, set[str]]) -> list[set[str]]:
    index = 0
    indices: dict[str, int] = {}
    lowlinks: dict[str, int] = {}
    stack: list[str] = []
    on_stack: set[str] = set()
    components: list[set[str]] = []

    def visit(node: str) -> None:
        nonlocal index
        indices[node] = index
        lowlinks[node] = index
        index += 1
        stack.append(node)
        on_stack.add(node)

        for dependency in graph[node]:
            if dependency not in indices:
                visit(dependency)
                lowlinks[node] = min(lowlinks[node], lowlinks[dependency])
            elif dependency in on_stack:
                lowlinks[node] = min(lowlinks[node], indices[dependency])

        if lowlinks[node] != indices[node]:
            return

        component: set[str] = set()
        while True:
            member = stack.pop()
            on_stack.remove(member)
            component.add(member)
            if member == node:
                break
        components.append(component)

    for module in graph:
        if module not in indices:
            visit(module)

    return components


def test_no_top_level_split_module_import_cycles() -> None:
    app_dir = Path(__file__).resolve().parents[1] / "app"
    modules = _python_modules(app_dir)
    graph = _top_level_import_graph(modules)
    cycles = [
        component
        for component in _strongly_connected_components(graph)
        if (
            len(component) > 1
            or any(module in graph[module] for module in component)
        )
        and any("_part_" in module.rsplit(".", 1)[-1] for module in component)
    ]

    formatted_cycles = [" -> ".join(sorted(component)) for component in cycles]
    assert not formatted_cycles, "Top-level split-module import cycles:\n" + "\n".join(formatted_cycles)


def test_application_imports_without_circular_dependencies() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [sys.executable, "-c", "from app.main import app; assert app is not None"],
        cwd=backend_dir,
        env=os.environ.copy(),
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
