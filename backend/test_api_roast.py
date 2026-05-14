import asyncio
from app.db.session import get_session_maker
from app.models.writing import WritingSubmission, WritingEvaluation
from sqlalchemy import select
from uuid import UUID
from app.schemas.writing import WritingRoastFeedback

async def main():
    async with get_session_maker()() as session:
        sub_id = UUID("6e91fb6d-df27-45da-978f-9209baedf616")
        eval = await session.scalar(select(WritingEvaluation).where(WritingEvaluation.submission_id == sub_id))
        
        roast_raw = eval.roast_feedback
        print("Raw type:", type(roast_raw))
        print("Raw val:", roast_raw)
        
        roast = None
        if isinstance(roast_raw, dict) and roast_raw:
            try:
                roast = WritingRoastFeedback.model_validate(roast_raw)
                print("Validated roast:", roast.model_dump())
            except Exception as e:
                print("ValidationError:", e)

if __name__ == "__main__":
    asyncio.run(main())
