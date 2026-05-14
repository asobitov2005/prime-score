import asyncio
from app.db.session import get_session_maker
from app.services.writing_checker import _skip_groq_aux_call
from app.services.ai_config import resolve_ai_use_case_config
from app.models.enums import AiUseCase

async def main():
    session_maker = get_session_maker()
    async with session_maker() as session:
        config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_GRADER)
        print("Skip groq aux call for grader config:", _skip_groq_aux_call(config))

if __name__ == "__main__":
    asyncio.run(main())
