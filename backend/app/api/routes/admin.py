from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin, get_current_super_admin
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.enums import TestStatus
from app.db.session import get_db_session
from app.schemas.admin import (
    AdminAuditLogRead,
    AdminContentCreateRequest,
    AdminTestDraftUpsertRequest,
    AdminTestDraftRead,
    AdminDashboardRead,
    AdminPlanRead,
    AdminPromoCodeRead,
    AdminTestRead,
    AdminTestUpsertRequest,
    AdminUploadUrlRequest,
    AdminUploadUrlResponse,
    AdminUserRead,
    CreatedEntityResponse,
)
from app.schemas.auth import AdminAuthLoginRequest, AdminAuthRefreshRequest, AdminAuthResponse
from app.schemas.common import AdminPrincipal, MessageResponse
from app.services.admin_auth import authenticate_admin, build_admin_principal, get_admin_by_id
from app.services.test_content_repo import (
    build_admin_draft_state_from_db,
    get_test_from_db,
    list_tests_from_db,
    publish_test_in_db,
    save_test_draft_to_db,
)

router = APIRouter()


def _build_admin_token_claims(admin: AdminPrincipal) -> dict[str, str]:
    return {
        "scope": "admin",
        "role": admin.role.value,
    }


@router.post("/auth/login", response_model=AdminAuthResponse)
async def login_admin(
    payload: AdminAuthLoginRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AdminAuthResponse:
    admin = await authenticate_admin(session, payload.login, payload.password)
    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials.")

    principal = build_admin_principal(admin)
    claims = _build_admin_token_claims(principal)
    return AdminAuthResponse(
        admin=principal,
        access_token=create_access_token(str(principal.id), extra_claims=claims),
        refresh_token=create_refresh_token(str(principal.id), extra_claims=claims),
    )


@router.post("/auth/refresh", response_model=AdminAuthResponse)
async def refresh_admin_session(
    payload: AdminAuthRefreshRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AdminAuthResponse:
    try:
        token_payload = decode_token(payload.refresh_token, refresh=True)
        admin_id = UUID(str(token_payload["sub"]))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin refresh token.") from exc

    if token_payload.get("scope") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token scope.")

    admin = await get_admin_by_id(session, admin_id)
    if admin is None or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account is not available.")

    principal = build_admin_principal(admin)
    claims = _build_admin_token_claims(principal)
    return AdminAuthResponse(
        admin=principal,
        access_token=create_access_token(str(principal.id), extra_claims=claims),
        refresh_token=create_refresh_token(str(principal.id), extra_claims=claims),
    )


@router.get("/auth/me", response_model=AdminPrincipal)
async def read_current_admin(current_admin: AdminPrincipal = Depends(get_current_admin)) -> AdminPrincipal:
    return current_admin


@router.get("/dashboard", response_model=AdminDashboardRead)
async def dashboard(current_admin: AdminPrincipal = Depends(get_current_admin)) -> AdminDashboardRead:
    _ = current_admin
    return AdminDashboardRead(
        users_total=0,
        premium_users=0,
        tests_total=0,
        tests_published=0,
        tests_draft=0,
        tests_archived=0,
        attempts_total=0,
        attempts_completed=0,
        payments_pending=0,
    )


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
    return AdminTestRead(id=uuid4(), **payload.model_dump())


@router.post("/tests/draft", response_model=AdminTestRead, status_code=201)
async def create_test_draft(
    payload: AdminTestDraftUpsertRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminTestRead:
    _ = current_admin
    try:
        saved = await save_test_draft_to_db(session, draft=payload.model_dump())
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
    return AdminTestRead(id=test_id, **payload.model_dump(), status=TestStatus.draft, version=2)


@router.put("/tests/{test_id}/draft", response_model=AdminTestRead)
async def update_test_draft(
    test_id: UUID,
    payload: AdminTestDraftUpsertRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminTestRead:
    _ = current_admin
    try:
        saved = await save_test_draft_to_db(session, draft=payload.model_dump(), test_id=test_id)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft update failed.") from exc
    return AdminTestRead(**saved)


@router.delete("/tests/{test_id}", response_model=MessageResponse)
async def delete_test(test_id: UUID, current_admin: AdminPrincipal = Depends(get_current_admin)) -> MessageResponse:
    _ = (test_id, current_admin)
    return MessageResponse(message="Test archived.")


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


@router.post("/tests/{test_id}/archive", response_model=MessageResponse)
async def archive_test(test_id: UUID, current_admin: AdminPrincipal = Depends(get_current_admin)) -> MessageResponse:
    _ = (test_id, current_admin)
    return MessageResponse(message="Test archived.")


@router.post("/tests/{test_id}/duplicate", response_model=AdminTestRead)
async def duplicate_test(
    test_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminTestRead:
    _ = (test_id, current_admin)
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Duplicate endpoint is not implemented.")


@router.post("/sections", response_model=CreatedEntityResponse, status_code=201)
async def create_section(
    payload: AdminContentCreateRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> CreatedEntityResponse:
    _ = current_admin
    return CreatedEntityResponse(resource="sections", id=uuid4(), payload=payload.payload)


@router.post("/passages", response_model=CreatedEntityResponse, status_code=201)
async def create_passage(
    payload: AdminContentCreateRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> CreatedEntityResponse:
    _ = current_admin
    return CreatedEntityResponse(resource="passages", id=uuid4(), payload=payload.payload)


@router.post("/paragraphs", response_model=CreatedEntityResponse, status_code=201)
async def create_paragraph(
    payload: AdminContentCreateRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> CreatedEntityResponse:
    _ = current_admin
    return CreatedEntityResponse(resource="paragraphs", id=uuid4(), payload=payload.payload)


@router.post("/question-groups", response_model=CreatedEntityResponse, status_code=201)
async def create_question_group(
    payload: AdminContentCreateRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> CreatedEntityResponse:
    _ = current_admin
    return CreatedEntityResponse(resource="question-groups", id=uuid4(), payload=payload.payload)


@router.post("/questions", response_model=CreatedEntityResponse, status_code=201)
async def create_question(
    payload: AdminContentCreateRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> CreatedEntityResponse:
    _ = current_admin
    return CreatedEntityResponse(resource="questions", id=uuid4(), payload=payload.payload)


@router.post("/answers", response_model=CreatedEntityResponse, status_code=201)
async def create_answer(
    payload: AdminContentCreateRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> CreatedEntityResponse:
    _ = current_admin
    return CreatedEntityResponse(resource="answers", id=uuid4(), payload=payload.payload)


@router.post("/audio/upload-url", response_model=AdminUploadUrlResponse)
async def create_audio_upload_url(
    payload: AdminUploadUrlRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> AdminUploadUrlResponse:
    _ = (payload, current_admin)
    return AdminUploadUrlResponse(
        upload_url="https://storage.example.invalid/upload/audio",
        public_url="https://storage.example.invalid/audio/example.mp3",
        fields={"filename": payload.filename, "content_type": payload.content_type},
    )


@router.post("/images/upload-url", response_model=AdminUploadUrlResponse)
async def create_image_upload_url(
    payload: AdminUploadUrlRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> AdminUploadUrlResponse:
    _ = (payload, current_admin)
    return AdminUploadUrlResponse(
        upload_url="https://storage.example.invalid/upload/image",
        public_url="https://storage.example.invalid/image/example.png",
        fields={"filename": payload.filename, "content_type": payload.content_type},
    )


@router.get("/users", response_model=list[AdminUserRead])
async def list_users(current_admin: AdminPrincipal = Depends(get_current_admin)) -> list[AdminUserRead]:
    _ = current_admin
    return []


@router.get("/users/{user_id}", response_model=AdminUserRead)
async def get_user(user_id: UUID, current_admin: AdminPrincipal = Depends(get_current_admin)) -> AdminUserRead:
    _ = current_admin
    return AdminUserRead(
        id=user_id,
        telegram_id=0,
        first_name="Unknown",
        last_name=None,
        username=None,
    )


@router.patch("/users/{user_id}", response_model=AdminUserRead)
async def update_user(
    user_id: UUID,
    payload: AdminContentCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminUserRead:
    _ = (payload, current_admin)
    return AdminUserRead(
        id=user_id,
        telegram_id=0,
        first_name="Unknown",
        last_name=None,
        username=None,
    )


@router.get("/plans", response_model=list[AdminPlanRead])
async def list_plans(current_admin: AdminPrincipal = Depends(get_current_admin)) -> list[AdminPlanRead]:
    _ = current_admin
    return []


@router.post("/plans", response_model=AdminPlanRead, status_code=201)
async def create_plan(
    payload: AdminContentCreateRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> AdminPlanRead:
    _ = current_admin
    data = payload.payload
    return AdminPlanRead(
        id=uuid4(),
        name=str(data.get("name", "Premium Plan")),
        duration_days=int(data.get("duration_days", 30)),
        price=data.get("price", 0),
    )


@router.get("/promo-codes", response_model=list[AdminPromoCodeRead])
async def list_promo_codes(current_admin: AdminPrincipal = Depends(get_current_admin)) -> list[AdminPromoCodeRead]:
    _ = current_admin
    return []


@router.post("/promo-codes", response_model=AdminPromoCodeRead, status_code=201)
async def create_promo_code(
    payload: AdminContentCreateRequest, current_admin: AdminPrincipal = Depends(get_current_admin)
) -> AdminPromoCodeRead:
    _ = current_admin
    data = payload.payload
    return AdminPromoCodeRead(
        id=uuid4(),
        code=str(data.get("code", "PROMO10")),
        discount_percent=int(data.get("discount_percent", 10)),
    )


@router.get("/admins", response_model=list[AdminUserRead])
async def list_admins(current_admin: AdminPrincipal = Depends(get_current_super_admin)) -> list[AdminUserRead]:
    _ = current_admin
    return []


@router.post("/admins", response_model=AdminUserRead, status_code=201)
async def create_admin(
    payload: AdminContentCreateRequest, current_admin: AdminPrincipal = Depends(get_current_super_admin)
) -> AdminUserRead:
    _ = current_admin
    data = payload.payload
    return AdminUserRead(
        id=uuid4(),
        telegram_id=int(data.get("telegram_id", 0)),
        first_name=str(data.get("first_name", "Admin")),
        last_name=None,
        username=str(data.get("username", "admin")),
    )


@router.get("/audit-log", response_model=list[AdminAuditLogRead])
async def audit_log(current_admin: AdminPrincipal = Depends(get_current_admin)) -> list[AdminAuditLogRead]:
    _ = current_admin
    return []
