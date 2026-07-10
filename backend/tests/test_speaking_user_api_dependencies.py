from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID
from httpx import ASGITransport, AsyncClient
from app.core.deps import get_current_user
from app.api.routes.speaking import _build_live_system_instruction
from app.db.session import get_db_session
from app.models.enums import AiProvider, AiUseCase
from app.schemas.common import DebugPrincipal

__all__ = [name for name in globals() if not name.startswith('__')]
