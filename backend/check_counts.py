import asyncio
from app.db.session import get_session_maker
from app.models.test import Question
from sqlalchemy import select

async def check():
    session_maker = get_session_maker()
    async with session_maker() as session:
        qs = list((await session.scalars(select(Question))).all())
        total = len(qs)
        has_ref = sum(1 for q in qs if q.explanation_reference and q.explanation_reference.get("quote"))
        print(f"Total questions: {total}, With AI quote: {has_ref}")
asyncio.run(check())
