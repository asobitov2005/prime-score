import asyncio
from app.db.session import get_session_maker
from app.services.ai_config import resolve_ai_use_case_config
from app.models.enums import AiUseCase
from app.services.ai_generation import generate_text_sync
from app.services.writing_checker import _response_schema

async def test_groq():
    session_maker = get_session_maker()
    async with session_maker() as session:
        config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_GRADER)
        
        prompt = """
        Grade this essay.
        "In today’s modern world, science and technology have developed very fast and they play an important role in our daily lives. However, people still highly value artists such as musicians, painters, and writers. This is because art can show us important things about life that science and technology cannot explain."
        
        Ensure ALL REQUIRED FIELDS from the schema are returned.
        """
        system_instruction = "You are a helpful assistant."
        
        try:
            print("Sending request to Groq...")
            result = generate_text_sync(
                config=config,
                prompt=prompt,
                system_instruction=system_instruction,
                max_output_tokens=8000,
                response_mime_type="application/json",
                response_schema=_response_schema()
            )
            print("Groq response length:", len(result))
            print("---")
            print(result)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
