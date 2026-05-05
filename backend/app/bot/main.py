from __future__ import annotations

import asyncio
import logging
import os
import socket

from aiogram import Bot, Dispatcher, F, types
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.filters import Command
from aiohttp.abc import AbstractResolver, ResolveResult
from aiogram.types import KeyboardButton, ReplyKeyboardMarkup
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import get_session_maker
from app.models import ops as _ops_models
from app.models.user import User
from app.services.code_store import get_code_store
from app.services.user_names import normalize_user_name_parts

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

_CODE_TTL = 180
_TICK = 30


class _TelegramIPv4Resolver(AbstractResolver):
    def __init__(self) -> None:
        configured = os.getenv("TELEGRAM_API_IPV4", "149.154.167.99")
        self._ips = [ip.strip() for ip in configured.split(",") if ip.strip()]

    async def resolve(
        self, host: str, port: int = 0, family: socket.AddressFamily = socket.AF_INET
    ) -> list[ResolveResult]:
        if host != "api.telegram.org":
            infos = await asyncio.get_running_loop().getaddrinfo(
                host,
                port,
                type=socket.SOCK_STREAM,
                family=family,
                flags=socket.AI_ADDRCONFIG,
            )
            return [
                {
                    "hostname": host,
                    "host": address[0],
                    "port": address[1],
                    "family": info_family,
                    "proto": proto,
                    "flags": socket.AI_NUMERICHOST,
                }
                for info_family, _, proto, _, address in infos
            ]

        return [
            {
                "hostname": host,
                "host": ip,
                "port": port,
                "family": socket.AF_INET,
                "proto": socket.IPPROTO_TCP,
                "flags": socket.AI_NUMERICHOST,
            }
            for ip in self._ips
        ]

    async def close(self) -> None:
        return None


def _bot_session() -> AiohttpSession:
    session = AiohttpSession()
    session._connector_init["family"] = socket.AF_INET
    session._connector_init["resolver"] = _TelegramIPv4Resolver()
    return session


def _phone_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Share phone number", request_contact=True)]],
        resize_keyboard=True,
        persistent=True,
    )


def _login_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🔑 Login")]],
        resize_keyboard=True,
        persistent=True,
    )


async def _get_saved_contact(telegram_id: int) -> dict | None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        result = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = result.scalars().first()

    if user is None:
        return None

    first_name, last_name = normalize_user_name_parts(user.first_name, user.last_name)
    return {
        "telegram_id": user.telegram_id,
        "phone": user.phone,
        "first_name": first_name,
        "last_name": last_name,
    }


