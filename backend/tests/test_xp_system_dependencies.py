from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID
from httpx import ASGITransport, AsyncClient
from app.api.routes import leaderboard as leaderboard_route
from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.schemas.common import DebugPrincipal
from app.services import xp

__all__ = [name for name in globals() if not name.startswith('__')]
