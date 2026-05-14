import asyncio
from app.db.session import get_session_maker
from app.services.ai_config import resolve_ai_use_case_config
from app.models.enums import AiUseCase
from app.services.ai_generation import generate_text_sync
from app.services.writing_checker import _response_schema
import json

async def test_groq():
    session_maker = get_session_maker()
    async with session_maker() as session:
        config = await resolve_ai_use_case_config(session, AiUseCase.WRITING_GRADER)
        
        prompt = "Return a valid JSON object matching the provided response schema exactly."
        system_instruction = "You are a helpful assistant that strictly follows the provided JSON schema."
        
        try:
            print("Sending request to Groq with strictly enforced schema rules via prompt...")
            # We are injecting schema into prompt to force Groq
            prompt += f" Schema: {json.dumps(_response_schema(), default=str)}"
            
            result = generate_text_sync(
                config=config,
                prompt=prompt,
                system_instruction=system_instruction,
                max_output_tokens=8000,
                response_mime_type="application/json",
            )
            print("Groq response length:", len(result))
            print("Parsed keys:", json.loads(result).keys())
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
