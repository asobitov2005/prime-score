from __future__ import annotations

import sys
import types

from fastapi import APIRouter

from app.api.routes import leaderboard_part_01 as _part_01
from app.api.routes import leaderboard_part_02 as _part_02
from app.api.routes import leaderboard_part_03 as _part_03

_PARTS = (_part_01, _part_02, _part_03,)
router = APIRouter()
for _part in _PARTS:
    if hasattr(_part, "router"):
        router.routes.extend(_part.router.routes)
    for _name, _value in vars(_part).items():
        if _name == "router" or _name.startswith("__"):
            continue
        globals().setdefault(_name, _value)


class _LeaderboardFacade(types.ModuleType):
    def __setattr__(self, name: str, value: object) -> None:
        super().__setattr__(name, value)
        if name.startswith("__") or name == "router":
            return
        for part in _PARTS:
            if hasattr(part, name):
                setattr(part, name, value)


sys.modules[__name__].__class__ = _LeaderboardFacade
__all__ = [name for name in globals() if not name.startswith("_")]
