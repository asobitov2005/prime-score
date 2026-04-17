from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter

from app.schemas.attempt import AttemptStartRequest, AttemptStartResponse
from app.schemas.test import QuestionGroupSummary, TestCard, TestDetail


router = APIRouter()


@router.get("", response_model=list[TestCard])
async def list_tests() -> list[TestCard]:
    return [
        TestCard(
            id=uuid4(),
            title="Cambridge 18 Test 1",
            type="reading",
            access_type="public",
            status="published",
            source="cambridge",
            source_detail="Cambridge 18, Test 1",
            is_favorite=False,
            is_locked=False,
        ),
        TestCard(
            id=uuid4(),
            title="Real Exam March 2026",
            type="listening",
            access_type="premium",
            status="published",
            source="real_exam",
            source_detail="Real Exam - March 2026",
            is_favorite=True,
            is_locked=True,
        ),
    ]


@router.get("/{test_id}", response_model=TestDetail)
async def get_test_detail(test_id: str) -> TestDetail:
    return TestDetail(
        id=uuid4(),
        title=f"Test {test_id}",
        type="reading",
        access_type="public",
        status="published",
        source="custom",
        source_detail="PrimeScore Editorial",
        version=1,
        exam_time_limit_seconds=3600,
        total_questions=40,
        sections=[
            QuestionGroupSummary(
                id=uuid4(),
                section_title="Passage 1",
                question_type="reading_true_false_not_given",
                question_start=1,
                question_end=5,
            )
        ],
    )


@router.post("/{test_id}/start", response_model=AttemptStartResponse)
async def start_test(test_id: str, payload: AttemptStartRequest) -> AttemptStartResponse:
    started_at = datetime.now(UTC)
    time_limit_seconds = 3600 if payload.mode == "exam" else 0
    if payload.test_type == "listening" and payload.mode == "exam":
        time_limit_seconds = payload.audio_duration_seconds + 120

    return AttemptStartResponse(
        attempt_id=uuid4(),
        started_at=started_at,
        mode=payload.mode,
        scope=payload.scope,
        time_limit_seconds=time_limit_seconds,
        snapshot_version=1,
        detail=f"Started {payload.test_type} attempt for test {test_id}.",
    )

