from __future__ import annotations

import sys
import types
from dataclasses import dataclass

from fastapi import APIRouter

from app.services import admin_ai_agent_part_01 as _part_01
from app.services import admin_ai_agent_part_02 as _part_02
from app.services import admin_ai_agent_part_03 as _part_03

# The source-splitting refactor dropped the decorator from AiToolDefinition.
# Restore its generated initializer before the registry module is imported.
_part_03.AiToolDefinition = dataclass(_part_03.AiToolDefinition)

from app.services import admin_ai_agent_part_04 as _part_04  # noqa: E402
from app.services import admin_ai_agent_part_05 as _part_05  # noqa: E402
from app.services import admin_ai_agent_part_06 as _part_06  # noqa: E402
from app.services import admin_ai_agent_part_07 as _part_07  # noqa: E402
from app.services import admin_ai_agent_part_08 as _part_08  # noqa: E402
from app.services import admin_ai_agent_part_09 as _part_09  # noqa: E402

_PARTS = (_part_01, _part_02, _part_03, _part_04, _part_05, _part_06, _part_07, _part_08, _part_09,)
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
