from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PublicPlanRead(BaseModel):
    id: UUID
    name: str
    duration_days: int
    price: Decimal
    currency: str = "UZS"
    discount_percent: int = 0
    badge_label: str | None = None
    perks: list[str] = Field(default_factory=list)
    display_order: int = 0
    is_featured: bool = False
    payment_paused: bool = True
