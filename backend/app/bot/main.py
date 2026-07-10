from __future__ import annotations

import asyncio
import logging
import os
import re
import socket
from datetime import UTC, datetime, timedelta
from io import BytesIO

from aiogram import Bot, Dispatcher, F, types
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command
from aiohttp.abc import AbstractResolver, ResolveResult
from aiogram.types import (
    CopyTextButton,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    MenuButtonWebApp,
    ReplyKeyboardMarkup,
    WebAppInfo,
)
from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import get_session_maker
from app.models.user import User
from app.services.user_cleanup import purge_user_data
from app.services.object_storage import upload_user_avatar_image
from app.services.code_store import get_code_store
from app.services.telegram_users import record_contact_event, record_start_event
from app.services.user_names import normalize_user_name_parts

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

_CODE_TTL = 180
_TICK = 30
_CONTACT_REFRESH_INTERVAL = timedelta(days=30)


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


def _phone_keyboard(webapp_url: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🚀 Open PrimeScore", web_app=WebAppInfo(url=webapp_url))],
            [KeyboardButton(text="📱 Share phone number", request_contact=True)],
        ],
        resize_keyboard=True,
        persistent=True,
    )


def _login_keyboard(webapp_url: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🚀 Open PrimeScore", web_app=WebAppInfo(url=webapp_url))],
            [KeyboardButton(text="🔑 Login")],
        ],
        resize_keyboard=True,
        persistent=True,
    )


def _normalize_phone_number(value: str) -> str:
    normalized = re.sub(r"[\s().-]+", "", value.strip())
    if normalized.isdigit() and len(normalized) == 9:
        normalized = f"+998{normalized}"
    if normalized.startswith("00"):
        normalized = "+" + normalized[2:]
    if normalized and not normalized.startswith("+"):
        normalized = "+" + normalized
    return normalized


def _code_copy_keyboard(code: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Copy", copy_text=CopyTextButton(text=code))],
        ],
    )


def _is_contact_refresh_due(last_verified_at: datetime | None, *, now: datetime | None = None) -> bool:
    if last_verified_at is None:
        return True

    current_time = now or datetime.now(UTC)
    return current_time - last_verified_at >= _CONTACT_REFRESH_INTERVAL


def _merge_current_telegram_profile(contact: dict, telegram_user: types.User | None) -> dict:
    if telegram_user is None:
        return contact

    first_name, last_name = normalize_user_name_parts(
        telegram_user.first_name or telegram_user.username or contact.get("first_name") or "User",
        telegram_user.last_name,
    )
    return {
        **contact,
        "telegram_id": telegram_user.id,
        "username": telegram_user.username or contact.get("username"),
        "first_name": first_name,
        "last_name": last_name,
        "avatar_url": contact.get("avatar_url"),
    }


def _apply_bot_contact_to_user(
    user: User | None,
    *,
    telegram_id: int,
    phone: str,
    username: str | None,
    first_name: str,
    last_name: str | None,
    avatar_url: str | None,
    now: datetime,
) -> User:
    first_name, last_name = normalize_user_name_parts(first_name, last_name)
    phone = _normalize_phone_number(phone)
    if user is None:
        return User(
            telegram_id=telegram_id,
            phone=phone,
            username=username,
            first_name=first_name,
            last_name=last_name,
            avatar_url=avatar_url,
            telegram_contact_updated_at=now,
            bot_contact_at=now,
            is_premium=False,
        )

    user.telegram_id = telegram_id
    user.phone = phone
    if not user.name_is_custom:
        user.first_name = first_name
        user.last_name = last_name
    if not user.username_is_custom:
        user.username = username
    if not user.avatar_is_custom:
        user.avatar_url = avatar_url
    user.telegram_contact_updated_at = now
    user.bot_contact_at = now
    return user


