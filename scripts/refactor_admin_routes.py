from __future__ import annotations

import ast
from pathlib import Path

SOURCE_PATH = Path("backend/app/api/routes/admin.py")
OUTPUT_DIR = SOURCE_PATH.parent

ROUTE_MODULES = {
    "admin_password_reset_routes": [(864, 987)],
    "admin_auth_session_routes": [(991, 1176)],
    "admin_dashboard_routes": [(1180, 1455)],
    "admin_analytics_routes": [(1459, 1634)],
    "admin_test_routes": [(1638, 1916)],
    "admin_content_routes": [(1920, 1979)],
    "admin_media_routes": [(1983, 2196)],
    "admin_directory_review_routes": [(2251, 2443)],
    "admin_user_activity_routes": [(2447, 2551)],
    "admin_user_mutation_routes": [(2560, 2741)],
    "admin_settings_routes": [(2771, 2838)],
    "admin_plan_routes": [(2842, 2950)],
    "admin_gift_code_routes": [(2954, 3099)],
    "admin_payment_routes": [(3103, 3270)],
    "admin_promo_routes": [(3274, 3376)],
    "admin_system_routes": [(3380, 3443), (3452, 3552)],
}

SUPPORT_MODULES = {
    "admin_contracts": [
        (183, 381),
        (2554, 2556),
        (2744, 2767),
        (3446, 3449),
    ],
    "admin_common": [(384, 501)],
    "admin_commerce_support": [(504, 687)],
    "admin_auth_support": [(690, 860)],
    "admin_user_support": [(2199, 2247)],
}

HEADER = """from __future__ import annotations

# Generated from the former monolithic admin router. Keep imports centralized
# while domain modules are gradually tightened to explicit dependencies.
# ruff: noqa: F401,F403,F405
from app.api.routes.admin_dependencies import *
from app.api.routes.admin_contracts import *
from app.api.routes.admin_common import *
from app.api.routes.admin_commerce_support import *
from app.api.routes.admin_auth_support import *
from app.api.routes.admin_user_support import *
"""


def in_ranges(line: int, ranges: list[tuple[int, int]]) -> bool:
    return any(start <= line <= end for start, end in ranges)


def source_for_node(source: str, node: ast.AST) -> str:
    segment = ast.get_source_segment(source, node)
    if segment is None:
        raise RuntimeError(f"Unable to extract node at line {node.lineno}")
    return segment.rstrip()


def write_dependencies(source: str, tree: ast.Module) -> None:
    imports = []
    for node in tree.body:
        if not isinstance(node, (ast.Import, ast.ImportFrom)):
            continue
        if isinstance(node, ast.ImportFrom) and node.module == "__future__":
            continue
        imports.append(source_for_node(source, node))
    content = "from __future__ import annotations\n\n" + "\n".join(imports)
    content += "\n\n__all__ = [name for name in globals() if not name.startswith('__')]\n"
    (OUTPUT_DIR / "admin_dependencies.py").write_text(content, encoding="utf-8")


def module_nodes(
    source: str,
    tree: ast.Module,
    ranges: list[tuple[int, int]],
) -> list[str]:
    return [
        source_for_node(source, node)
        for node in tree.body
        if not isinstance(node, (ast.Import, ast.ImportFrom))
        and in_ranges(node.lineno, ranges)
    ]


def write_support_modules(source: str, tree: ast.Module) -> None:
    for module_name, ranges in SUPPORT_MODULES.items():
        nodes = module_nodes(source, tree, ranges)
        content = HEADER + "\n\n".join(nodes)
        content += "\n\n__all__ = [name for name in globals() if not name.startswith('__')]\n"
        write_checked(module_name, content)


def write_route_modules(source: str, tree: ast.Module) -> None:
    for module_name, ranges in ROUTE_MODULES.items():
        nodes = module_nodes(source, tree, ranges)
        content = HEADER + "\nrouter = APIRouter()\n\n" + "\n\n".join(nodes) + "\n"
        write_checked(module_name, content)


def write_checked(module_name: str, content: str) -> None:
    line_count = len(content.splitlines())
    if line_count > 300:
        raise RuntimeError(f"{module_name}.py has {line_count} lines")
    (OUTPUT_DIR / f"{module_name}.py").write_text(content, encoding="utf-8")


def validate_coverage(tree: ast.Module) -> None:
    configured = [*SUPPORT_MODULES.values(), *ROUTE_MODULES.values()]
    unassigned: list[str] = []
    duplicates: list[str] = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            continue
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "router"
            for target in node.targets
        ):
            continue
        matches = sum(in_ranges(node.lineno, ranges) for ranges in configured)
        label = f"{type(node).__name__}:{getattr(node, 'name', '')}@{node.lineno}"
        if matches == 0:
            unassigned.append(label)
        elif matches > 1:
            duplicates.append(label)
    if unassigned or duplicates:
        raise RuntimeError(
            f"Invalid node coverage. Unassigned={unassigned}; duplicates={duplicates}"
        )


def write_facade() -> None:
    module_names = [*SUPPORT_MODULES, *ROUTE_MODULES]
    imports = "\n".join(
        f"from app.api.routes import {name} as _{name}" for name in module_names
    )
    route_tuple = ",\n    ".join(f"_{name}" for name in ROUTE_MODULES)
    compat_tuple = ",\n    ".join(f"_{name}" for name in module_names)
    content = f'''from __future__ import annotations

import sys
import types

from fastapi import APIRouter

{imports}

_ROUTE_MODULES = (
    {route_tuple},
)
_COMPAT_MODULES = (
    {compat_tuple},
)

router = APIRouter()
for _module in _ROUTE_MODULES:
    router.routes.extend(_module.router.routes)

for _module in _COMPAT_MODULES:
    for _name, _value in vars(_module).items():
        if _name == "router" or _name.startswith("__"):
            continue
        globals().setdefault(_name, _value)


class _AdminFacadeModule(types.ModuleType):
    def __setattr__(self, name: str, value: object) -> None:
        super().__setattr__(name, value)
        if name.startswith("__") or name == "router":
            return
        for module in _COMPAT_MODULES:
            if hasattr(module, name):
                setattr(module, name, value)


sys.modules[__name__].__class__ = _AdminFacadeModule
__all__ = ["router"]
'''
    write_checked("admin", content)


def main() -> None:
    source = SOURCE_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    validate_coverage(tree)
    write_dependencies(source, tree)
    write_support_modules(source, tree)
    write_route_modules(source, tree)
    write_facade()


if __name__ == "__main__":
    main()
