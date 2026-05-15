from __future__ import annotations

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings


_engines: dict[int, object] = {}
_session_makers: dict[int, async_sessionmaker[AsyncSession]] = {}


def _current_loop_key() -> int:
    try:
        return id(asyncio.get_running_loop())
    except RuntimeError:
        return 0


def get_engine():
    loop_key = _current_loop_key()
    if loop_key in _engines:
        return _engines[loop_key]

    settings = get_settings()
    engine = create_async_engine(settings.database_url, future=True, pool_pre_ping=True)
    _engines[loop_key] = engine
    return engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    loop_key = _current_loop_key()
    if loop_key not in _session_makers:
        _session_makers[loop_key] = async_sessionmaker(bind=get_engine(), expire_on_commit=False, class_=AsyncSession)
    return _session_makers[loop_key]


def reset_session_state() -> None:
    _session_makers.clear()
    _engines.clear()


async def get_async_session() -> AsyncSession:
    session_local = get_session_maker()
    async with session_local() as session:
        yield session


async def get_db_session() -> AsyncSession:
    async for session in get_async_session():
        yield session
