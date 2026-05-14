import asyncio
from app.db.session import get_session_maker
from app.services.ai_config import resolve_ai_use_case_config
from app.models.enums import AiUseCase
from app.services.ai_generation import generate_text_sync

async def test_groq():
    session_maker = get_session_maker()
    async with session_maker() as session:
        config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_GRADER)
        
        prompt = "Return a valid JSON object matching the provided response schema exactly. Schema: { \"type\": \"object\", \"properties\": { \"name\": {\"type\": \"string\"} } }"
        system_instruction = "You are a helpful assistant."
        
        try:
            print("Sending request to Groq...")
            result = generate_text_sync(
                config=config,
                prompt=prompt,
                system_instruction=system_instruction,
                max_output_tokens=8000,
                response_mime_type="application/json"
            )
            print("Groq response:")
            print(result)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
