from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID
from types import SimpleNamespace
import pytest
from app.api.routes import auth as auth_routes
from app.bot.main import _apply_bot_contact_to_user, _is_contact_refresh_due
from app.models.user import TelegramUser, User
from app.services import telegram_profile_sync
from app.services import telegram_users as telegram_user_service
from app.services.telegram_webapp import (
    TelegramWebAppValidationError,
    build_signed_telegram_webapp_init_data,
    build_telegram_webapp_fallback_phone,
    validate_telegram_webapp_init_data,
)

__all__ = [name for name in globals() if not name.startswith('__')]
