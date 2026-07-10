from __future__ import annotations

import argparse
import ast
import json
from pathlib import Path


class NameCollector(ast.NodeVisitor):
    def __init__(self) -> None:
        self.loaded: set[str] = set()
        self.stored: set[str] = set()

    def visit_Name(self, node: ast.Name) -> None:
        if isinstance(node.ctx, ast.Load):
            self.loaded.add(node.id)
        else:
            self.stored.add(node.id)
        self.generic_visit(node)


def decorator_path(node: ast.AST) -> str | None:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return None
    for decorator in node.decorator_list:
        call = decorator if isinstance(decorator, ast.Call) else None
        target = call.func if call else decorator
        if not isinstance(target, ast.Attribute):
            continue
        if not isinstance(target.value, ast.Name) or target.value.id != "router":
            continue
        if not call or not call.args:
            return "<dynamic>"
        first = call.args[0]
        if isinstance(first, ast.Constant) and isinstance(first.value, str):
            return first.value
        return "<dynamic>"
    return None


def node_record(node: ast.AST) -> dict[str, object]:
    collector = NameCollector()
    collector.visit(node)
    name = getattr(node, "name", None)
    if isinstance(node, (ast.Assign, ast.AnnAssign)):
        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
        names: list[str] = []
        for target in targets:
            if isinstance(target, ast.Name):
                names.append(target.id)
        name = ",".join(names) or "<assignment>"
    return {
        "kind": type(node).__name__,
        "name": name or "<anonymous>",
        "start": getattr(node, "lineno", None),
        "end": getattr(node, "end_lineno", None),
        "lines": (
            getattr(node, "end_lineno", 0) - getattr(node, "lineno", 0) + 1
            if getattr(node, "lineno", None) and getattr(node, "end_lineno", None)
            else None
        ),
        "route_path": decorator_path(node),
        "loads": sorted(collector.loaded),
        "stores": sorted(collector.stored),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    source = args.source.read_text(encoding="utf-8")
    tree = ast.parse(source)
    records = [node_record(node) for node in tree.body]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(
            {
                "source": str(args.source),
                "line_count": len(source.splitlines()),
                "nodes": records,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