async def run_bot() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token or settings.telegram_bot_token == "change-me":
        logger.error("TELEGRAM_BOT_TOKEN is not configured — bot will not start.")
        return

    bot = Bot(token=settings.telegram_bot_token, session=_bot_session())
    dp = Dispatcher()
    store = get_code_store()

    @dp.message(Command("start"))
    async def cmd_start(message: types.Message) -> None:
        contact = await store.get_contact(message.from_user.id)
        if contact is None:
            contact = await _get_saved_contact(message.from_user.id)
            if contact is not None:
                await store.save_contact(
                    telegram_id=contact["telegram_id"],
                    phone=contact["phone"],
                    first_name=contact["first_name"],
                    last_name=contact.get("last_name"),
                )

        if contact is not None:
            await message.answer(
                "👋 <b>Welcome back to PrimeScore!</b>\n\n"
                "Tap the button below to get your login code.",
                parse_mode="HTML",
                reply_markup=_login_keyboard(),
            )
            return

        await message.answer(
            "👋 <b>Welcome to PrimeScore!</b>\n\n"
            "Share your phone number to sign in.",
            parse_mode="HTML",
            reply_markup=_phone_keyboard(),
        )

    @dp.message(F.contact)
    async def handle_contact(message: types.Message) -> None:
        if message.contact.user_id != message.from_user.id:
            await message.answer(
                "❌ Please share only your own number.",
                reply_markup=_phone_keyboard(),
            )
            return

        phone = message.contact.phone_number
        if not phone.startswith("+"):
            phone = "+" + phone

        first_name, last_name = normalize_user_name_parts(
            message.from_user.first_name or message.from_user.username or "User",
            message.from_user.last_name,
        )
        await store.save_contact(
            telegram_id=message.from_user.id,
            phone=phone,
            first_name=first_name,
            last_name=last_name,
        )
        await message.answer(
            "✅ <b>Phone number received.</b>\n\n"
            "Tap the button below to get your login code.",
            parse_mode="HTML",
            reply_markup=_login_keyboard(),
        )

    @dp.message(F.text == "🔑 Login")
    async def handle_login(message: types.Message) -> None:
        contact = await store.get_contact(message.from_user.id)
        if not contact:
            contact = await _get_saved_contact(message.from_user.id)
            if contact is not None:
                await store.save_contact(
                    telegram_id=contact["telegram_id"],
                    phone=contact["phone"],
                    first_name=contact["first_name"],
                    last_name=contact.get("last_name"),
                )

        if not contact:
            await message.answer(
                "⚠️ Please share your phone number first.",
                reply_markup=_phone_keyboard(),
            )
            return

        code = await store.create_code(
            telegram_id=contact["telegram_id"],
            phone=contact["phone"],
            first_name=contact["first_name"],
            last_name=contact.get("last_name"),
        )

        sent = await message.answer(
            f"✅ <b>Verification code:</b>\n\n"
            f"<code>{code}</code>\n\n"
            f"Code is valid for <b>3 minutes</b>.",
            parse_mode="HTML",
        )

        asyncio.create_task(_countdown(store, code, sent))

    @dp.message()
    async def fallback(message: types.Message) -> None:
        contact = await store.get_contact(message.from_user.id)
        if not contact:
            contact = await _get_saved_contact(message.from_user.id)
            if contact is not None:
                await store.save_contact(
                    telegram_id=contact["telegram_id"],
                    phone=contact["phone"],
                    first_name=contact["first_name"],
                    last_name=contact.get("last_name"),
                )

        if contact:
            await message.answer(
                "🔑 Tap the button to get your login code:",
                reply_markup=_login_keyboard(),
            )
        else:
            await message.answer(
                "📱 Please share your phone number:",
                reply_markup=_phone_keyboard(),
            )

    logger.info("Bot starting (long-polling)...")
    await dp.start_polling(bot)


async def _countdown(store, code: str, sent: types.Message) -> None:
    try:
        for elapsed in range(_TICK, _CODE_TTL + 1, _TICK):
            await asyncio.sleep(_TICK)

            data = await store.get_code(code)
            if data is None:
                break

            if data.get("used"):
                try:
                    await sent.edit_text(
                        "🎉 <b>Successfully logged in!</b>",
                        parse_mode="HTML",
                    )
                except Exception:
                    pass
                await store.delete_code(code)
                return

            remaining = _CODE_TTL - elapsed
            if remaining <= 0:
                break

            if remaining >= 60:
                m, s = divmod(remaining, 60)
                label = f"{m}:{s:02d} minutes"
            else:
                label = f"{remaining} seconds"

            try:
                await sent.edit_text(
                    f"✅ <b>Verification code:</b>\n\n"
                    f"<code>{code}</code>\n\n"
                    f"Code expires in <b>{label}</b>.",
                    parse_mode="HTML",
                )
            except Exception as exc:
                logger.debug("Countdown edit skipped: %s", exc)

        try:
            await sent.edit_text(
                "❌ <b>Code expired.</b>\n\n"
                "Tap <b>🔑 Login</b> to get a new code.",
                parse_mode="HTML",
            )
        except Exception:
            pass

    except Exception:
        logger.exception("Countdown task failed for code %s", code)


def main() -> None:
    asyncio.run(run_bot())


if __name__ == "__main__":
    main()
