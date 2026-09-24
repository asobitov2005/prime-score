from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.admin_common import _write_audit_log
from app.core.deps import get_current_admin
from app.db.session import get_db_session
from app.models.mock import OnlineFullMock
from app.schemas.common import AdminPrincipal
from app.schemas.online_mocks import (
    OnlineMockAdminList, OnlineMockAdminRead, OnlineMockCreate, OnlineMockPatch,
)
from app.services.online_mocks import COMPONENTS, validate_components

router = APIRouter()


async def _get_bundle(session: AsyncSession, bundle_id: UUID, *, lock: bool = False):
    query = select(OnlineFullMock).where(
        OnlineFullMock.id == bundle_id, OnlineFullMock.archived_at.is_(None),
    )
    bundle = await session.scalar(query.with_for_update() if lock else query)
    if bundle is None:
        raise HTTPException(404, "Full Mock was not found.")
    return bundle


async def _audit(session, admin, action, bundle):
    await _write_audit_log(
        session, admin_id=admin.id, action=action, target_type="online_full_mock",
        target_id=bundle.id,
        changes=OnlineMockAdminRead.model_validate(bundle).model_dump(mode="json"),
    )


@router.get("/mock/online-mocks", response_model=OnlineMockAdminList)
async def list_admin_online_mocks(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> OnlineMockAdminList:
    query = select(OnlineFullMock).where(OnlineFullMock.archived_at.is_(None))
    total = int(await session.scalar(select(func.count()).select_from(query.subquery())) or 0)
    bundles = (await session.scalars(
        query.order_by(OnlineFullMock.created_at.desc(), OnlineFullMock.id)
        .offset((page - 1) * page_size).limit(page_size)
    )).all()
    return OnlineMockAdminList(
        items=[OnlineMockAdminRead.model_validate(item) for item in bundles],
        total=total, page=page, page_size=page_size,
    )


@router.get("/mock/online-mocks/{bundle_id}", response_model=OnlineMockAdminRead)
async def get_admin_online_mock(
    bundle_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> OnlineMockAdminRead:
    return OnlineMockAdminRead.model_validate(await _get_bundle(session, bundle_id))


@router.post("/mock/online-mocks", response_model=OnlineMockAdminRead, status_code=201)
async def create_admin_online_mock(
    payload: OnlineMockCreate,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> OnlineMockAdminRead:
    values = payload.model_dump()
    await validate_components(session, values)
    bundle = OnlineFullMock(**values, module="academic")
    session.add(bundle)
    await session.flush()
    await _audit(session, current_admin, "mock.bundle.create", bundle)
    await session.commit()
    await session.refresh(bundle)
    return OnlineMockAdminRead.model_validate(bundle)


@router.patch("/mock/online-mocks/{bundle_id}", response_model=OnlineMockAdminRead)
async def update_admin_online_mock(
    bundle_id: UUID,
    payload: OnlineMockPatch,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> OnlineMockAdminRead:
    bundle = await _get_bundle(session, bundle_id, lock=True)
    changes = payload.model_dump(exclude_unset=True)
    values = {name: getattr(bundle, name) for name in OnlineMockCreate.model_fields}
    # Changing components invalidates a prior manual Academic attestation.
    if any(name in changes and changes[name] != values[name] for name, _, _ in COMPONENTS):
        values["academic_confirmed"] = False
    values.update(changes)
    # Withdrawal must stay possible even when linked content became ineligible.
    if changes != {"is_published": False}:
        await validate_components(session, values)
    for name, value in values.items():
        setattr(bundle, name, value)
    await _audit(session, current_admin, "mock.bundle.update", bundle)
    await session.commit()
    await session.refresh(bundle)
    return OnlineMockAdminRead.model_validate(bundle)


@router.delete("/mock/online-mocks/{bundle_id}", status_code=204)
async def archive_admin_online_mock(
    bundle_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    bundle = await _get_bundle(session, bundle_id, lock=True)
    bundle.is_published = False
    bundle.archived_at = datetime.now(UTC)
    await _audit(session, current_admin, "mock.bundle.archive", bundle)
    await session.commit()
    return Response(status_code=204)
