from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.api.routes.admin_user_support import _build_admin_user_detail


@pytest.mark.asyncio
async def test_build_admin_user_detail_resolves_lazy_contract_imports() -> None:
    session = SimpleNamespace(scalar=AsyncMock(side_effect=[0, 0, None]))
    user = SimpleNamespace(
        id=uuid4(),
        telegram_id=972538005,
        first_name="Admin",
        last_name=None,
        username=None,
        phone=None,
        avatar_url=None,
        is_premium=False,
        premium_until=None,
        show_on_leaderboard=True,
        bot_contact_at=None,
        first_login_at=None,
        last_active_at=None,
        created_at=None,
        deleted_at=None,
    )
    params = SimpleNamespace(
        time_preset="all_time",
        start_date=None,
        end_date=None,
        test_type="all",
    )

    result = await _build_admin_user_detail(session, user, params)

    assert result.id == user.id
    assert result.telegram_id == user.telegram_id
    assert result.attempts_total == 0
    assert result.attempts_completed == 0
    assert result.average_band is None
