import asyncio
from sqlalchemy import select
from app.db.session import get_session_maker
from app.models.writing import WritingSubmission
from app.tasks.tasks import evaluate_writing_submission_task

async def main():
    session_maker = get_session_maker()
    async with session_maker() as session:
        result = await session.execute(
            select(WritingSubmission).where(WritingSubmission.status == 'queued').order_by(WritingSubmission.created_at.desc())
        )
        submissions = result.scalars().all()
        if not submissions:
            print("No queued submissions.")
        for sub in submissions:
            print(f"Triggering grading for queued submission: {sub.id}")
            evaluate_writing_submission_task.delay(str(sub.id))

if __name__ == "__main__":
    asyncio.run(main())
