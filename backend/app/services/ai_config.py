from __future__ import annotations

import sys
import types
from dataclasses import dataclass

from fastapi import APIRouter

from app.services import ai_config_part_01 as _part_01

_part_01.ResolvedAiUseCaseConfig = dataclass(slots=True)(_part_01.ResolvedAiUseCaseConfig)

from app.services import ai_config_part_02 as _part_02  # noqa: E402
from app.services import ai_config_part_03 as _part_03  # noqa: E402

_part_02.Groq = _part_01.Groq

_PARTS = (_part_01, _part_02, _part_03,)
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
            if name == "Groq" or hasattr(part, name):
                setattr(part, name, value)


sys.modules[__name__].__class__ = _FacadeModule
__all__ = [name for name in globals() if not name.startswith("_")]
