from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from math import ceil
import re
from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.commerce import GiftCode, GiftCodeEntitlement, Payment, Plan
from app.models.enums import PaymentStatus
from app.models.ops import Notification
from app.models.user import User
from app.services.plan_catalog import (
    ensure_default_plans,
    get_default_plan_definition,
    get_gift_code_plan_definition_by_days,
    get_public_plan_definition_for_granted_days,
)

__all__ = [name for name in globals() if not name.startswith('__')]
