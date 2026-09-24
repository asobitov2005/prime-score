from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.mock import OnlineFullMock
from app.schemas.common import DebugPrincipal
from app.schemas.online_mocks import OnlineMockDetail, OnlineMockList
from app.services.online_mocks import bundle_card, bundle_detail, public_bundle_query

router = APIRouter()


@router.get("/online-mocks", response_model=OnlineMockList)
async def list_online_mocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> OnlineMockList:
    query = public_bundle_query()
    total = int(await session.scalar(select(func.count()).select_from(query.subquery())) or 0)
    bundles = (await session.execute(
        query.order_by(OnlineFullMock.created_at.desc(), OnlineFullMock.id)
        .offset((page - 1) * page_size).limit(page_size)
    )).all()
    return OnlineMockList(
        items=[bundle_card(bundle) for bundle in bundles],
        total=total, page=page, page_size=page_size,
    )


@router.get("/online-mocks/{bundle_id}", response_model=OnlineMockDetail)
async def get_online_mock(
    bundle_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> OnlineMockDetail:
    row = (await session.execute(
        public_bundle_query().where(OnlineFullMock.id == bundle_id)
    )).first()
    if row is None:
        raise HTTPException(404, "Full Mock was not found or its components are unavailable.")
    # This is a hub, not an attempt/submission endpoint. Existing runtime gates still apply.
    return bundle_detail(row)
