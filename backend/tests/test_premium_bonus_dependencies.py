from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID
import pytest
from app.core.enums import AttemptStatus as CoreAttemptStatus
from app.models.commerce import GiftCodeEntitlement, Plan
from app.models.enums import AttemptMode as ModelAttemptMode
from app.models.enums import AttemptScope as ModelAttemptScope
from app.models.enums import AttemptStatus as ModelAttemptStatus
from app.models.enums import TestType as ModelTestType
from app.models.user import User
from app.services.attempt_repo import _should_grant_premium_bonus, submit_attempt_in_db
from app.services.gift_entitlements import (
    FriendGiftOffer,
    generate_user_gift_code,
    get_friend_gift_offer_for_plan,
    grant_payment_gift_entitlement,
)
from app.services.plan_catalog import (
    PUBLIC_30_DAY_PLAN,
    PUBLIC_PLAN_DEFINITIONS,
    get_public_plan_definition_for_granted_days,
)
from app.services.premium_access import reconcile_user_premium_status
from app.services.premium_bonus import grant_premium_bonus

__all__ = [name for name in globals() if not name.startswith('__')]
