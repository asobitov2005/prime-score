from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PublicPlanRead(BaseModel):
    id: UUID
    name: str
    duration_days: int
    price: Decimal
    currency: str = "UZS"
    discount_percent: int = 0
    payment_paused: bool = True
