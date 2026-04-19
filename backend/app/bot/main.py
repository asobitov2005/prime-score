from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command
from aiogram.types import KeyboardButton, ReplyKeyboardMarkup

from app.core.config import get_settings
from app.services.code_store import get_code_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

_CODE_TTL = 180  # seconds — must match code_store._CODE_TTL
_TICK = 30       # update interval for the countdown message


def _phone_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Raqamni yuborish / Share number", request_contact=True)]],
        resize_keyboard=True,
        persistent=True,
    )


def _login_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🔑 Kirish / Login")]],
        resize_keyboard=True,
        persistent=True,
    )


async def run_bot() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token or settings.telegram_bot_token == "change-me":
        logger.error("TELEGRAM_BOT_TOKEN is not configured — bot will not start.")
        return

    bot = Bot(token=settings.telegram_bot_token)
    dp = Dispatcher()
    store = get_code_store()

    @dp.message(Command("start"))
    async def cmd_start(message: types.Message) -> None:
        await message.answer(
            "👋 <b>PrimeScore botiga xush kelibsiz.</b>\n\n"
            "🇺🇿 Tizimga kirish uchun telefon raqamingizni yuboring.\n"
            "🇬🇧 Share your phone number to sign in.",
            parse_mode="HTML",
            reply_markup=_phone_keyboard(),
        )

    @dp.message(F.contact)
    async def handle_contact(message: types.Message) -> None:
        if message.contact.user_id != message.from_user.id:
            await message.answer(
                "❌ Faqat o'z raqamingizni yuboring. / Share only your own number.",
                reply_markup=_phone_keyboard(),
            )
            return

        phone = message.contact.phone_number
        if not phone.startswith("+"):
            phone = "+" + phone

        await store.save_contact(
            telegram_id=message.from_user.id,
            phone=phone,
            name=message.from_user.first_name or message.from_user.username or "User",
        )
        await message.answer(
            "✅ <b>Raqamingiz qabul qilindi. / Number received.</b>\n\n"
            "🔑 Kodni olish uchun quyidagi tugmani bosing. / Tap the button to get your code.",
            parse_mode="HTML",
            reply_markup=_login_keyboard(),
        )

    @dp.message(F.text == "🔑 Kirish / Login")
    async def handle_login(message: types.Message) -> None:
        contact = await store.get_contact(message.from_user.id)
        if not contact:
            await message.answer(
                "⚠️ Avval raqamingizni yuboring. / Please share your number first.",
                reply_markup=_phone_keyboard(),
            )
            return

        code = await store.create_code(
            telegram_id=contact["telegram_id"],
            phone=contact["phone"],
            name=contact["name"],
        )

        sent = await message.answer(
            f"✅ <b>Tasdiqlash kodi / Verification code:</b>\n\n"
            f"<code>{code}</code>\n\n"
            f"🇺🇿 Kod <b>3 daqiqa</b> amal qiladi.\n"
            f"🇬🇧 Code is valid for <b>3 minutes</b>.",
            parse_mode="HTML",
        )

        asyncio.create_task(_countdown(store, code, sent))

    @dp.message()
    async def fallback(message: types.Message) -> None:
        contact = await store.get_contact(message.from_user.id)
        if contact:
            await message.answer(
                "🔑 Kodni olish uchun tugmani bosing:",
                reply_markup=_login_keyboard(),
            )
        else:
            await message.answer(
                "📱 Raqamingizni yuboring:",
                reply_markup=_phone_keyboard(),
            )

    logger.info("Bot starting (long-polling)...")
    await dp.start_polling(bot)


async def _countdown(store, code: str, sent: types.Message) -> None:
    """Keep the code message updated with remaining time; handle success/expiry."""
    try:
        for elapsed in range(_TICK, _CODE_TTL + 1, _TICK):
            await asyncio.sleep(_TICK)

            data = await store.get_code(code)
            if data is None:
                # TTL expired in Redis — already cleaned up
                break

            if data.get("used"):
                try:
                    await sent.edit_text(
                        "🎉 <b>Muvaffaqiyatli kirildi! / Successfully logged in!</b>",
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
                label_uz, label_en = f"{m}:{s:02d} daqiqada", f"{m}:{s:02d} minutes"
            else:
                label_uz, label_en = f"{remaining} soniyada", f"{remaining} seconds"

            try:
                await sent.edit_text(
                    f"✅ <b>Tasdiqlash kodi / Verification code:</b>\n\n"
                    f"<code>{code}</code>\n\n"
                    f"🇺🇿 Kod <b>{label_uz}</b> eskiradi.\n"
                    f"🇬🇧 Code expires in <b>{label_en}</b>.",
                    parse_mode="HTML",
                )
            except Exception as exc:
                logger.debug("Countdown edit skipped: %s", exc)

        # Code timed out
        try:
            await sent.edit_text(
                "❌ <b>Kod muddati tugadi. / Code expired.</b>\n\n"
                "Yangi kod olish uchun <b>🔑 Kirish / Login</b> tugmasini bosing.",
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
