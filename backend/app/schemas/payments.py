from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import PaymentMethod, PaymentStatus


class PaymentCardCreateRequest(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    card_number: str = Field(min_length=8, max_length=32)
    card_type: Literal["humo", "uzcard"] = "humo"
    holder_name: str | None = Field(default=None, max_length=120)
    is_active: bool = False
    priority: int = Field(default=0, ge=0, le=1000)
    bot_source: Literal["HUMOcardbot", "CardXabarBot"] = "HUMOcardbot"


class PaymentCardUpdateRequest(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=120)
    card_number: str | None = Field(default=None, min_length=8, max_length=32)
    card_type: Literal["humo", "uzcard"] | None = None
    holder_name: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None
    priority: int | None = Field(default=None, ge=0, le=1000)
    bot_source: Literal["HUMOcardbot", "CardXabarBot"] | None = None


class PaymentCardRead(BaseModel):
    id: UUID
    label: str
    card_number: str
    card_type: str
    holder_name: str | None = None
    is_active: bool = False
    priority: int = 0
    bot_source: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaymentSettingsRead(BaseModel):
    id: UUID
    telegram_api_id: str | None = None
    telegram_api_hash: str | None = None
    phone_number: str | None = None
    active_bot: str = "HUMOcardbot"
    support_contact: str | None = None
    is_enabled: bool = False
    poll_fallback_enabled: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaymentSettingsUpdateRequest(BaseModel):
    telegram_api_id: str | None = Field(default=None, max_length=32)
    telegram_api_hash: str | None = Field(default=None, max_length=128)
    phone_number: str | None = Field(default=None, max_length=24)
    active_bot: Literal["HUMOcardbot", "CardXabarBot"] | None = None
    support_contact: str | None = Field(default=None, max_length=120)
    is_enabled: bool | None = None
    poll_fallback_enabled: bool | None = None


class MePaymentCreateRequest(BaseModel):
    plan_id: UUID


class MePaymentRead(BaseModel):
    id: UUID
    invoice_code: str
    plan_id: UUID | None = None
    plan_name: str = "Unknown plan"
    duration_days: int | None = None
    method: PaymentMethod = PaymentMethod.card_transfer
    status: str
    base_amount: Decimal
    compare_at_amount: Decimal
    amount: Decimal
    discount_amount: Decimal
    currency: str = "UZS"
    card_label: str | None = None
    card_number: str | None = None
    wheel_options: list[Decimal] = Field(default_factory=list)
    expires_at: datetime | None = None
    matched_at: datetime | None = None
    paid_at: datetime | None = None
    archived_at: datetime | None = None
    granted_until: datetime | None = None
    status_reason: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MePaymentCreateResponse(BaseModel):
    message: str
    payment: MePaymentRead


class MePaymentCancelResponse(BaseModel):
    message: str
    payment: MePaymentRead


class AdminPaymentRead(BaseModel):
    id: UUID
    invoice_code: str
    user_id: UUID | None = None
    user_name: str | None = None
    user_username: str | None = None
    plan_id: UUID | None = None
    plan_name: str = "Unknown plan"
    duration_days: int | None = None
    method: PaymentMethod = PaymentMethod.card_transfer
    status: str
    amount: Decimal
    base_amount: Decimal
    compare_at_amount: Decimal
    discount_amount: Decimal
    currency: str = "UZS"
    card_label: str | None = None
    card_number: str | None = None
    expires_at: datetime | None = None
    matched_at: datetime | None = None
    paid_at: datetime | None = None
    archived_at: datetime | None = None
    granted_until: datetime | None = None
    status_reason: str | None = None
    detected_message_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AdminPaymentUpdateRequest(BaseModel):
    status: Literal[
        PaymentStatus.pending,
        PaymentStatus.matched,
        PaymentStatus.completed,
        PaymentStatus.expired,
        PaymentStatus.canceled,
        PaymentStatus.review,
        PaymentStatus.failed,
    ]
    status_reason: str | None = Field(default=None, max_length=255)
