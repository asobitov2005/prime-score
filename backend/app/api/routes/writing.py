from __future__ import annotations

import sys
import types

from fastapi import APIRouter

from app.api.routes import writing_part_01 as _part_01
from app.api.routes import writing_part_02 as _part_02
from app.api.routes import writing_part_03 as _part_03
from app.api.routes import writing_part_04 as _part_04
from app.api.routes import writing_part_05 as _part_05
from app.api.routes import writing_part_06 as _part_06

_PARTS = (_part_01, _part_02, _part_03, _part_04, _part_05, _part_06,)
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
