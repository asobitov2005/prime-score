from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_engine():
    settings = get_settings()
    return create_async_engine(settings.database_url, future=True)


@lru_cache(maxsize=1)
def get_session_maker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=get_engine(), expire_on_commit=False, class_=AsyncSession)


async def get_async_session() -> AsyncSession:
    session_local = get_session_maker()
    async with session_local() as session:
        yield session


async def get_db_session() -> AsyncSession:
    async for session in get_async_session():
        yield session
