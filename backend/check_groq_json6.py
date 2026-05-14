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
        
        prompt = """
        Output a valid JSON matching this structure exactly (DO NOT MISS ANY KEY):
        {
          "task_achievement": {"band": 6.5, "reasoning": "x", "summary": "x", "strengths": ["x"], "improvements": ["x"], "evidence_quotes": ["x"]},
          "coherence": {"band": 6.0, "reasoning": "x", "summary": "x", "strengths": ["x"], "improvements": ["x"], "evidence_quotes": ["x"]},
          "lexical": {"band": 7.0, "reasoning": "x", "summary": "x", "strengths": ["x"], "improvements": ["x"], "evidence_quotes": ["x"]},
          "grammar": {"band": 6.5, "reasoning": "x", "summary": "x", "strengths": ["x"], "improvements": ["x"], "evidence_quotes": ["x"]},
          "overall_summary": "Good.",
          "next_steps": ["Read."],
          "inline_annotations": [],
          "vocabulary_suggestions": []
        }
        
        Grade this essay: "In today’s modern world..."
        """
        system_instruction = "You are an IELTS examiner outputting valid JSON."
        
        try:
            print("Sending request to Groq...")
            result = generate_text_sync(
                config=config,
                prompt=prompt,
                system_instruction=system_instruction,
                max_output_tokens=8000,
                response_mime_type="application/json"
            )
            print("Groq response length:", len(result))
            print("---")
            print(result)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
