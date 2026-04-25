from __future__ import annotations

import asyncio
from uuid import UUID

from app.schemas.common import DebugPrincipal
from app.db.session import get_session_maker
from app.models import admin, attempt, commerce, notification, ops, review, test, user  # noqa: F401
from app.services.attempt_repo import ensure_debug_user
from app.services.test_content_repo import ensure_fixture_tests_seeded, ensure_test_admins_seeded


TEST_USER = DebugPrincipal(
    id=UUID("33333333-3333-3333-3333-333333333333"),
    first_name="Azizbek",
    last_name="Prime",
    username="azizbek",
    role="user",
    is_premium=True,
    show_on_leaderboard=True,
)


async def seed_debug_data() -> None:
    session_maker = get_session_maker()
    async with session_maker() as session:
        await ensure_test_admins_seeded(session)
        await ensure_fixture_tests_seeded(session)
        await ensure_debug_user(session, TEST_USER)
        await session.commit()


def main() -> None:
    asyncio.run(seed_debug_data())


if __name__ == "__main__":
    main()
