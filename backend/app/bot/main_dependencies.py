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

__all__ = [name for name in globals() if not name.startswith('__')]
