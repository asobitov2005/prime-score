import asyncio
from app.db.session import get_session_maker
from app.models.attempt import Attempt
from app.models.test import Question
from sqlalchemy import select

async def update_attempts():
    session_maker = get_session_maker()
    async with session_maker() as session:
        attempts = list((await session.scalars(select(Attempt))).all())
        for attempt in attempts:
            if not attempt.attempt_metadata:
                continue
            meta = dict(attempt.attempt_metadata)
            items = meta.get("scoring_items", [])
            updated = False
            for item in items:
                q_id = item.get("question_id")
                if not q_id: continue
                q = await session.get(Question, q_id)
                if q:
                    item["explanation"] = q.explanation
                    item["explanation_reference"] = q.explanation_reference
                    updated = True
            if updated:
                attempt.attempt_metadata = meta
                session.add(attempt)
        await session.commit()
        print("Done!")

asyncio.run(update_attempts())
