from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.bot.main_dependencies import *

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
    except Exception:
        # Avatar enrichment is best-effort — a Telegram/aiohttp/MinIO failure
        # here must never block the login code from being issued.
        logger.exception("Failed to fetch Telegram avatar for %s", telegram_id)
        return None
