from __future__ import annotations

import re
import secrets
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin, get_current_super_admin
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.enums import AccessType, PaymentMethod, TestStatus
from app.db.session import get_db_session
from app.models.commerce import GiftCode, GiftCodeRedemption, Payment, PaymentCard, PaymentSetting, Plan
from app.models.attempt import Attempt
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.enums import AttemptStatus as ModelAttemptStatusEnum
from app.models.enums import AccessType as ModelAccessType
from app.models.enums import PaymentStatus as ModelPaymentStatus
from app.models.enums import TestStatus as ModelTestStatus
from app.models.test import Test
from app.models.user import User
from app.models.ops import Notification
from app.models.review import Review
from app.core.enums import NotificationType
from app.core.enums import ReviewSource
from app.models.enums import ReviewSource as ModelReviewSource
from app.schemas.admin import (
    AdminAuditLogRead,
    AdminContentCreateRequest,
    AdminTestDraftUpsertRequest,
    AdminTestDraftRead,
    AdminDashboardRead,
    AdminGiftCodeCreateRequest,
    AdminGiftCodeCreateResponse,
    AdminGiftCodeRead,
    AdminGiftCodeUpdateRequest,
    AdminPlanRead,
    AdminPlanUpsertRequest,
    AdminPromoCodeRead,
    AdminTestRead,
    AdminTestUpsertRequest,
    AdminUploadUrlRequest,
    AdminUploadUrlResponse,
    AdminUploadedAssetResponse,
    AdminUserRead,
    CreatedEntityResponse,
)
from app.schemas.auth import AdminAuthLoginRequest, AdminAuthRefreshRequest, AdminAuthResponse
from app.schemas.common import AdminPrincipal, MessageResponse
from app.schemas.payments import (
    AdminPaymentRead,
    AdminPaymentUpdateRequest,
    PaymentCardCreateRequest,
    PaymentCardRead,
    PaymentCardUpdateRequest,
    PaymentSettingsRead,
    PaymentSettingsUpdateRequest,
)
from app.schemas.review import (
    AdminReviewCreateRequest,
    AdminReviewRead,
    AdminReviewVisibilityRequest,
)
from app.services.admin_auth import authenticate_admin, build_admin_principal, get_admin_by_id
from app.services.plan_catalog import (
    list_plans as list_catalog_plans,
)
from app.services.object_storage import upload_test_diagram_image
from app.services.payment_service import (
    complete_payment,
    expire_stale_payments,
    get_or_create_payment_settings,
    set_single_active_card,
)
from app.services.test_content_repo import (
    build_admin_draft_state_from_db,
    delete_draft_test_from_db,
    get_test_from_db,
    list_tests_from_db,
    publish_test_in_db,
    quick_fix_published_test_in_db,
    save_test_draft_to_db,
)


class BulkStatusRequest(BaseModel):
    ids: List[UUID]
    access_type: str  # "public" | "premium"


class BulkPublishRequest(BaseModel):
    ids: List[UUID]
    status: str  # "published" | "draft"


class AdminUserDetailRead(BaseModel):
    id: UUID
    telegram_id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    phone: str | None = None
    is_premium: bool = False
    premium_until: str | None = None
    show_on_leaderboard: bool = True
    last_active_at: str | None = None
    created_at: str | None = None
    attempts_total: int = 0
    attempts_completed: int = 0
    average_band: float | None = None

router = APIRouter()
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ADMIN_ACCESS_EXPIRES_DELTA = timedelta(days=7)
ADMIN_REFRESH_EXPIRES_DELTA = timedelta(days=30)
ADMIN_ACCESS_EXPIRES_IN_SECONDS = int(ADMIN_ACCESS_EXPIRES_DELTA.total_seconds())
ADMIN_REFRESH_EXPIRES_IN_SECONDS = int(ADMIN_REFRESH_EXPIRES_DELTA.total_seconds())


def _resolve_user_display_name(user: User | None) -> str | None:
    if user is None:
        return None
    parts = [part.strip() for part in [user.first_name, user.last_name] if part and part.strip()]
    return " ".join(parts) if parts else None


def _normalize_code_value(value: str | None) -> str:
    return re.sub(r"[^A-Z0-9]+", "", (value or "").upper())


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _normalize_plan_text(value: str | None, *, fallback: str | None = None) -> str | None:
    normalized = " ".join((value or "").split()).strip()
    if normalized:
        return normalized
    return fallback


