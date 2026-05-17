from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.common import AdminPrincipal
from app.services.xp import TX_ADJUSTMENT, create_xp_transaction

router = APIRouter()


class AdminXpAdjustmentRequest(BaseModel):
    user_id: UUID
    xp_amount: int = Field(ge=-100_000, le=100_000)
    reason: str = Field(min_length=3, max_length=500)


class AdminXpAdjustmentResponse(BaseModel):
    transaction_id: UUID
    user_id: UUID
    xp_amount: int
    total_xp: int
    level: int
    message: str


@router.post("/xp/adjustments", response_model=AdminXpAdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_xp_adjustment(
    payload: AdminXpAdjustmentRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminXpAdjustmentResponse:
    user = await session.get(User, payload.user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")

    transaction = await create_xp_transaction(
        session,
        user_id=user.id,
        transaction_type=TX_ADJUSTMENT,
        amount=payload.xp_amount,
        source_type="admin_adjustment",
        source_id=None,
        metadata={
            "reason": payload.reason,
            "admin_id": str(current_admin.id),
            "cap_exempt": True,
            "counts_toward_leaderboard": True,
        },
    )
    await session.commit()
    await session.refresh(user)

    metadata = transaction.metadata_json or {}
    return AdminXpAdjustmentResponse(
        transaction_id=transaction.id,
        user_id=user.id,
        xp_amount=int(transaction.xp_amount or 0),
        total_xp=int(user.total_xp or 0),
        level=int(user.current_level or 1),
        message=str(metadata.get("message") or f"{int(transaction.xp_amount or 0):+d} XP adjustment"),
    )
