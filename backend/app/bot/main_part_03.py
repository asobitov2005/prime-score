from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.bot.main_dependencies import *
from app.bot.main_part_02 import run_bot

def main() -> None:
    asyncio.run(run_bot())

if __name__ == "__main__":
    main()
