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
        
        # Groq doesn't support passing structured output schema in JSON mode natively, 
        # so we have to explicitly inject the required fields into the prompt
        prompt = """
        Grade this essay.
        "In today’s modern world, science and technology have developed very fast and they play an important role in our daily lives. However, people still highly value artists such as musicians, painters, and writers. This is because art can show us important things about life that science and technology cannot explain."
        
        You MUST return a JSON object with EXACTLY the following structure. NO markdown, just JSON:
        {
          "task_achievement": {"band": 6.0, "reasoning": "...", "summary": "...", "strengths": ["..."], "improvements": ["..."], "evidence_quotes": ["..."]},
          "coherence": {"band": 6.0, "reasoning": "...", "summary": "...", "strengths": ["..."], "improvements": ["..."], "evidence_quotes": ["..."]},
          "lexical": {"band": 6.0, "reasoning": "...", "summary": "...", "strengths": ["..."], "improvements": ["..."], "evidence_quotes": ["..."]},
          "grammar": {"band": 6.0, "reasoning": "...", "summary": "...", "strengths": ["..."], "improvements": ["..."], "evidence_quotes": ["..."]},
          "overall_summary": "...",
          "next_steps": ["..."],
          "inline_annotations": [{"offset": 0, "length": 5, "original": "...", "replacements": ["..."], "category": "grammar", "severity": "warning", "short_message": "...", "explanation": "...", "band_impact": "...", "examiner_tip": "...", "improved_sentence": "..."}],
          "vocabulary_suggestions": [{"current_phrase": "...", "improved_phrase": "...", "level": "C1", "why_it_works": "...", "example_sentence": "..."}]
        }
        """
        system_instruction = "You are an IELTS examiner."
        
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
            print("--- JSON Parse Check ---")
            print(json.loads(result).keys())
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
