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
        Output a valid JSON matching this structure exactly (DO NOT MISS ANY KEY).
        You must ensure all standard IELTS criteria are present. Here is the structure template for guidance:
        {
          "task_achievement": {"band": 6.5, "reasoning": "...", "summary": "...", "strengths": ["..."], "improvements": ["..."], "evidence_quotes": ["..."]},
          "coherence": {"band": 6.0, "reasoning": "...", "summary": "...", "strengths": ["..."], "improvements": ["..."], "evidence_quotes": ["..."]},
          "lexical": {"band": 7.0, "reasoning": "...", "summary": "...", "strengths": ["..."], "improvements": ["..."], "evidence_quotes": ["..."]},
          "grammar": {"band": 6.5, "reasoning": "...", "summary": "...", "strengths": ["..."], "improvements": ["..."], "evidence_quotes": ["..."]},
          "overall_summary": "Good.",
          "next_steps": ["Read."],
          "inline_annotations": [],
          "vocabulary_suggestions": []
        }
        
        Grade this essay: "In today’s modern world..."
        """
        system_instruction = "You are an IELTS examiner outputting valid JSON. Ensure JSON has all top level keys: task_achievement, coherence, lexical, grammar, overall_summary, next_steps, inline_annotations, vocabulary_suggestions."
        
        try:
            print("Sending request to Groq...")
            result = generate_text_sync(
                config=config,
                prompt=prompt,
                system_instruction=system_instruction,
                max_output_tokens=8000,
                response_mime_type="application/json",
                response_schema=_response_schema() # We pass the GenAI schema object as a test
            )
            print("Groq response length:", len(result))
            print("---")
            print(result)
            try:
                print("Parsed keys:", json.loads(result).keys())
            except Exception as e:
                print("Could not parse JSON:", e)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
