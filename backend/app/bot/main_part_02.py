from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.bot.main_dependencies import *
from app.bot.main_part_01 import _CODE_TTL, _TICK, _bot_session, _code_copy_keyboard, _fetch_telegram_avatar_url, _is_contact_refresh_due, _login_keyboard, _merge_current_telegram_profile, _normalize_phone_number, _phone_keyboard, _save_bot_contact_user, _save_started_telegram_user, logger

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

        # Best-effort profile-picture enrichment. Must never block code delivery.
        try:
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
        except Exception:
            logger.exception(
                "Avatar enrichment failed for %s; issuing code anyway",
                contact["telegram_id"],
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
