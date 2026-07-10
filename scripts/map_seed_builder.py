from __future__ import annotations

import ast
from pathlib import Path

SOURCE = Path("backend/app/services/admin_example_reading_seed.py")
OUTPUT = Path("artifacts/admin-example-reading-statements.tsv")


def assigned_names(node: ast.AST) -> list[str]:
    targets = node.targets if isinstance(node, ast.Assign) else []
    return [target.id for target in targets if isinstance(target, ast.Name)]


def main() -> None:
    source = SOURCE.read_text()
    tree = ast.parse(source)
    function = next(
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef)
        and node.name == "build_admin_example_reading_draft"
    )
    rows = ["index\tkind\tstart\tend\tlines\tassigned"]
    for index, statement in enumerate(function.body, start=1):
        rows.append(
            "\t".join(
                [
                    str(index),
                    type(statement).__name__,
                    str(statement.lineno),
                    str(statement.end_lineno),
                    str(statement.end_lineno - statement.lineno + 1),
                    ",".join(assigned_names(statement)),
                ]
            )
        )
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text("\n".join(rows) + "\n")


if __name__ == "__main__":
    main()
