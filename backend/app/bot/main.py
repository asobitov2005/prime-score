import asyncio
import random
import string
import logging
import json
import os
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove

from app.core.config import get_settings

# Logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Temporary File-based store for active codes (since Redis is not available)
# Shared file for active codes - pointing to backend root
CODES_FILE = os.path.join(os.getcwd(), "active_codes.json")

def load_codes():
    if os.path.exists(CODES_FILE):
        try:
            with open(CODES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_codes(codes):
    try:
        with open(CODES_FILE, "w", encoding="utf-8") as f:
            json.dump(codes, f, ensure_ascii=False, indent=2)
            print(f"DEBUG: Saved code to {CODES_FILE}")
    except Exception as e:
        print(f"DEBUG: Error saving codes: {e}")

def generate_code():
    return "".join(random.choices(string.digits, k=6))

# Keyboard for the bot
def get_main_keyboard(has_contact=False):
    if not has_contact:
        kb = [
            [KeyboardButton(text="📱 Telefon raqamni yuborish / Share phone number", request_contact=True)]
        ]
    else:
        kb = [
            [KeyboardButton(text="Login")]
        ]
    return ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True, persistent=True)

async def run_bot() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token or settings.telegram_bot_token == "change-me":
        logger.error("Telegram Bot Token is missing or invalid in .env file!")
        return

    bot = Bot(token=settings.telegram_bot_token)
    dp = Dispatcher()

    # In-memory store for users who shared contact (for session duration)
    users_with_contact = {}

    @dp.message(Command("start"))
    async def cmd_start(message: types.Message):
        welcome_text = (
            "👋 <b>Assalomu alaykum! PrimeScore botiga xush kelibsiz.</b>\n\n"
            "🇺🇿 Tizimga kirish uchun telefon raqamingizni yuboring. Sizga tasdiqlash kodi beriladi.\n"
            "🇬🇧 Please share your phone number to sign in. You will receive a verification code."
        )
        await message.answer(welcome_text, parse_mode="HTML", reply_markup=get_main_keyboard(False))

    @dp.message(F.contact)
    async def handle_contact(message: types.Message):
        if message.contact.user_id != message.from_user.id:
            await message.answer(
                "❌ Xatolik: Iltimos, faqat o'zingizning shaxsiy telefon raqamingizni yuboring.\n\n"
                "❌ Error: Please share your own personal phone number."
            )
            return

        phone = message.contact.phone_number
        if not phone.startswith("+"):
            phone = "+" + phone
            
        users_with_contact[message.from_user.id] = {
            "telegram_id": message.from_user.id,
            "phone": phone,
            "name": message.from_user.first_name or message.from_user.username or "User"
        }

        await message.answer(
            "✅ <b>Raqamingiz qabul qilindi. / Your number has been received.</b>\n\n"
            "🇺🇿 Kodni olish uchun quyidagi <b>Login</b> tugmasini bosing.\n"
            "🇬🇧 Click the <b>Login</b> button below to get your code.",
            parse_mode="HTML",
            reply_markup=get_main_keyboard(True)
        )

    @dp.message(F.text == "Login")
    async def handle_login_request(message: types.Message):
        user_info = users_with_contact.get(message.from_user.id)
        
        if not user_info:
            await message.answer(
                "⚠️ Avval raqamingizni yuboring:\n⚠️ Please share your number first:",
                reply_markup=get_main_keyboard(False)
            )
            return

        code = generate_code()
        
        # Save to shared file
        codes = load_codes()
        codes[code] = {
            "telegram_id": user_info["telegram_id"],
            "phone": user_info["phone"],
            "name": user_info["name"],
            "timestamp": datetime.now().timestamp()
        }
        save_codes(codes)
        
        # Send initial message
        msg = await message.answer(
            f"✅ <b>Tasdiqlash kodi / Verification code:</b>\n\n"
            f"<code>{code}</code>\n\n"
            f"🇺🇿 <b>Kod 3 minutda eskiradi.</b>\n"
            f"🇬🇧 <b>The code is valid for 3 minutes.</b>",
            parse_mode="HTML"
        )
        
        # Expire code after 180 seconds and update message text live
        async def expire_code(c, sent_message: types.Message):
            try:
                # Update every 10 seconds
                for remaining in range(170, -1, -10):
                    await asyncio.sleep(10)
                    
                    # If remaining is 0 or less, break and expire
                    if remaining <= 0:
                        break
                        
                    current_codes = load_codes()
                    user_data = current_codes.get(c)
                    
                    # If code is gone from file, it might have been cleaned up or replaced
                    if not user_data:
                        return 

                    # If marked as used by the API
                    if user_data.get("used"):
                        try:
                            await sent_message.edit_text(
                                f"🎉 <b>Muvaffaqiyatli kirildi! / Successfully logged in!</b>",
                                parse_mode="HTML"
                            )
                        except Exception:
                            pass
                        
                        # Clean up from file now that bot has notified
                        current_codes.pop(c, None)
                        save_codes(current_codes)
                        return
                        
                    try:
                        if remaining >= 60:
                            mins, secs = divmod(remaining, 60)
                            time_str_uz = f"{mins}:{secs:02d} daqiqada"
                            time_str_en = f"{mins}:{secs:02d} minutes"
                        else:
                            time_str_uz = f"{remaining} soniyada"
                            time_str_en = f"{remaining} seconds"

                        await sent_message.edit_text(
                            f"✅ <b>Tasdiqlash kodi / Verification code:</b>\n\n"
                            f"<code>{c}</code>\n\n"
                            f"🇺🇿 <b>Kod {time_str_uz} eskiradi.</b>\n"
                            f"🇬🇧 <b>The code is valid for {time_str_en}.</b>",
                            parse_mode="HTML"
                        )
                    except Exception as e:
                        # Silently handle "message is not modified" or other TG errors
                        logger.debug(f"Countdown update skipped: {e}")

                # Final expiration logic
                final_codes = load_codes()
                if c in final_codes:
                    del final_codes[c]
                    save_codes(final_codes)
                
                # Show expiration notice instead of deleting
                try:
                    await sent_message.edit_text(
                        f"❌ <b>Kod muddati tugadi / Code expired.</b>\n\n"
                        f"Yangi kod olish uchun <b>🔑 Login</b> tugmasini qaytadan bosing.",
                        parse_mode="HTML"
                    )
                except Exception as e:
                    logger.error(f"Failed to show expiration notice: {e}")
                    
            except Exception as e:
                logger.error(f"Error in expire_code task: {e}")

        asyncio.create_task(expire_code(code, msg))

    @dp.message()
    async def echo_all(message: types.Message):
        has_contact = message.from_user.id in users_with_contact
        await message.answer(
            "Tizimga kirish uchun quyidagi tugmani bosing:",
            reply_markup=get_main_keyboard(has_contact)
        )

    logger.info("Bot is successfully starting...")
    await dp.start_polling(bot)

def main() -> None:
    asyncio.run(run_bot())

if __name__ == "__main__":
    main()
