import asyncio
import logging
from uuid import UUID

from pydantic import BaseModel, Field
from google import genai
from google.genai import types as genai_types
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.db.session import get_session_maker
from app.models.enums import TestType
from app.models.test import Test, TestSection, QuestionGroup, Question, AnswerVariant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExplanationResponse(BaseModel):
    explanation: str = Field(description="A concise explanation of why the answer is correct based on the passage.")
    quote: str = Field(description="The exact quote or short excerpt from the passage that justifies the answer.")

async def generate_explanations():
    settings = get_settings()
    client = genai.Client(api_key=settings.gemini_api_key)
    session_maker = get_session_maker()
    
    async with session_maker() as session:
        # Fetch reading tests with questions
        stmt = (
            select(Test)
            .where(Test.type == TestType.READING)
            .options(
                selectinload(Test.sections)
                .selectinload(TestSection.question_groups)
                .selectinload(QuestionGroup.questions)
                .selectinload(Question.answer_variants)
            )
        )
        tests = list((await session.scalars(stmt)).all())
        
        updated_count = 0
        tasks = []
        
        async def process_question(question, passage_text, accepted_answers):
            prompt_text = f"""
            You are an expert IELTS Reading instructor.
            
            Passage text:
            ---
            {passage_text}
            ---
            
            Question: {question.prompt}
            Accepted Answers: {', '.join(accepted_answers)}
            
            Provide a concise explanation of why this answer is correct based on the passage.
            Also extract the EXACT quote from the passage that proves this answer. The quote must be an exact substring from the passage text provided above.
            """
            
            try:
                response = await client.aio.models.generate_content(
                    model=settings.gemini_model,
                    contents=prompt_text,
                    config=genai_types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=ExplanationResponse,
                        temperature=0.2,
                    ),
                )
                if response.text:
                    import json
                    data = json.loads(response.text)
                    return data
            except Exception as e:
                logger.error(f"Failed to generate for Q{question.number}: {e}")
                # Fallback delay for rate limit errors
                await asyncio.sleep(2)
            return None

        # Semaphores for concurrent rate limiting
        sem = asyncio.Semaphore(15)
        
        async def bounded_process(question, passage_text, accepted_answers):
            async with sem:
                res = await process_question(question, passage_text, accepted_answers)
                if res:
                    question.explanation = res.get("explanation", "")
                    question.explanation_reference = {"quote": res.get("quote", "")}
                    logger.info(f"Generated Q{question.number}")
                    return True
                return False
                
        pending_questions = []

        for test in tests:
            for section in test.sections:
                passage_text = ""
                paragraphs = section.content.get("paragraphs", [])
                if paragraphs:
                    passage_text = "\n\n".join([str(p) for p in paragraphs])
                else:
                    passage_text = str(section.content.get("body") or section.intro or "")
                
                for group in section.question_groups:
                    for question in group.questions:
                        if question.explanation_reference and question.explanation_reference.get("quote") and question.explanation and "mocked" not in question.explanation:
                            continue
                        
                        accepted_answers = [av.value for av in question.answer_variants]
                        if not accepted_answers:
                            continue
                            
                        pending_questions.append((question, passage_text, accepted_answers))

        logger.info(f"Found {len(pending_questions)} questions to process.")
        
        # Process in batches to save to DB occasionally
        batch_size = 30
        for i in range(0, len(pending_questions), batch_size):
            batch = pending_questions[i:i+batch_size]
            coroutines = [bounded_process(q, p, a) for q, p, a in batch]
            results = await asyncio.gather(*coroutines, return_exceptions=True)
            updated_count += sum(1 for r in results if r is True)
            
            # Print exceptions if any
            for r in results:
                if isinstance(r, Exception):
                    logger.error(f"Gather exception: {r}")
            
            # Add to session and commit batch
            for q, _, _ in batch:
                session.add(q)
            await session.commit()
            logger.info(f"Committed batch. Total updated: {updated_count}")
            
        logger.info(f"Successfully generated/updated explanations for {updated_count} questions.")

if __name__ == "__main__":
    asyncio.run(generate_explanations())