async def _save_bot_contact_user(contact: dict) -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        telegram_id = int(contact["telegram_id"])
        phone = _normalize_phone_number(str(contact["phone"]))
        user = await session.scalar(select(User).where(User.telegram_id == telegram_id))
        if user is None:
            user = await session.scalar(select(User).where(User.phone == phone))
        if user is not None and user.deleted_at is not None:
            await purge_user_data(session, user=user)
            user = None

        linked_user = _apply_bot_contact_to_user(
            user,
            telegram_id=telegram_id,
            phone=phone,
            username=contact.get("username"),
            first_name=contact["first_name"],
            last_name=contact.get("last_name"),
            avatar_url=contact.get("avatar_url"),
            now=datetime.now(UTC),
        )
        session.add(linked_user)
        await session.flush()
        telegram_user = await record_contact_event(
            session,
            telegram_id=telegram_id,
            phone=phone,
            username=contact.get("username"),
            first_name=contact["first_name"],
            last_name=contact.get("last_name"),
            avatar_url=contact.get("avatar_url"),
            language_code=contact.get("language_code"),
            is_bot=bool(contact.get("is_bot", False)),
        )
        telegram_user.linked_user_id = linked_user.id
        await session.commit()


async def _save_started_telegram_user(telegram_user: types.User) -> None:
    first_name, last_name = normalize_user_name_parts(
        telegram_user.first_name or telegram_user.username or "User",
        telegram_user.last_name,
    )
    session_maker = get_session_maker()
    async with session_maker() as session:
        await record_start_event(
            session,
            telegram_id=telegram_user.id,
            first_name=first_name,
            last_name=last_name,
            username=telegram_user.username,
            language_code=telegram_user.language_code,
            is_bot=telegram_user.is_bot,
        )
        await session.commit()


async def _fetch_telegram_avatar_url(bot: Bot, telegram_id: int) -> str | None:
    try:
        photos = await bot.get_user_profile_photos(telegram_id, limit=1)
        if not photos.photos:
            return None

        photo = photos.photos[0][-1]
        file = await bot.get_file(photo.file_id)
        if not file.file_path:
            return None

        buffer = BytesIO()
        await bot.download_file(file.file_path, destination=buffer)
        payload = buffer.getvalue()
        if not payload:
            return None

        return upload_user_avatar_image(
            content=payload,
            filename=f"telegram-{telegram_id}.jpg",
            content_type="image/jpeg",
        )
    except (TelegramAPIError, RuntimeError):
        logger.exception("Failed to fetch Telegram avatar for %s", telegram_id)
        return None


async def _get_saved_contact(telegram_id: int) -> dict | None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        result = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = result.scalars().first()

    if user is None or user.deleted_at is not None or _is_contact_refresh_due(user.telegram_contact_updated_at):
        return None

    first_name, last_name = normalize_user_name_parts(user.first_name, user.last_name)
    return {
        "telegram_id": user.telegram_id,
        "phone": user.phone,
        "username": user.username,
        "first_name": first_name,
        "last_name": last_name,
        "avatar_url": user.avatar_url,
    }


