import asyncio
from uuid import UUID
from app.db.session import get_session_maker
from sqlalchemy import select
from app.models.attempt import Attempt
import json

async def check():
    session_maker = get_session_maker()
    async with session_maker() as session:
        attempt = await session.get(Attempt, UUID("20819e86-43a6-46d0-81b7-dd7327716f47"))
        if attempt:
            print(json.dumps(attempt.attempt_metadata.get("scoring_items", [])[0], indent=2))
            
asyncio.run(check())
