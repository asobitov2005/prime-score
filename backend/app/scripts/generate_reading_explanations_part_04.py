from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.scripts.generate_reading_explanations_dependencies import *
from app.scripts.generate_reading_explanations_part_03 import parse_args, run

if __name__ == "__main__":
    raise SystemExit(asyncio.run(run(parse_args())))
