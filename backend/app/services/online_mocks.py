"""Four-resource catalogue; attempts and writing submissions retain their own lifecycle."""

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, load_only

from app.models.enums import TestFormat, TestStatus, TestType, WritingTaskStatus, WritingTaskType
from app.models.mock import OnlineFullMock
from app.models.test import Test, TestSection
from app.models.writing import WritingTask
from app.schemas.online_mocks import OnlineMockCard, OnlineMockDetail, OnlineMockStage
from app.services.scoring import listening_exam_seconds


COMPONENTS = (
    ("listening_test_id", Test, TestType.LISTENING),
    ("reading_test_id", Test, TestType.READING),
    ("writing_task_1_id", WritingTask, WritingTaskType.TASK_1),
    ("writing_task_2_id", WritingTask, WritingTaskType.TASK_2),
)


def public_bundle_query():
    listening, reading = aliased(Test), aliased(Test)
    task1, task2 = aliased(WritingTask), aliased(WritingTask)
    audio_seconds = select(func.coalesce(func.sum(TestSection.audio_duration_seconds), 0)).where(
        TestSection.test_id == listening.id
    ).correlate(listening).scalar_subquery()
    # EnumValueString comparisons include both legacy enum names and current values.
    return (
        select(OnlineFullMock, listening, reading, task1, task2, audio_seconds.label("audio_seconds"))
        .options(
            load_only(listening.id, listening.title, listening.exam_time_limit_seconds, raiseload=True),
            load_only(reading.id, reading.title, reading.exam_time_limit_seconds, raiseload=True),
            load_only(task1.id, task1.title, task1.time_limit_seconds, raiseload=True),
            load_only(task2.id, task2.title, task2.time_limit_seconds, raiseload=True),
        )
        .join(listening, listening.id == OnlineFullMock.listening_test_id)
        .join(reading, reading.id == OnlineFullMock.reading_test_id)
        .join(task1, task1.id == OnlineFullMock.writing_task_1_id)
        .join(task2, task2.id == OnlineFullMock.writing_task_2_id)
        .where(
            OnlineFullMock.is_published.is_(True),
            OnlineFullMock.archived_at.is_(None),
            OnlineFullMock.academic_confirmed.is_(True),
            OnlineFullMock.module == "academic",
            listening.type == TestType.LISTENING,
            reading.type == TestType.READING,
            listening.format == TestFormat.FULL,
            reading.format == TestFormat.FULL,
            listening.status == TestStatus.PUBLISHED,
            reading.status == TestStatus.PUBLISHED,
            task1.task_type == WritingTaskType.TASK_1,
            task2.task_type == WritingTaskType.TASK_2,
            task1.status == WritingTaskStatus.PUBLISHED,
            task2.status == WritingTaskStatus.PUBLISHED,
        )
    )


async def validate_components(session: AsyncSession, values: dict) -> None:
    if values["is_published"] and not values["academic_confirmed"]:
        raise HTTPException(422, "Confirm that all components are appropriate for an Academic Full Mock.")
    for field, model, expected_type in COMPONENTS:
        resource = await session.scalar(
            select(model).where(model.id == values[field]).with_for_update(read=True)
        )
        if resource is None:
            raise HTTPException(422, f"{field}: resource does not exist.")
        actual_type = resource.type if model is Test else resource.task_type
        if actual_type != expected_type:
            raise HTTPException(422, f"{field}: incorrect component type.")
        if model is Test and resource.format != TestFormat.FULL:
            raise HTTPException(422, f"{field}: a full test is required, not a passage or part.")
        if values["is_published"] and resource.status != "published":
            raise HTTPException(422, f"{field}: component must be published.")


def _stage_timings(row) -> tuple[int, int, int, int]:
    _, _, _, task1, task2, audio_seconds = row
    # Mirror _serialize_snapshot_from_test full-exam timing, not editable metadata
    # that the attempt runtime itself does not use.
    return (
        listening_exam_seconds(int(audio_seconds)), 3600,
        task1.time_limit_seconds, task2.time_limit_seconds,
    )


def bundle_card(row) -> OnlineMockCard:
    total = sum(_stage_timings(row))
    return OnlineMockCard.model_validate(row[0]).model_copy(update={
        "total_seconds": total, "duration_minutes": total / 60,
    })


def bundle_detail(row) -> OnlineMockDetail:
    resources = row[1:5]
    keys = ("listening", "reading", "writing_task_1", "writing_task_2")
    stages = []
    for key, resource, seconds in zip(keys, resources, _stage_timings(row), strict=True):
        is_test = isinstance(resource, Test)
        url = (
            f"/exam-preview/{key}?testId={resource.id}&start=1&scope=full&mode=exam" if is_test
            else f"/exam-preview/writing?taskId={resource.id}&mode=exam"
        )
        stages.append(OnlineMockStage(
            key=key,
            resource_id=resource.id,
            resource_type="test" if is_test else "writing_task",
            title=resource.title,
            launch_url=url,
            time_limit_seconds=seconds,
        ))
    return OnlineMockDetail(**bundle_card(row).model_dump(), stages=stages)
