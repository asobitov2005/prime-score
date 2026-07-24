from __future__ import annotations

import ast
from pathlib import Path


def python_modules(app_dir: Path) -> dict[str, Path]:
    modules: dict[str, Path] = {}
    for path in app_dir.rglob("*.py"):
        relative = path.relative_to(app_dir)
        parts = list(relative.with_suffix("").parts)
        if parts[-1] == "__init__":
            parts.pop()
        modules[".".join(["app", *parts])] = path
    return modules


def top_level_import_graph(modules: dict[str, Path]) -> dict[str, set[str]]:
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


def strongly_connected_components(graph: dict[str, set[str]]) -> list[set[str]]:
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


def main() -> int:
    app_dir = Path(__file__).resolve().parents[1] / "app"
    modules = python_modules(app_dir)
    graph = top_level_import_graph(modules)
    cycles = [
        component
        for component in strongly_connected_components(graph)
        if (
            len(component) > 1
            or any(module in graph[module] for module in component)
        )
        and any("_part_" in module.rsplit(".", 1)[-1] for module in component)
    ]

    if not cycles:
        print("No top-level split-module import cycles found.")
        return 0

    print("Top-level split-module import cycles:")
    for component in sorted(cycles, key=lambda item: sorted(item)):
        print(" - " + " -> ".join(sorted(component)))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
