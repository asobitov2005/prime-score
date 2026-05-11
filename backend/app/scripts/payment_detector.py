from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

from sqlalchemy import select

from app.db.session import get_session_maker
from app.models.commerce import PaymentSetting
from app.services.payment_service import (
    expire_stale_payments,
    get_or_create_payment_settings,
    mark_payment_detected,
    parse_payment_amount_from_text,
)

logger = logging.getLogger(__name__)

SESSION_PATH = Path(os.getenv("TELEGRAM_SESSION_PATH", "/var/lib/primescore/telegram/payment_detector"))


async def _load_settings():
    session_maker = get_session_maker()
    async with session_maker() as session:
        setting = await session.scalar(select(PaymentSetting).order_by(PaymentSetting.created_at.asc()))
        if setting is None:
            setting = await get_or_create_payment_settings(session)
            await session.commit()
        return setting


async def _expire_loop() -> None:
    session_maker = get_session_maker()
    while True:
        async with session_maker() as session:
            expired_count = await expire_stale_payments(session)
            if expired_count:
                await session.commit()
                logger.info("Archived %s expired invoice(s).", expired_count)
        await asyncio.sleep(30)


async def _handle_detected_text(message_id: int, text: str) -> None:
    amount = parse_payment_amount_from_text(text)
    if amount is None:
        return

    session_maker = get_session_maker()
    async with session_maker() as session:
        payment = await mark_payment_detected(
            session,
            invoice_amount=amount,
            detected_message_id=str(message_id),
            detected_message_text=text,
        )
        if payment is not None:
            await session.commit()
            logger.info("Matched invoice %s for amount %s.", payment.invoice_code, amount)


async def _main() -> None:
    setting = await _load_settings()
    if not setting.is_enabled:
        raise RuntimeError("Payment detector is disabled in payment settings.")
    if not setting.telegram_api_id or not setting.telegram_api_hash:
        raise RuntimeError("Telegram API credentials are missing in payment settings.")

    try:
        from telethon import TelegramClient, events, functions  # type: ignore
    except ModuleNotFoundError as exc:
        raise RuntimeError("Telethon is not installed. Install backend dependencies again.") from exc

    SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
    client = TelegramClient(
        str(SESSION_PATH),
        int(setting.telegram_api_id),
        setting.telegram_api_hash,
    )

    active_bot = setting.active_bot or "HUMOcardbot"

    @client.on(events.NewMessage(from_users=active_bot))
    async def _on_new_message(event):  # type: ignore[no-redef]
        text = event.raw_text or ""
        await _handle_detected_text(event.id, text)

    async def _stay_offline() -> None:
        while True:
            try:
                await client(functions.account.UpdateStatusRequest(offline=True))
            except Exception:
                logger.debug("Could not refresh Telegram offline status.", exc_info=True)
            await asyncio.sleep(45)

    logger.info("Starting payment detector for @%s", active_bot)
    asyncio.create_task(_expire_loop())
    await client.start(phone=setting.phone_number or None)
    await client(functions.account.UpdateStatusRequest(offline=True))
    asyncio.create_task(_stay_offline())
    await client.run_until_disconnected()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main())


if __name__ == "__main__":
    main()
