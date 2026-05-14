import asyncio
from app.db.session import get_session_maker
from app.services.ai_config import resolve_ai_use_case_config
from app.models.enums import AiUseCase, WritingTaskType
from app.services.writing_checker import grade_essay_sync, _call_grader, _build_grading_prompt
from app.services.writing_config import get_active_prompt_bundle, get_active_anchor_bundle

async def test_groq():
    session_maker = get_session_maker()
    async with session_maker() as session:
        prompts = await get_active_prompt_bundle(session, WritingTaskType.TASK_2)
        anchors = await get_active_anchor_bundle(session, WritingTaskType.TASK_2)
        
        prompt = _build_grading_prompt(
            prompts=prompts,
            anchors=anchors,
            task_type=WritingTaskType.TASK_2,
            task_prompt_text="Some prompt",
            image_summary="",
            essay_text="Hello world"
        )
        print(prompt)

if __name__ == "__main__":
    asyncio.run(test_groq())
