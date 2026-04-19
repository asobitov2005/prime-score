from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.enums import AccessType, TestMode, TestScope, TestStatus, TestType
from app.db.session import get_db_session
from app.schemas.common import DebugPrincipal, MessageResponse
from app.schemas.tests import TestCatalogItemRead, TestDetailRead, TestSnapshotRead, TestStartRequest, TestStartResponse
from app.services.fixtures import build_test_snapshot, get_test_catalog, get_test_fixture
from app.services.attempt_repo import start_attempt_in_db
from app.services.runtime_store import start_attempt
from app.services.test_content_repo import build_test_snapshot_from_db, get_test_from_db, list_tests_from_db

router = APIRouter()


@router.get("", response_model=list[TestCatalogItemRead])
async def list_tests(
    test_type: TestType | None = Query(default=None, alias="type"),
    access_type: AccessType | None = Query(default=None),
    status_filter: TestStatus | None = Query(default=None, alias="status"),
    test_format: str | None = Query(default=None, alias="format"),
    source: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> list[TestCatalogItemRead]:
    try:
        raw_items = await list_tests_from_db(
            session,
            test_type=test_type,
            access_type=access_type,
            status_filter=status_filter,
            test_format=test_format,
            source=source,
        )
    except Exception as e:
        import logging
        logging.error(f"Error in list_tests_from_db: {e}")
        try:
            await session.rollback()
        except Exception:
            pass
        raw_items = get_test_catalog(test_type=test_type, access_type=access_type, status=status_filter)
        if test_format and test_format != "all":
            raw_items = [item for item in raw_items if item.get("format") == test_format]
        if source and source != "":
            raw_items = [item for item in raw_items if item.get("source") == source]

    items = [TestCatalogItemRead(**item) for item in raw_items]
    return items


@router.get("/{test_id}", response_model=TestDetailRead)
async def get_test(test_id: UUID, session: AsyncSession = Depends(get_db_session)) -> TestDetailRead:
    snapshot: dict[str, object] | None = None
    fixture: dict[str, object] | None = None
    try:
        fixture = await get_test_from_db(session, test_id)
        snapshot = await build_test_snapshot_from_db(
            session,
            test_id=test_id,
            scope=TestScope.full,
            mode=TestMode.practice,
        )
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass

    if fixture is None:
        fixture = get_test_fixture(test_id)
        if fixture is not None:
            snapshot = build_test_snapshot(test_id=test_id, scope=TestScope.full, mode=TestMode.practice.value)

    if fixture is None or snapshot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")

    return TestDetailRead(
        **fixture,
        payment_paused=bool(snapshot["payment_paused"]),
        question_bank_enabled=bool(snapshot["question_bank_enabled"]),
        sections=snapshot["sections"],
    )


@router.post("/{test_id}/start", response_model=TestStartResponse)
async def start_test(
    test_id: UUID,
    payload: TestStartRequest,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> TestStartResponse:
    try:
        try:
            attempt = await start_attempt_in_db(
                session,
                principal=current_user,
                test_id=test_id,
                scope=payload.scope,
                section_id=payload.section_id,
                mode=payload.mode,
            )
        except Exception:
            try:
                await session.rollback()
            except Exception:
                pass
            attempt = start_attempt(
                user_id=current_user.id,
                test_id=test_id,
                scope=payload.scope,
                section_id=payload.section_id,
                mode=payload.mode,
            )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.") from exc

    snapshot = TestSnapshotRead(**attempt.test_snapshot)
    return TestStartResponse(
        attempt_id=attempt.attempt_id,
        time_limit_seconds=int(attempt.test_snapshot["time_limit_seconds"]),
        test_snapshot=snapshot,
    )
