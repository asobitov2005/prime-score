import asyncio

from aiogram import Bot, Dispatcher

from app.core.config import get_settings


async def run_bot() -> None:
    settings = get_settings()
    if settings.telegram_bot_token == "change-me":
        return

    bot = Bot(token=settings.telegram_bot_token)
    dispatcher = Dispatcher()
    await dispatcher.start_polling(bot)


def main() -> None:
    asyncio.run(run_bot())


if __name__ == "__main__":
    main()
