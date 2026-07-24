from __future__ import annotations

# Generated from the former monolithic admin router. Keep imports centralized
# while domain modules are gradually tightened to explicit dependencies.
# ruff: noqa: F401,F403,F405
from app.api.routes.admin_dependencies import *
from app.api.routes.admin_contracts import *
from app.api.routes.admin_common import *
from app.api.routes.admin_commerce_support import *
from app.api.routes.admin_auth_support import *
from app.api.routes.admin_user_support import *

router = APIRouter()

@router.get("/tests", response_model=list[AdminTestRead])
async def list_tests(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminTestRead]:
    _ = current_admin
    try:
        items = await list_tests_from_db(session)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load test catalog.") from exc
    return [AdminTestRead(**item) for item in items]

@router.post("/tests", response_model=AdminTestRead, status_code=201)
async def create_test(
    payload: AdminTestUpsertRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> AdminTestRead:
    _ = current_admin
    return AdminTestRead(id=uuid4(), **payload.model_dump(), review_status="needs_review")

@router.patch("/tests/bulk-status", response_model=MessageResponse)
async def bulk_update_test_status(
    payload: BulkStatusRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    if payload.access_type not in ("public", "premium"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="access_type must be 'public' or 'premium'.")
    try:
        model_access = ModelAccessType(payload.access_type)
        for test_id in payload.ids:
            test = await session.get(Test, test_id)
            if test is not None:
                test.access_type = model_access
        await session.commit()
        return MessageResponse(message=f"Updated {len(payload.ids)} tests to {payload.access_type}.")
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Bulk update failed.") from exc

@router.patch("/tests/bulk-publish", response_model=MessageResponse)
async def bulk_publish_tests(
    payload: BulkPublishRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    if payload.status not in ("published", "draft", "archived"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="status must be 'published', 'draft', or 'archived'.")
    try:
        model_status = ModelTestStatus(payload.status)
        published_tests: list[tuple[UUID, object]] = []
        for test_id in payload.ids:
            test = await session.get(Test, test_id)
            if test is not None:
                test.status = model_status
                test.review_status = "approved" if payload.status == "published" else "needs_review"
                if model_status == ModelTestStatus.PUBLISHED:
                    published_tests.append((test.id, test.type))
        await session.commit()
        for published_test_id, published_test_type in published_tests:
            _enqueue_test_explanations(published_test_id, published_test_type)
        return MessageResponse(message=f"{len(payload.ids)} ta test {payload.status} qilindi.")
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Bulk publish failed.") from exc

@router.post("/tests/draft", response_model=AdminTestRead, status_code=201)
async def create_test_draft(
    payload: AdminTestDraftUpsertRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminTestRead:
    _ = current_admin
    try:
        saved = await save_test_draft_to_db(session, draft=payload.model_dump())
    except ValueError as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        if str(exc) == "test_guard_title_forbidden":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guard/test regression titles are not allowed in the test catalog.",
            ) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft save failed.") from exc
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft save failed.") from exc
    return AdminTestRead(**saved)

@router.get("/tests/{test_id}", response_model=AdminTestRead)
async def get_test(
    test_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminTestRead:
    _ = current_admin
    try:
        fixture = await get_test_from_db(session, test_id)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load test.") from exc
    if fixture is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")
    return AdminTestRead(**fixture)

@router.get("/tests/{test_id}/draft", response_model=AdminTestDraftRead)
async def get_test_draft(
    test_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminTestDraftRead:
    _ = current_admin
    try:
        draft = await build_admin_draft_state_from_db(session, test_id=test_id)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load draft.") from exc
    if draft is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")
    return AdminTestDraftRead(**draft)

@router.patch("/tests/{test_id}", response_model=AdminTestRead)
async def update_test(
    test_id: UUID,
    payload: AdminTestUpsertRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminTestRead:
    _ = current_admin
    return AdminTestRead(id=test_id, **payload.model_dump(), status=TestStatus.draft, review_status="needs_review", version=2)

@router.put("/tests/{test_id}/draft", response_model=AdminTestRead)
async def update_test_draft(
    test_id: UUID,
    payload: AdminTestDraftUpsertRequest,
    allow_new_version: bool = Query(default=False),
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminTestRead:
    _ = current_admin
    try:
        saved = await save_test_draft_to_db(
            session,
            draft=payload.model_dump(),
            test_id=test_id,
            allow_new_version=allow_new_version,
        )
    except ValueError as exc:
        if str(exc) == "new_version_required":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Published tests require Quick Fix or explicit New Version.",
            ) from exc
        if str(exc) == "test_guard_title_forbidden":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guard/test regression titles are not allowed in the test catalog.",
            ) from exc
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft update failed.") from exc
    return AdminTestRead(**saved)

@router.put("/tests/{test_id}/quick-fix", response_model=AdminTestRead)
async def quick_fix_test(
    test_id: UUID,
    payload: AdminTestDraftUpsertRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminTestRead:
    _ = current_admin
    try:
        saved = await quick_fix_published_test_in_db(session, draft=payload.model_dump(), test_id=test_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "only_published_can_be_quick_fixed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quick Fix only works on published tests.",
            ) from exc
        if detail == "quick_fix_requires_new_version":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quick Fix supports only in-place edits. Use New Version for structural changes.",
            ) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quick Fix failed.") from exc
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quick Fix failed.") from exc

    if saved is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")
    _enqueue_test_explanations(test_id, saved.get("type"))
    return AdminTestRead(**saved)

@router.delete("/tests/{test_id}", response_model=MessageResponse)
async def delete_test(
    test_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    try:
        result = await delete_draft_test_from_db(session, test_id=test_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "only_draft_can_be_deleted":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft tests can be deleted.") from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft delete failed.") from exc
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Draft delete failed.") from exc

    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")

    if result == "archived":
        return MessageResponse(message="Draft had attempt history, so it was archived instead of being deleted.")

    return MessageResponse(message="Draft deleted.")

@router.post("/tests/{test_id}/publish", response_model=AdminTestRead)
async def publish_test(
    test_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminTestRead:
    _ = current_admin
    try:
        saved = await publish_test_in_db(session, test_id=test_id)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Publish failed.") from exc
    if saved is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")
    return AdminTestRead(**saved)
