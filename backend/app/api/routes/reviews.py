from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.review import Review
from app.models.enums import ReviewSource as ModelReviewSource
from app.schemas.common import DebugPrincipal
from app.schemas.review import LandingLiveStatsRead, PublicReviewCreateRequest, PublicReviewRead, ReviewSubmissionResponse
from app.services.live_metrics import landing_live_metrics_service
from app.services.attempt_repo import ensure_debug_user

router = APIRouter()


def _resolve_author_name(first_name: str | None, last_name: str | None) -> str:
    parts = [part.strip() for part in (first_name, last_name) if part and part.strip()]
    if parts:
        return " ".join(parts)
    return "PrimeScore Student"


@router.get("", response_model=list[PublicReviewRead])
async def list_public_reviews(session: AsyncSession = Depends(get_db_session)) -> list[PublicReviewRead]:
    reviews = list(
        (
            await session.scalars(
                select(Review)
                .where(Review.is_visible == True)
                .order_by(Review.created_at.desc())
            )
        ).all()
    )
    return [
        PublicReviewRead(
            id=review.id,
            name=review.author_name,
            band=review.band_label,
            text=review.body,
            created_at=review.created_at,
        )
        for review in reviews
    ]


@router.get("/live-stats", response_model=LandingLiveStatsRead)
async def get_landing_live_stats() -> LandingLiveStatsRead:
    snapshot = landing_live_metrics_service.get_snapshot()
    return LandingLiveStatsRead(
        online_count=snapshot.online_count,
        refreshed_at=snapshot.refreshed_at,
    )


@router.post("", response_model=ReviewSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_public_review(
    payload: PublicReviewCreateRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ReviewSubmissionResponse:
    try:
        user = await ensure_debug_user(session, current_user)
        review = Review(
            user_id=user.id,
            source=ModelReviewSource.USER,
            author_name=_resolve_author_name(user.first_name, user.last_name),
            band_label=payload.band.strip(),
            body=payload.text.strip(),
            is_visible=False,
        )
        session.add(review)
        await session.commit()
        await session.refresh(review)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit review.",
        ) from exc

    return ReviewSubmissionResponse(
        id=review.id,
        is_visible=review.is_visible,
        message="Review submitted and waiting for moderation.",
    )
