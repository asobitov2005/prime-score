from __future__ import annotations

import logging
import re
import secrets
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import List
import asyncio
from uuid import UUID, uuid4
import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status, Query
from pydantic import BaseModel
from sqlalchemy import Integer, case, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_admin, get_current_super_admin
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.enums import PaymentMethod, TestStatus, TestType
from app.db.session import get_db_session, get_session_maker
from app.api.routes.admin_writing import AdminWritingSubmissionRead, _serialize_submission_read
from app.api.routes.attempts import (
    _count_answered_slots,
    _count_answered_values,
    _effective_band_score,
    _extract_diagram_groups,
    _extract_question_labels,
)
from app.models.admin import Admin, AdminLoginOtp
from app.models.commerce import GiftCode, Payment, PaymentCard, PaymentSetting, Plan, PromoCode
from app.models.attempt import Attempt, UserAnswer
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.enums import AttemptStatus as ModelAttemptStatusEnum
from app.models.enums import AccessType as ModelAccessType
from app.models.enums import AdminRole as ModelAdminRole
from app.models.enums import PaymentStatus as ModelPaymentStatus
from app.models.enums import TestStatus as ModelTestStatus
from app.models.test import Question, QuestionGroup, Test
from app.models.user import Session as UserSession
from app.models.user import TelegramUser, User
from app.models.ops import AuditLog
from app.models.review import Review
from app.models.writing import WritingEvaluation, WritingSubmission, WritingTask
from app.core.enums import NotificationType
from app.core.enums import ReviewSource
from app.models.enums import ReviewSource as ModelReviewSource
from app.schemas.attempts import (
    AttemptBreakdownItemRead,
    AttemptResultRead,
    AttemptReviewItemRead,
    AttemptReviewRead,
)
from app.schemas.admin import (
    AdminAudioTranscriptRequest,
    AdminAudioTranscriptJobCreateResponse,
    AdminAudioTranscriptJobRead,
    AdminAudioTranscriptResponse,
    AdminAccountCreateRequest,
    AdminAnalyticsReportRead,
    AdminAnalyticsPointRead,
    AdminAnalyticsQuestionTypeRead,
    AdminAnalyticsTopTestRead,
    AdminAuditLogRead,
    AdminAvgScoreByTestRead,
    AdminAvgTimePerTestRead,
    AdminBandDistributionPointRead,
    AdminCompletionFunnelRead,
    AdminContentCreateRequest,
    AdminTestDraftUpsertRequest,
    AdminTestDraftRead,
    AdminDashboardRead,
    AdminQuickStatsRead,
    AdminGiftCodeCreateRequest,
    AdminGiftCodeCreateResponse,
    AdminGiftCodeRead,
    AdminGiftCodeUpdateRequest,
    AdminPlanRead,
    AdminPlanUpsertRequest,
    AdminPromoCodeRead,
    AdminPromoCodeCreateRequest,
    AdminTestRead,
    AdminTestUpsertRequest,
    AdminTopActiveUserRead,
    AdminTrendPointRead,
    AdminTypeSplitRead,
    AdminUploadUrlRequest,
    AdminUploadUrlResponse,
    AdminUploadedAssetResponse,
    AdminUserRead,
    AdminUserSegmentRead,
    AdminUserSegmentationRead,
    CreatedEntityResponse,
)
from app.schemas.auth import (
    AdminAuthChallengeResponse,
    AdminAuthLoginRequest,
    AdminAuthRefreshRequest,
    AdminAuthResponse,
    AdminAuthVerifyOtpRequest,
    AdminPasswordResetCompleteRequest,
    AdminPasswordResetRequest,
    AdminPasswordResetTokenStatusResponse,
)
from app.schemas.common import AdminPrincipal, MessageResponse
from app.schemas.payments import (
    AdminPaymentRead,
    AdminPaymentListResponse,
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
from app.services.admin_auth import (
    ADMIN_LOGIN_OTP_PURPOSE,
    ADMIN_LOGIN_OTP_TTL_SECONDS,
    ADMIN_PASSWORD_RESET_PURPOSE,
    ADMIN_PASSWORD_RESET_TTL_SECONDS,
    AdminOtpFailure,
    build_admin_password_reset_message,
    build_admin_password_reset_reply_markup,
    build_admin_password_reset_success_message,
    build_admin_password_reset_url,
    consume_admin_password_reset_token,
    authenticate_admin_by_phone_number,
    build_admin_otp_message,
    build_admin_principal,
    create_admin_account,
    generate_admin_otp_code,
    get_admin_password_reset_challenge,
    get_admin_auth_throttle,
    get_admin_by_id,
    get_admin_by_phone_number,
    normalize_phone_number,
    update_admin_security_settings,
)
from app.services.attempt_repo import iter_user_attempts_from_db
from app.services.notification_sender import delete_telegram_message, edit_telegram_message, send_telegram_message_with_id
from app.services.gift_entitlements import grant_manual_premium_entitlement
from app.services.plan_catalog import (
    list_plans as list_catalog_plans,
)
from app.services.object_storage import upload_test_audio_asset, upload_test_diagram_image
from app.services.gemini_audio_transcription import (
    ListeningTranscriptQuestion,
    transcribe_listening_audio_from_url,
)
from app.services.transcript_jobs import (
    attach_transcript_job_task,
    cancel_transcript_job,
    create_transcript_job,
    get_transcript_job,
    mark_transcript_job_completed,
    mark_transcript_job_failed,
    mark_transcript_job_running,
)
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
from app.services.user_cleanup import purge_user_data
from app.tasks.tasks import generate_test_explanations_task

__all__ = [name for name in globals() if not name.startswith('__')]
