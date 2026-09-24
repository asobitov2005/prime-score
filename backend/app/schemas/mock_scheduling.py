from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AdminOfflineMockScheduleUpsert(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    starts_at: datetime
    duration_minutes: int = Field(ge=30, le=360)
    location: str = Field(min_length=1, max_length=255)
    address: str | None = Field(default=None, max_length=500)
    capacity: int = Field(ge=1, le=500)
    price_amount: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    is_published: bool = False

    @field_validator("title", "location")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank.")
        return normalized

    @field_validator("starts_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Schedule start time must include a timezone.")
        return value


class OfflineMockScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    starts_at: datetime
    duration_minutes: int
    location: str
    address: str | None = None
    capacity: int
    reserved_count: int
    available_seats: int
    price_amount: Decimal
    currency: str = "UZS"
    is_published: bool


class OfflineMockScheduleListRead(BaseModel):
    items: list[OfflineMockScheduleRead]
    total: int = 0
    page: int | None = None
    page_size: int | None = None


class OfflineMockBookingCreate(BaseModel):
    schedule_id: UUID


class OfflineMockBookingRead(BaseModel):
    id: UUID
    schedule_id: UUID
    title: str
    starts_at: datetime
    duration_minutes: int
    location: str
    address: str | None = None
    price_amount: Decimal
    currency: str = "UZS"
    payment_method: Literal["click"] = "click"
    payment_confirmation: Literal["manual"] = "manual"


class OfflineMockBookingListRead(BaseModel):
    items: list[OfflineMockBookingRead]


def validate_schedule_range(start: datetime, end: datetime) -> None:
    for value in (start, end):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Date range must include a timezone.")
    if end <= start:
        raise ValueError("Date range end must be after its start.")
    if end - start > timedelta(days=45):
        raise ValueError("Date range cannot exceed 45 days.")