def _normalize_plan_perks(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw_value in values:
        normalized = re.sub(r"^[\s\-\u2022]+", "", str(raw_value or "")).strip()
        if not normalized or normalized in seen:
            continue
        cleaned.append(normalized)
        seen.add(normalized)
    return cleaned


def _serialize_admin_plan(plan: Plan) -> AdminPlanRead:
    return AdminPlanRead(
        id=plan.id,
        catalog=str(plan.catalog or "public"),
        name=plan.name,
        duration_days=plan.duration_days,
        price=Decimal(str(plan.price_amount)),
        discount_percent=plan.discount_percent,
        currency="UZS",
        badge_label=plan.badge_label,
        perks=list(plan.perks or []),
        is_active=plan.is_active,
        display_order=plan.display_order,
        is_featured=plan.is_featured,
    )


def _serialize_payment_card(card: PaymentCard) -> PaymentCardRead:
    return PaymentCardRead(
        id=card.id,
        label=card.label,
        card_number=card.card_number,
        card_type=card.card_type,
        holder_name=card.holder_name,
        is_active=card.is_active,
        priority=card.priority,
        bot_source=card.bot_source,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


def _serialize_payment_settings(setting: PaymentSetting) -> PaymentSettingsRead:
    return PaymentSettingsRead(
        id=setting.id,
        telegram_api_id=setting.telegram_api_id,
        telegram_api_hash=setting.telegram_api_hash,
        phone_number=setting.phone_number,
        active_bot=setting.active_bot,
        support_contact=setting.support_contact,
        is_enabled=setting.is_enabled,
        poll_fallback_enabled=setting.poll_fallback_enabled,
        created_at=setting.created_at,
        updated_at=setting.updated_at,
    )


def _serialize_admin_payment(
    payment: Payment,
    *,
    user: User | None,
    plan: Plan | None,
) -> AdminPaymentRead:
    payment_method_values = {item.value for item in PaymentMethod}
    method_value = payment.provider if payment.provider in payment_method_values else PaymentMethod.card_transfer.value
    return AdminPaymentRead(
        id=payment.id,
        invoice_code=payment.invoice_code,
        user_id=payment.user_id,
        user_name=_resolve_user_display_name(user),
        user_username=user.username if user is not None else None,
        plan_id=payment.plan_id,
        plan_name=plan.name if plan is not None else str(payment.meta.get("plan_name", "Unknown plan")),
        duration_days=plan.duration_days if plan is not None else None,
        method=PaymentMethod(method_value),
        status=str(payment.status or "pending"),
        amount=Decimal(str(payment.amount)),
        base_amount=Decimal(str(payment.base_amount)),
        compare_at_amount=Decimal(str(payment.compare_at_amount)),
        discount_amount=Decimal(str(payment.discount_amount)),
        currency=payment.currency,
        card_label=payment.card_label,
        card_number=payment.card_number,
        expires_at=payment.expires_at,
        matched_at=payment.matched_at,
        paid_at=payment.paid_at,
        archived_at=payment.archived_at,
        granted_until=payment.granted_until,
        status_reason=payment.status_reason,
        detected_message_id=payment.detected_message_id,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
    )


def _derive_gift_code_status(gift_code: GiftCode, now: datetime) -> tuple[str, str]:
    raw_status = str(gift_code.status.value if hasattr(gift_code.status, "value") else gift_code.status)

    if gift_code.status == ModelPaymentStatus.COMPLETED or gift_code.used_count >= gift_code.max_uses:
        return "redeemed", raw_status
    if gift_code.status == ModelPaymentStatus.FAILED:
        return "revoked", raw_status
    if gift_code.expires_at and gift_code.expires_at < now:
        return "expired", raw_status
    if gift_code.status == ModelPaymentStatus.PAUSED:
        return "paused", raw_status
    return "available", raw_status


def _serialize_admin_gift_code(
    gift_code: GiftCode,
    *,
    plan: Plan | None,
    recipient: User | None,
    now: datetime,
) -> AdminGiftCodeRead:
    derived_status, raw_status = _derive_gift_code_status(gift_code, now)
    return AdminGiftCodeRead(
        id=gift_code.id,
        code=gift_code.code,
        plan_id=gift_code.plan_id,
        plan_name=plan.name if plan is not None else "Unknown plan",
        duration_days=plan.duration_days if plan is not None else None,
        status=derived_status,
        raw_status=raw_status,
        start_date=gift_code.starts_at,
        end_date=gift_code.expires_at,
        max_uses=gift_code.max_uses,
        used_count=gift_code.used_count,
        remaining_uses=max(0, gift_code.max_uses - gift_code.used_count),
        per_user_limit=gift_code.per_user_limit,
        target_user_type=str(gift_code.target_user_type or "all"),
        redeemed_at=gift_code.redeemed_at,
        created_at=gift_code.created_at,
        recipient_user_id=gift_code.recipient_user_id,
        recipient_name=_resolve_user_display_name(recipient),
        recipient_username=recipient.username if recipient is not None else None,
    )


async def _build_unique_gift_code(
    session: AsyncSession,
    *,
    prefix: str | None = None,
    custom_code: str | None = None,
    reserved: set[str] | None = None,
) -> str:
    reserved = reserved or set()

    if custom_code:
        candidate = custom_code
        if candidate in reserved:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Redeem code already exists in this batch.")
        exists = await session.scalar(select(GiftCode.id).where(func.upper(GiftCode.code) == candidate))
        if exists is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Redeem code already exists.")
        return candidate

    for _ in range(40):
        chunks = [
            "".join(secrets.choice(CODE_ALPHABET) for _ in range(4)),
            "".join(secrets.choice(CODE_ALPHABET) for _ in range(4)),
        ]
        candidate = "-".join(([prefix] if prefix else []) + chunks)
        if candidate in reserved:
            continue
        exists = await session.scalar(select(GiftCode.id).where(func.upper(GiftCode.code) == candidate))
        if exists is None:
            return candidate

    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate a unique redeem code.")


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
        access_token=create_access_token(
            str(principal.id),
            extra_claims=claims,
            expires_delta=ADMIN_ACCESS_EXPIRES_DELTA,
        ),
        refresh_token=create_refresh_token(
            str(principal.id),
            extra_claims=claims,
            expires_delta=ADMIN_REFRESH_EXPIRES_DELTA,
        ),
        access_expires_in_seconds=ADMIN_ACCESS_EXPIRES_IN_SECONDS,
        refresh_expires_in_seconds=ADMIN_REFRESH_EXPIRES_IN_SECONDS,
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
        access_token=create_access_token(
            str(principal.id),
            extra_claims=claims,
            expires_delta=ADMIN_ACCESS_EXPIRES_DELTA,
        ),
        refresh_token=create_refresh_token(
            str(principal.id),
            extra_claims=claims,
            expires_delta=ADMIN_REFRESH_EXPIRES_DELTA,
        ),
        access_expires_in_seconds=ADMIN_ACCESS_EXPIRES_IN_SECONDS,
        refresh_expires_in_seconds=ADMIN_REFRESH_EXPIRES_IN_SECONDS,
    )


@router.get("/auth/me", response_model=AdminPrincipal)
async def read_current_admin(current_admin: AdminPrincipal = Depends(get_current_admin)) -> AdminPrincipal:
    return current_admin


@router.get("/dashboard", response_model=AdminDashboardRead)
async def dashboard(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminDashboardRead:
    _ = current_admin
    try:
        users_total = await session.scalar(select(func.count()).select_from(User)) or 0
        premium_users = await session.scalar(
            select(func.count()).select_from(User).where(User.is_premium == True)
        ) or 0
        tests_total = await session.scalar(select(func.count()).select_from(Test)) or 0
        tests_published = await session.scalar(
            select(func.count()).select_from(Test).where(Test.status == ModelTestStatus.PUBLISHED)
        ) or 0
        tests_draft = await session.scalar(
            select(func.count()).select_from(Test).where(Test.status == ModelTestStatus.DRAFT)
        ) or 0
        tests_archived = await session.scalar(
            select(func.count()).select_from(Test).where(Test.status == ModelTestStatus.ARCHIVED)
        ) or 0
        attempts_total = await session.scalar(select(func.count()).select_from(Attempt)) or 0
        attempts_completed = await session.scalar(
            select(func.count()).select_from(Attempt).where(
                Attempt.status.in_([ModelAttemptStatus.COMPLETED, ModelAttemptStatusEnum.AUTO_SUBMITTED])
            )
        ) or 0
        avg_band_row = await session.scalar(
            select(func.avg(Attempt.band_score)).where(
                Attempt.status.in_([ModelAttemptStatus.COMPLETED, ModelAttemptStatusEnum.AUTO_SUBMITTED]),
                Attempt.band_score.isnot(None),
            )
        )
        return AdminDashboardRead(
            users_total=int(users_total),
            premium_users=int(premium_users),
            tests_total=int(tests_total),
            tests_published=int(tests_published),
            tests_draft=int(tests_draft),
            tests_archived=int(tests_archived),
            attempts_total=int(attempts_total),
            attempts_completed=int(attempts_completed),
            payments_pending=0,
            average_band=float(avg_band_row) if avg_band_row is not None else None,
        )
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
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
            average_band=None,
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
        for test_id in payload.ids:
            test = await session.get(Test, test_id)
            if test is not None:
                test.status = model_status
                test.review_status = "approved" if payload.status == "published" else "needs_review"
        await session.commit()
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


@router.post("/images/upload", response_model=AdminUploadedAssetResponse)
async def upload_image_file(
    file: UploadFile = File(...),
    current_admin: AdminPrincipal = Depends(get_current_admin),
) -> AdminUploadedAssetResponse:
    _ = current_admin
    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed.")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty.")
    if len(payload) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image size must be under 10 MB.")

    try:
        public_url = upload_test_diagram_image(
            content=payload,
            filename=file.filename or "diagram-image",
            content_type=file.content_type or "application/octet-stream",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return AdminUploadedAssetResponse(
        public_url=public_url,
        filename=file.filename or "diagram-image",
        content_type=file.content_type or "application/octet-stream",
    )


@router.get("/users", response_model=list[AdminUserDetailRead])
async def list_users(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminUserDetailRead]:
    _ = current_admin
    try:
        users = list((await session.scalars(select(User).order_by(User.created_at.desc()))).all())
        result = []
        for user in users:
            attempts_total = await session.scalar(
                select(func.count()).select_from(Attempt).where(Attempt.user_id == user.id)
            ) or 0
            attempts_completed = await session.scalar(
                select(func.count()).select_from(Attempt).where(
                    Attempt.user_id == user.id,
                    Attempt.status.in_([ModelAttemptStatus.COMPLETED, ModelAttemptStatusEnum.AUTO_SUBMITTED]),
                )
            ) or 0
            avg_band_row = await session.scalar(
                select(func.avg(Attempt.band_score)).where(
                    Attempt.user_id == user.id,
                    Attempt.status.in_([ModelAttemptStatus.COMPLETED, ModelAttemptStatusEnum.AUTO_SUBMITTED]),
                    Attempt.band_score.isnot(None),
                )
            )
            result.append(AdminUserDetailRead(
                id=user.id,
                telegram_id=user.telegram_id,
                first_name=user.first_name,
                last_name=user.last_name,
                username=user.username,
                phone=user.phone,
                is_premium=user.is_premium,
                premium_until=user.premium_until.isoformat() if user.premium_until else None,
                show_on_leaderboard=user.show_on_leaderboard,
                last_active_at=user.last_active_at.isoformat() if user.last_active_at else None,
                created_at=user.created_at.isoformat() if user.created_at else None,
                attempts_total=int(attempts_total),
                attempts_completed=int(attempts_completed),
                average_band=float(avg_band_row) if avg_band_row is not None else None,
            ))
        return result
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        return []


@router.get("/reviews", response_model=list[AdminReviewRead])
async def list_reviews(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminReviewRead]:
    _ = current_admin
    try:
        rows = (
            await session.execute(
                select(Review, User)
                .outerjoin(User, Review.user_id == User.id)
                .order_by(Review.created_at.desc())
            )
        ).all()
        return [
            AdminReviewRead(
                id=review.id,
                source=ReviewSource(review.source.value),
                author_name=review.author_name,
                band_label=review.band_label,
                text=review.body,
                is_visible=review.is_visible,
                created_at=review.created_at,
                user_id=review.user_id,
                user_display_name=_resolve_user_display_name(user),
                user_username=user.username if user is not None else None,
                created_by_admin_id=review.created_by_admin_id,
            )
            for review, user in rows
        ]
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load reviews.") from exc


@router.post("/reviews", response_model=AdminReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: AdminReviewCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminReviewRead:
    try:
        linked_user: User | None = None
        if payload.user_id is not None:
            linked_user = await session.get(User, payload.user_id)
            if linked_user is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked user not found.")

        author_name = payload.author_name.strip() if payload.author_name else ""
        if linked_user is not None and not author_name:
            author_name = _resolve_user_display_name(linked_user) or linked_user.phone

        review = Review(
            user_id=linked_user.id if linked_user is not None else None,
            created_by_admin_id=current_admin.id,
            source=ModelReviewSource.ADMIN,
            author_name=author_name,
            band_label=payload.band_label.strip(),
            body=payload.text.strip(),
            is_visible=payload.is_visible,
        )
        session.add(review)
        await session.commit()
        await session.refresh(review)
        return AdminReviewRead(
            id=review.id,
            source=ReviewSource(review.source.value),
            author_name=review.author_name,
            band_label=review.band_label,
            text=review.body,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_id=review.user_id,
            user_display_name=_resolve_user_display_name(linked_user),
            user_username=linked_user.username if linked_user is not None else None,
            created_by_admin_id=review.created_by_admin_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create review.") from exc


@router.patch("/reviews/{review_id}/visibility", response_model=AdminReviewRead)
async def update_review_visibility(
    review_id: UUID,
    payload: AdminReviewVisibilityRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminReviewRead:
    _ = current_admin
    try:
        review = await session.get(Review, review_id)
        if review is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")
        review.is_visible = payload.is_visible
        await session.commit()
        linked_user = await session.get(User, review.user_id) if review.user_id is not None else None
        return AdminReviewRead(
            id=review.id,
            source=ReviewSource(review.source.value),
            author_name=review.author_name,
            band_label=review.band_label,
            text=review.body,
            is_visible=review.is_visible,
            created_at=review.created_at,
            user_id=review.user_id,
            user_display_name=_resolve_user_display_name(linked_user),
            user_username=linked_user.username if linked_user is not None else None,
            created_by_admin_id=review.created_by_admin_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update review.") from exc


@router.get("/users/{user_id}", response_model=AdminUserDetailRead)
async def get_user(
    user_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserDetailRead:
    _ = current_admin
    try:
        user = await session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        attempts_total = await session.scalar(
            select(func.count()).select_from(Attempt).where(Attempt.user_id == user_id)
        ) or 0
        attempts_completed = await session.scalar(
            select(func.count()).select_from(Attempt).where(
                Attempt.user_id == user_id,
                Attempt.status == ModelAttemptStatus.COMPLETED,
            )
        ) or 0
        avg_band_row = await session.scalar(
            select(func.avg(Attempt.band_score)).where(
                Attempt.user_id == user_id,
                Attempt.status == ModelAttemptStatus.COMPLETED,
                Attempt.band_score.isnot(None),
            )
        )
        return AdminUserDetailRead(
            id=user.id,
            telegram_id=user.telegram_id,
            first_name=user.first_name,
            last_name=user.last_name,
            username=user.username,
            phone=user.phone,
            is_premium=user.is_premium,
            premium_until=user.premium_until.isoformat() if user.premium_until else None,
            show_on_leaderboard=user.show_on_leaderboard,
            last_active_at=user.last_active_at.isoformat() if user.last_active_at else None,
            created_at=user.created_at.isoformat() if user.created_at else None,
            attempts_total=int(attempts_total),
            attempts_completed=int(attempts_completed),
            average_band=float(avg_band_row) if avg_band_row is not None else None,
        )
    except HTTPException:
        raise
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load user.")


class BulkPremiumRequest(BaseModel):
    user_ids: List[UUID]
    days: int = 30


@router.patch("/users/bulk-premium", response_model=MessageResponse)
async def bulk_grant_premium(
    payload: BulkPremiumRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    from datetime import datetime, timedelta, timezone
    try:
        from app.services.notification_sender import create_and_send_notification
        now = datetime.now(timezone.utc)
        until = now + timedelta(days=payload.days)
        for uid in payload.user_ids:
            user = await session.get(User, uid)
            if user is not None:
                user.is_premium = True
                user.premium_until = until
                body = f"You've been gifted {payload.days} days of Premium! Valid until {until.strftime('%d.%m.%Y')}."
                await create_and_send_notification(
                    session,
                    user_id=uid,
                    type=NotificationType.gift_received,
                    title="Premium activated!",
                    body=body,
                    telegram_text=f"🎉 <b>Premium activated!</b>\n\n{body}",
                )
        await session.commit()
        return MessageResponse(message=f"{len(payload.user_ids)} ta userga {payload.days} kunlik premium berildi.")
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Bulk premium failed.") from exc


@router.patch("/users/{user_id}/revoke-premium", response_model=MessageResponse)
async def revoke_premium(
    user_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.is_premium = False
    user.premium_until = None
    from app.services.notification_sender import create_and_send_notification
    await create_and_send_notification(
        session,
        user_id=user_id,
        type=NotificationType.premium_expired,
        title="Premium revoked",
        body="Your Premium subscription has been revoked by admin. Contact support to reactivate.",
        telegram_text="❌ <b>Premium revoked</b>\n\nYour Premium subscription has been revoked by admin.",
    )
    await session.commit()
    return MessageResponse(message="Premium bekor qilindi.")


@router.patch("/users/{user_id}/toggle-leaderboard", response_model=MessageResponse)
async def toggle_leaderboard(
    user_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.show_on_leaderboard = not user.show_on_leaderboard
    await session.commit()
    return MessageResponse(message=f"Leaderboard: {'visible' if user.show_on_leaderboard else 'hidden'}.")


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


@router.post("/check-premiums", response_model=MessageResponse)
async def check_premiums(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    _ = current_admin
    from app.services.notification_sender import check_expired_premiums, check_expiring_premiums
    expired = await check_expired_premiums(session)
    expiring = await check_expiring_premiums(session)
    return MessageResponse(message=f"Expired: {expired}, Expiring soon: {expiring}")


class AdminSettingsRead(BaseModel):
    project_name: str
    environment: str
    timezone: str
    payment_paused: bool
    max_sessions: int = 2
    telegram_bot_connected: bool = False
    total_users: int = 0
    total_tests: int = 0
    total_attempts: int = 0


class AdminSettingsUpdate(BaseModel):
    payment_paused: bool | None = None
    max_sessions: int | None = None


@router.get("/settings", response_model=AdminSettingsRead)
async def get_settings_view(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminSettingsRead:
    _ = current_admin
    from app.core.config import get_settings as _get_settings
    settings = _get_settings()
    users_total = await session.scalar(select(func.count()).select_from(User)) or 0
    tests_total = await session.scalar(select(func.count()).select_from(Test)) or 0
    attempts_total = await session.scalar(select(func.count()).select_from(Attempt)) or 0
    bot_connected = bool(settings.telegram_bot_token and settings.telegram_bot_token != "change-me")
    return AdminSettingsRead(
        project_name=settings.project_name,
        environment=settings.environment,
        timezone=settings.timezone,
        payment_paused=settings.payment_paused,
        telegram_bot_connected=bot_connected,
        total_users=int(users_total),
        total_tests=int(tests_total),
        total_attempts=int(attempts_total),
    )


@router.get("/plans", response_model=list[AdminPlanRead])
async def list_plans(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminPlanRead]:
    _ = current_admin
    try:
        plans = await list_catalog_plans(session, include_inactive=True, catalog="public")
        return [_serialize_admin_plan(plan) for plan in plans]
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load subscription plans.") from exc


@router.get("/gift-code-plans", response_model=list[AdminPlanRead])
async def list_gift_code_plans(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminPlanRead]:
    _ = current_admin
    try:
        plans = await list_catalog_plans(session, include_inactive=True, catalog="gift")
        return [_serialize_admin_plan(plan) for plan in plans]
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load redeem plans.") from exc


@router.post("/plans", response_model=AdminPlanRead, status_code=201)
async def create_plan(
    payload: AdminPlanUpsertRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminPlanRead:
    _ = current_admin
    perks = _normalize_plan_perks(payload.perks)
    if not perks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one plan perk is required.")

    plan = Plan(
        id=uuid4(),
        catalog="public",
        name=_normalize_plan_text(payload.name, fallback="Premium Plan") or "Premium Plan",
        duration_days=payload.duration_days,
        price_amount=payload.price,
        discount_percent=0,
        display_order=payload.display_order,
        badge_label=_normalize_plan_text(payload.badge_label),
        perks=perks,
        is_featured=payload.is_featured,
        is_active=payload.is_active,
    )
    session.add(plan)

    try:
        await session.commit()
        await session.refresh(plan)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create subscription plan.") from exc

    return _serialize_admin_plan(plan)


@router.patch("/plans/{plan_id}", response_model=AdminPlanRead)
async def update_plan(
    plan_id: UUID,
    payload: AdminPlanUpsertRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminPlanRead:
    _ = current_admin
    plan = await session.get(Plan, plan_id)
    if plan is None or str(plan.catalog or "public") != "public":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan was not found.")

    perks = _normalize_plan_perks(payload.perks)
    if not perks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one plan perk is required.")

    plan.name = _normalize_plan_text(payload.name, fallback=plan.name) or plan.name
    plan.duration_days = payload.duration_days
    plan.price_amount = payload.price
    plan.discount_percent = 0
    plan.display_order = payload.display_order
    plan.badge_label = _normalize_plan_text(payload.badge_label)
    plan.perks = perks
    plan.is_featured = payload.is_featured
    plan.is_active = payload.is_active

    try:
        await session.commit()
        await session.refresh(plan)
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update subscription plan.") from exc

    return _serialize_admin_plan(plan)


@router.get("/gift-codes", response_model=list[AdminGiftCodeRead])
async def list_gift_codes(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminGiftCodeRead]:
    _ = current_admin
    now = datetime.now(UTC)

    try:
        rows = (
            await session.execute(
                select(GiftCode, Plan, User)
                .outerjoin(Plan, GiftCode.plan_id == Plan.id)
                .outerjoin(User, GiftCode.recipient_user_id == User.id)
                .order_by(GiftCode.created_at.desc())
            )
        ).all()
        return [
            _serialize_admin_gift_code(gift_code, plan=plan, recipient=recipient, now=now)
            for gift_code, plan, recipient in rows
        ]
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load redeem codes.") from exc


@router.post("/gift-codes", response_model=AdminGiftCodeCreateResponse, status_code=201)
async def create_gift_codes(
    payload: AdminGiftCodeCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminGiftCodeCreateResponse:
    _ = current_admin

    try:
        await list_catalog_plans(session, include_inactive=True, catalog="all")
        plan = await session.get(Plan, payload.plan_id)
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected plan was not found.")
        if str(plan.catalog or "") != "gift":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected plan cannot be used for redeem codes.")

        prefix = _normalize_code_value(payload.prefix)[:12] or None
        custom_code = _normalize_code_value(payload.custom_code) if payload.custom_code else None
        starts_at = _normalize_datetime(payload.start_date)
        expires_at = _normalize_datetime(payload.end_date)

        if payload.quantity > 1 and custom_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Custom code can be used only when quantity is 1.")
        if starts_at is not None and starts_at <= datetime.now(UTC):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start date must be in the future.")
        if expires_at is not None and expires_at <= datetime.now(UTC):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be in the future.")
        if starts_at is not None and expires_at is not None and starts_at >= expires_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be after the start date.")
        if payload.per_user_limit > payload.max_uses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Per-user limit cannot exceed the global usage limit.")

        created_items: list[GiftCode] = []
        reserved_codes: set[str] = set()
        initial_status = ModelPaymentStatus.PAUSED if payload.starts_paused else ModelPaymentStatus.PENDING

        for _ in range(payload.quantity):
            code_value = await _build_unique_gift_code(
                session,
                prefix=prefix,
                custom_code=custom_code,
                reserved=reserved_codes,
            )
            reserved_codes.add(code_value)
            gift_code = GiftCode(
                plan_id=plan.id,
                code=code_value,
                status=initial_status,
                starts_at=starts_at,
                expires_at=expires_at,
                max_uses=payload.max_uses,
                used_count=0,
                per_user_limit=payload.per_user_limit,
                target_user_type=payload.target_user_type,
            )
            session.add(gift_code)
            created_items.append(gift_code)
            custom_code = None

        await session.commit()

        now = datetime.now(UTC)
        return AdminGiftCodeCreateResponse(
            message=f"{len(created_items)} redeem code{'s' if len(created_items) != 1 else ''} created.",
            items=[
                _serialize_admin_gift_code(item, plan=plan, recipient=None, now=now)
                for item in created_items
            ],
        )
    except HTTPException:
        raise
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create redeem codes.") from exc


@router.patch("/gift-codes/{gift_code_id}", response_model=AdminGiftCodeRead)
async def update_gift_code(
    gift_code_id: UUID,
    payload: AdminGiftCodeUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminGiftCodeRead:
    _ = current_admin

    try:
        gift_code = await session.get(GiftCode, gift_code_id)
        if gift_code is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redeem code was not found.")

        if gift_code.status == ModelPaymentStatus.COMPLETED or gift_code.used_count >= gift_code.max_uses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Redeemed code can no longer be changed.")

        if payload.status == "available":
            gift_code.status = ModelPaymentStatus.PENDING
        elif payload.status == "paused":
            gift_code.status = ModelPaymentStatus.PAUSED
        else:
            gift_code.status = ModelPaymentStatus.FAILED

        await session.commit()

        plan = await session.get(Plan, gift_code.plan_id) if gift_code.plan_id else None
        recipient = await session.get(User, gift_code.recipient_user_id) if gift_code.recipient_user_id else None
        return _serialize_admin_gift_code(gift_code, plan=plan, recipient=recipient, now=datetime.now(UTC))
    except HTTPException:
        raise
    except Exception as exc:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update redeem code.") from exc


@router.get("/payments", response_model=list[AdminPaymentRead])
async def list_payments(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[AdminPaymentRead]:
    _ = current_admin
    expired_count = await expire_stale_payments(session)
    if expired_count:
        await session.commit()

    rows = (
        await session.execute(
            select(Payment, User, Plan)
            .outerjoin(User, Payment.user_id == User.id)
            .outerjoin(Plan, Payment.plan_id == Plan.id)
            .order_by(Payment.created_at.desc())
        )
    ).all()
    return [
        _serialize_admin_payment(payment, user=user, plan=plan)
        for payment, user, plan in rows
    ]


@router.patch("/payments/{payment_id}", response_model=AdminPaymentRead)
async def update_payment(
    payment_id: UUID,
    payload: AdminPaymentUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminPaymentRead:
    _ = current_admin
    payment = await session.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment invoice was not found.")

    next_status = payload.status.value
    now = datetime.now(UTC)

    try:
        if next_status == "completed":
            if payment.status != "completed":
                await complete_payment(
                    session,
                    payment=payment,
                    detected_message_id=payment.detected_message_id or f"admin:{current_admin.id}",
                    detected_message_text=payment.detected_message_text or "Completed manually from admin panel.",
                )
            if payload.status_reason:
                payment.status_reason = payload.status_reason
        else:
            payment.status = next_status
            payment.status_reason = payload.status_reason
            if next_status == "matched" and payment.matched_at is None:
                payment.matched_at = now
            if next_status in {"expired", "canceled", "failed"}:
                payment.archived_at = payment.archived_at or now
            if next_status in {"pending", "matched", "review"}:
                payment.archived_at = None
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await session.commit()
    user = await session.get(User, payment.user_id) if payment.user_id else None
    plan = await session.get(Plan, payment.plan_id) if payment.plan_id else None
    return _serialize_admin_payment(payment, user=user, plan=plan)


@router.get("/payment-cards", response_model=list[PaymentCardRead])
async def list_payment_cards(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> list[PaymentCardRead]:
    _ = current_admin
    cards = list(
        (
            await session.execute(
                select(PaymentCard).order_by(PaymentCard.is_active.desc(), PaymentCard.priority.desc(), PaymentCard.created_at.asc())
            )
        )
        .scalars()
        .all()
    )
    return [_serialize_payment_card(card) for card in cards]


@router.post("/payment-cards", response_model=PaymentCardRead, status_code=201)
async def create_payment_card(
    payload: PaymentCardCreateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaymentCardRead:
    _ = current_admin
    card = PaymentCard(
        label=payload.label.strip(),
        card_number=payload.card_number.strip(),
        card_type=payload.card_type,
        holder_name=payload.holder_name.strip() if payload.holder_name else None,
        is_active=payload.is_active,
        priority=payload.priority,
        bot_source=payload.bot_source,
    )
    session.add(card)
    await session.flush()
    if payload.is_active:
        await set_single_active_card(session, card.id)
    await session.commit()
    await session.refresh(card)
    return _serialize_payment_card(card)


@router.patch("/payment-cards/{card_id}", response_model=PaymentCardRead)
async def update_payment_card(
    card_id: UUID,
    payload: PaymentCardUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaymentCardRead:
    _ = current_admin
    card = await session.get(PaymentCard, card_id)
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment card was not found.")

    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(card, field_name, value)
    if payload.is_active:
        await set_single_active_card(session, card.id)
    await session.commit()
    await session.refresh(card)
    return _serialize_payment_card(card)


@router.get("/payment-settings", response_model=PaymentSettingsRead)
async def get_payment_settings(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaymentSettingsRead:
    _ = current_admin
    setting = await get_or_create_payment_settings(session)
    await session.commit()
    await session.refresh(setting)
    return _serialize_payment_settings(setting)


@router.patch("/payment-settings", response_model=PaymentSettingsRead)
async def update_payment_settings(
    payload: PaymentSettingsUpdateRequest,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> PaymentSettingsRead:
    _ = current_admin
    setting = await get_or_create_payment_settings(session)
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(setting, field_name, value)
    await session.commit()
    await session.refresh(setting)
    return _serialize_payment_settings(setting)


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
