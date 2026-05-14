import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.attempt import AttemptEvent

async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres:1112@127.0.0.1:5433/primescore")
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        result = await session.execute(select(AttemptEvent).limit(10))
        events = result.scalars().all()
        for e in events:
            print(e.attempt_id, e.event_type)

asyncio.run(main())
