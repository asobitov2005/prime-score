from __future__ import annotations

import re
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user
from app.core.enums import AttemptStatus, NotificationType, PaymentMethod, TestMode, TestScope, TestType
from app.db.session import get_db_session
from app.models.commerce import GiftCode, GiftCodeRedemption, Payment, Plan
from app.models.enums import PaymentStatus
from app.models.ops import Notification
from app.models.test import Test
from app.models.user import User
from app.schemas.common import DebugPrincipal, MessageResponse
from app.schemas.me import (
    FavoriteTestRead,
    MeAccuracyTrendPointRead,
    MeActivityPointRead,
    MeAttemptSummaryRead,
    MeBandProgressPointRead,
    MeDashboardAnalyticsRead,
    MeErrorDistributionItemRead,
    MeGenerateGiftCodeRequest,
    MeGenerateGiftCodeResponse,
    MeGiftCodeRead,
    MeGiftCodeSummaryRead,
    MeImprovementRateRead,
    MePerformanceStudyTimeRead,
    MePerformanceTestCountBucketRead,
    MePerformanceSummaryRead,
    MePersonalBestsRead,
    MeProfileRead,
    MeProfileUpdateRequest,
    MeRedeemCodeRequest,
    MeRedeemCodeResponse,
    MeQuestionTypeAnalysisItemRead,
    MeQuestionTypeComparisonItemRead,
    MeQuestionTypeComparisonRead,
    MeQuestionTypeComparisonTestRead,
    MeSectionAnalysisItemRead,
    MeScoreDistributionRead,
    MeSkillFocusItemRead,
    MeSpeakingCriteriaRead,
    MeSkillTimeAnalysisRead,
    MeSpeedMetricsRead,
    MeStatsRead,
    MeWeeklyActivityPointRead,
    MeWritingCriteriaRead,
    MeXpSummaryRead,
    MeXpTransactionRead,
    MeLevelProgressRead,
)
from app.schemas.payments import (
    MePaymentCancelResponse,
    MePaymentCreateRequest,
    MePaymentCreateResponse,
    MePaymentRead,
)
from app.services.attempt_repo import iter_user_attempts_from_db
from app.models.speaking import SpeakingEvaluation, SpeakingSession, SpeakingTest
from app.services.gift_entitlements import (
    ensure_manual_premium_entitlement_for_user,
    generate_user_gift_code,
    get_user_gift_code_summary,
)
from app.services.notification_sender import create_and_send_notification
from app.services.object_storage import upload_user_avatar_image
from app.services.payment_service import (
    DEFAULT_PAYMENT_SUPPORT_CONTACT,
    PENDING_PAYMENT_STATUSES,
    create_plan_payment,
    expire_stale_payments,
)
from app.services.plan_catalog import ensure_default_plans
from app.services.premium_access import reconcile_user_premium_status
from app.services.attempt_runtime import AttemptRuntime, band_for_raw_score
from app.services.scoring import mc_multiple_question_weight
from app.services.telegram_profile_sync import sync_user_telegram_profile
from app.services.user_names import normalize_user_name_parts
from app.services.xp import (
    PERIOD_ALL_TIME,
    PERIOD_MONTHLY,
    PERIOD_WEEKLY,
    leaderboard_rows,
    level_bounds,
    list_user_xp_transactions,
    get_user_period_xp,
)

__all__ = [name for name in globals() if not name.startswith('__')]
