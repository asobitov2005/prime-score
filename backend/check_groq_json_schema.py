import asyncio
from app.db.session import get_session_maker
from app.services.ai_config import resolve_ai_use_case_config
from app.models.enums import AiUseCase
from app.services.ai_generation import generate_text_sync
from app.services.writing_checker import _response_schema
from google.genai import types as genai_types
import json

async def test_groq():
    session_maker = get_session_maker()
    async with session_maker() as session:
        config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_GRADER)
        
        prompt = "Grade this essay. Return a valid JSON."
        system_instruction = "You are a helpful assistant."
        
        try:
            schema = _response_schema()
            # print("genai schema:", schema)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
