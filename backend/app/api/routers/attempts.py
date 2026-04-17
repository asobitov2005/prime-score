from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter

from app.schemas.attempt import (
    AttemptAnswerPayload,
    AttemptResult,
    AttemptReview,
)


router = APIRouter()


@router.get("/{attempt_id}")
async def get_attempt(attempt_id: str) -> dict[str, str]:
    return {"attempt_id": attempt_id, "status": "in_progress"}


@router.patch("/{attempt_id}/answer")
async def save_answer(attempt_id: str, payload: AttemptAnswerPayload) -> dict[str, str]:
    return {
        "attempt_id": attempt_id,
        "question_id": str(payload.question_id),
        "detail": "Answer saved.",
    }


@router.post("/{attempt_id}/submit")
async def submit_attempt(attempt_id: str) -> dict[str, str]:
    return {"attempt_id": attempt_id, "detail": "Scoring queued."}


@router.get("/{attempt_id}/result", response_model=AttemptResult)
async def get_attempt_result(attempt_id: str) -> AttemptResult:
    return AttemptResult(
        attempt_id=uuid4(),
        submitted_at=datetime.now(UTC),
        raw_score=31,
        max_score=40,
        band_score=7.0,
        section_breakdown=[
            {"title": "Passage 1", "correct": 11, "total": 13},
            {"title": "Passage 2", "correct": 10, "total": 13},
            {"title": "Passage 3", "correct": 10, "total": 14},
        ],
    )


@router.get("/{attempt_id}/review", response_model=AttemptReview)
async def get_attempt_review(attempt_id: str) -> AttemptReview:
    return AttemptReview(
        attempt_id=uuid4(),
        answers=[
            {
                "question_number": 1,
                "user_answer": "TRUE",
                "correct_answer": "FALSE",
                "is_correct": False,
                "explanation_available": True,
            }
        ],
    )

