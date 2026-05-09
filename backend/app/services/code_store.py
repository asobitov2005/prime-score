from __future__ import annotations

import json
from functools import lru_cache

import redis.asyncio as aioredis

from app.core.config import get_settings
from app.core.security import generate_login_code
from app.services.user_names import resolve_login_name_parts

_CODE_TTL = 180      # 3 minutes
_CONTACT_TTL = 3600  # 1 hour (cleared when user never taps Login)
_CODE_PFX = "primescore:auth:code:"
_CONTACT_PFX = "primescore:auth:contact:"


class CodeStore:
    """Redis-backed store for Telegram login flow state."""

    def __init__(self, client: aioredis.Redis) -> None:
        self._r = client

    # ── contacts (phone + name per telegram user) ─────────────────────────

    async def save_contact(
        self,
        *,
        telegram_id: int,
        phone: str,
        username: str | None,
        first_name: str,
        last_name: str | None = None,
        avatar_url: str | None = None,
    ) -> None:
        payload = json.dumps(
            {
                "telegram_id": telegram_id,
                "phone": phone,
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "avatar_url": avatar_url,
            }
        )
        await self._r.set(f"{_CONTACT_PFX}{telegram_id}", payload, ex=_CONTACT_TTL)

    async def get_contact(self, telegram_id: int) -> dict | None:
        raw = await self._r.get(f"{_CONTACT_PFX}{telegram_id}")
        return self._normalize_identity_payload(json.loads(raw)) if raw else None

    async def delete_contact(self, telegram_id: int) -> None:
        await self._r.delete(f"{_CONTACT_PFX}{telegram_id}")

    # ── login codes ───────────────────────────────────────────────────────

    async def create_code(
        self,
        *,
        telegram_id: int,
        phone: str,
        username: str | None,
        first_name: str,
        last_name: str | None = None,
        avatar_url: str | None = None,
    ) -> str:
        code = generate_login_code()
        payload = json.dumps(
            {
                "telegram_id": telegram_id,
                "phone": phone,
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "avatar_url": avatar_url,
                "used": False,
            }
        )
        await self._r.set(f"{_CODE_PFX}{code}", payload, ex=_CODE_TTL)
        return code

    async def get_code(self, code: str) -> dict | None:
        raw = await self._r.get(f"{_CODE_PFX}{code}")
        return self._normalize_identity_payload(json.loads(raw)) if raw else None

    async def mark_used(self, code: str) -> bool:
        """Return True when code existed and was successfully marked as used."""
        key = f"{_CODE_PFX}{code}"
        raw = await self._r.get(key)
        if raw is None:
            return False
        data = json.loads(raw)
        data["used"] = True
        ttl = await self._r.ttl(key)
        await self._r.set(key, json.dumps(data), ex=max(ttl, 1))
        return True

    async def delete_code(self, code: str) -> None:
        await self._r.delete(f"{_CODE_PFX}{code}")

    @staticmethod
    def _normalize_identity_payload(payload: dict) -> dict:
        normalized = dict(payload)
        first_name, last_name = resolve_login_name_parts(normalized)
        normalized["first_name"] = first_name
        normalized["last_name"] = last_name
        return normalized


@lru_cache(maxsize=1)
def _redis_client() -> aioredis.Redis:
    return aioredis.from_url(get_settings().redis_url, decode_responses=True)


def get_code_store() -> CodeStore:
    return CodeStore(_redis_client())