async def run_bot() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token or settings.telegram_bot_token == "change-me":
        logger.error("TELEGRAM_BOT_TOKEN is not configured — bot will not start.")
        return

    bot = Bot(token=settings.telegram_bot_token, session=_bot_session())
    dp = Dispatcher()
    store = get_code_store()
    webapp_url = settings.telegram_webapp_url

    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Open PrimeScore",
                web_app=WebAppInfo(url=webapp_url),
            )
        )
    except TelegramAPIError:
        logger.exception("Failed to set Telegram WebApp menu button.")

    @dp.message(Command("start"))
    async def cmd_start(message: types.Message) -> None:
        try:
            await _save_started_telegram_user(message.from_user)
        except Exception:
            logger.exception("Failed to save started telegram user %s", message.from_user.id)

        contact = await store.get_contact(message.from_user.id)
        if contact is None:
            contact = await _get_saved_contact(message.from_user.id)
        if contact is not None:
            contact = _merge_current_telegram_profile(contact, message.from_user)
            await store.save_contact(
                telegram_id=contact["telegram_id"],
                phone=contact["phone"],
                username=contact.get("username"),
                first_name=contact["first_name"],
                last_name=contact.get("last_name"),
                avatar_url=contact.get("avatar_url"),
            )

        if contact is not None:
            await message.answer(
                "👋 <b>Welcome back to PrimeScore!</b>\n\n"
                "Open the app directly or tap Login to get your code.",
                parse_mode="HTML",
                reply_markup=_login_keyboard(webapp_url),
            )
            return

        await message.answer(
            "👋 <b>Welcome to PrimeScore!</b>\n\n"
            "Open the app directly, or share your phone number for code login.",
            parse_mode="HTML",
            reply_markup=_phone_keyboard(webapp_url),
        )

    @dp.message(F.contact)
    async def handle_contact(message: types.Message) -> None:
        if message.contact.user_id != message.from_user.id:
            await message.answer(
                "❌ Please share only your own number.",
                reply_markup=_phone_keyboard(webapp_url),
            )
            return

        phone = _normalize_phone_number(message.contact.phone_number)

        first_name, last_name = normalize_user_name_parts(
            message.from_user.first_name or message.from_user.username or "User",
            message.from_user.last_name,
        )
        await store.save_contact(
            telegram_id=message.from_user.id,
            phone=phone,
            username=message.from_user.username,
            first_name=first_name,
            last_name=last_name,
            avatar_url=None,
        )
        try:
            await _save_bot_contact_user(
                {
                    "telegram_id": message.from_user.id,
                    "phone": phone,
                    "username": message.from_user.username,
                    "first_name": first_name,
                    "last_name": last_name,
                    "avatar_url": None,
                    "language_code": message.from_user.language_code,
                    "is_bot": message.from_user.is_bot,
                }
            )
        except Exception:
            logger.exception("Failed to save bot contact user %s", message.from_user.id)
        await message.answer(
            "✅ <b>Phone number received.</b>\n\n"
            "Open the app directly or tap Login to get your code.",
            parse_mode="HTML",
            reply_markup=_login_keyboard(webapp_url),
        )

    @dp.message(F.text == "🔑 Login")
    async def handle_login(message: types.Message) -> None:
        contact = await store.get_contact(message.from_user.id)
        if not contact:
            contact = await _get_saved_contact(message.from_user.id)
        if contact is not None:
            contact = _merge_current_telegram_profile(contact, message.from_user)
            await store.save_contact(
                telegram_id=contact["telegram_id"],
                phone=contact["phone"],
                username=contact.get("username"),
                first_name=contact["first_name"],
                last_name=contact.get("last_name"),
                avatar_url=contact.get("avatar_url"),
            )

        if not contact:
            await message.answer(
                "⚠️ Please share your phone number first.",
                reply_markup=_phone_keyboard(webapp_url),
            )
            return

        avatar_url = await _fetch_telegram_avatar_url(bot, contact["telegram_id"])
        if avatar_url:
            contact["avatar_url"] = avatar_url
            await store.save_contact(
                telegram_id=contact["telegram_id"],
                phone=contact["phone"],
                username=contact.get("username"),
                first_name=contact["first_name"],
                last_name=contact.get("last_name"),
                avatar_url=avatar_url,
            )

        try:
            await _save_bot_contact_user(contact)
        except Exception:
            logger.exception("Failed to save bot contact user %s", contact["telegram_id"])

        code = await store.create_code(
            telegram_id=contact["telegram_id"],
            phone=contact["phone"],
            username=contact.get("username"),
            first_name=contact["first_name"],
            last_name=contact.get("last_name"),
            avatar_url=contact.get("avatar_url"),
        )

        sent = await message.answer(
            f"✅ <b>Verification code:</b>\n\n"
            f"<code>{code}</code>\n\n"
            f"Code is valid for <b>3 minutes</b>.",
            parse_mode="HTML",
            reply_markup=_code_copy_keyboard(code),
        )

        asyncio.create_task(_countdown(store, code, sent))

    @dp.message()
    async def fallback(message: types.Message) -> None:
        contact = await store.get_contact(message.from_user.id)
        if not contact:
            contact = await _get_saved_contact(message.from_user.id)
        if contact is not None:
            contact = _merge_current_telegram_profile(contact, message.from_user)
            await store.save_contact(
                telegram_id=contact["telegram_id"],
                phone=contact["phone"],
                username=contact.get("username"),
                first_name=contact["first_name"],
                last_name=contact.get("last_name"),
                avatar_url=contact.get("avatar_url"),
            )

        if contact:
            await message.answer(
                "🔑 Tap the button to get your login code:",
                reply_markup=_login_keyboard(webapp_url),
            )
        else:
            await message.answer(
                "📱 Please share your phone number:",
                reply_markup=_phone_keyboard(webapp_url),
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
                    reply_markup=_code_copy_keyboard(code),
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
