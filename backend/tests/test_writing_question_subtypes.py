from app.models.enums import (
    WritingDifficulty,
    WritingQuestionSubtype,
    WritingTaskStatus,
    WritingTaskType,
)
from app.schemas.writing import AdminWritingTaskCreateRequest


def test_admin_writing_request_accepts_direct_question_subtype() -> None:
    payload = AdminWritingTaskCreateRequest(
        title="Direct question essay",
        task_type=WritingTaskType.TASK_2,
        prompt_html="<p>Answer the direct question.</p>",
        word_minimum=250,
        time_limit_seconds=2400,
        difficulty=WritingDifficulty.MEDIUM,
        question_subtype=WritingQuestionSubtype("direct_question"),
        status=WritingTaskStatus.DRAFT,
    )

    assert payload.question_subtype == WritingQuestionSubtype("direct_question")
