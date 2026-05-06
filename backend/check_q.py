import asyncio
from app.db.session import get_session_maker
from app.models.test import Question
from uuid import UUID

async def check():
    session_maker = get_session_maker()
    async with session_maker() as session:
        q = await session.get(Question, UUID("0dad9514-c0f7-4624-93d2-2f7e7d31df0b"))
        if q:
            print(q.explanation)
asyncio.run(check())
