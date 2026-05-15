from __future__ import annotations

import re
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
from app.services.test_content_repo import build_test_snapshot_from_db, get_test_by_identifier_from_db, get_test_from_db, list_tests_from_db

router = APIRouter()

_SECTION_FORMAT_RE = re.compile(r"^(?:passage|part)_(\d+)$", re.IGNORECASE)


def _extract_section_number_from_format(test_format: str | None) -> int | None:
    if not test_format:
        return None
    match = _SECTION_FORMAT_RE.match(test_format)
    if not match:
        return None
    try:
        return int(match.group(1))
    except (TypeError, ValueError):
        return None


def _resolve_section_id_from_snapshot(snapshot: dict[str, object] | None, test_format: str | None) -> UUID | None:
    if not snapshot:
        return None

    raw_sections = snapshot.get("sections")
    if not isinstance(raw_sections, list) or not raw_sections:
        return None

    target_section_number = _extract_section_number_from_format(test_format)
    if target_section_number is not None:
        for section in raw_sections:
            if not isinstance(section, dict):
                continue
            try:
                if int(section.get("section_number") or 0) == target_section_number:
                    return UUID(str(section["section_id"]))
            except (KeyError, TypeError, ValueError):
                continue

    first_section = raw_sections[0]
    if not isinstance(first_section, dict):
        return None
    try:
        return UUID(str(first_section["section_id"]))
    except (KeyError, TypeError, ValueError):
        return None


async def _build_effective_snapshot(
    session: AsyncSession,
    *,
    test_id: UUID,
    test_format: str | None,
    mode: TestMode,
) -> tuple[dict[str, object] | None, TestScope, UUID | None]:
    snapshot = await build_test_snapshot_from_db(
        session,
        test_id=test_id,
        scope=TestScope.full,
        mode=mode,
    )
    if snapshot is None:
        snapshot = build_test_snapshot(test_id=test_id, scope=TestScope.full, mode=mode.value)

    if not test_format or test_format == "full":
        return snapshot, TestScope.full, None

    section_id = _resolve_section_id_from_snapshot(snapshot, test_format)
    if section_id is None:
        return snapshot, TestScope.full, None

    section_snapshot = await build_test_snapshot_from_db(
        session,
        test_id=test_id,
        scope=TestScope.section,
        mode=TestMode.practice,
        section_id=section_id,
    )
    if section_snapshot is None:
        section_snapshot = build_test_snapshot(
            test_id=test_id,
            scope=TestScope.section,
            mode=TestMode.practice.value,
            section_id=section_id,
        )

    return section_snapshot or snapshot, TestScope.section, section_id


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
        if test_type == TestType.listening:
            return []
        raw_items = get_test_catalog(test_type=test_type, access_type=access_type, status=status_filter)
        if test_format and test_format != "all":
            raw_items = [item for item in raw_items if item.get("format") == test_format]
        if source and source != "":
            raw_items = [item for item in raw_items if item.get("source") == source]

    items = [TestCatalogItemRead(**item) for item in raw_items]
    return items


@router.get("/{test_identifier}", response_model=TestDetailRead)
async def get_test(test_identifier: str, session: AsyncSession = Depends(get_db_session)) -> TestDetailRead:
    snapshot: dict[str, object] | None = None
    fixture: dict[str, object] | None = None
    resolved_test_id: UUID | None = None
    try:
        fixture = await get_test_by_identifier_from_db(session, test_identifier)
        resolved_test_id = UUID(str(fixture["id"])) if fixture else None
        if resolved_test_id is not None:
            snapshot, _, _ = await _build_effective_snapshot(
                session,
                test_id=resolved_test_id,
                test_format=str(fixture.get("format") or "full") if fixture else "full",
                mode=TestMode.practice,
            )
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass

    try:
        fixture_test_id = UUID(test_identifier)
    except ValueError:
        fixture_test_id = None

    if fixture is None and fixture_test_id is not None and fixture_test_id != UUID("22222222-2222-2222-2222-222222222222"):
        fixture = get_test_fixture(fixture_test_id)
        if fixture is not None:
            snapshot, _, _ = await _build_effective_snapshot(
                session,
                test_id=fixture_test_id,
                test_format=str(fixture.get("format") or "full"),
                mode=TestMode.practice,
            )

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
    effective_scope = payload.scope
    effective_section_id = payload.section_id
    effective_mode = payload.mode

    if payload.scope == TestScope.full:
        test_detail = await get_test_from_db(session, test_id)
        test_format = str(test_detail.get("format") or "full") if test_detail else None
        if test_format and test_format != "full":
            _, resolved_scope, resolved_section_id = await _build_effective_snapshot(
                session,
                test_id=test_id,
                test_format=test_format,
                mode=payload.mode,
            )
            effective_scope = resolved_scope
            effective_section_id = resolved_section_id
            effective_mode = TestMode.practice

    try:
        try:
            attempt = await start_attempt_in_db(
                session,
                principal=current_user,
                test_id=test_id,
                scope=effective_scope,
                section_id=effective_section_id,
                mode=effective_mode,
                force_new=payload.force_new,
            )
        except Exception:
            try:
                await session.rollback()
            except Exception:
                pass
            attempt = start_attempt(
                user_id=current_user.id,
                test_id=test_id,
                scope=effective_scope,
                section_id=effective_section_id,
                mode=effective_mode,
            )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.") from exc

    snapshot = TestSnapshotRead(**attempt.test_snapshot)
    return TestStartResponse(
        attempt_id=attempt.attempt_id,
        time_limit_seconds=int(attempt.test_snapshot["time_limit_seconds"]),
        test_snapshot=snapshot,
    )
