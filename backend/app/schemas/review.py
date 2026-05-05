from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.core.enums import ReviewSource


class PublicReviewRead(BaseModel):
    id: UUID
    name: str
    band: str
    text: str
    created_at: datetime


class PublicReviewCreateRequest(BaseModel):
    band: str = Field(min_length=1, max_length=32)
    text: str = Field(min_length=10, max_length=1200)


class ReviewSubmissionResponse(BaseModel):
    id: UUID
    is_visible: bool
    message: str


class LandingLiveStatsRead(BaseModel):
    online_count: int
    refreshed_at: datetime


class AdminReviewRead(BaseModel):
    id: UUID
    source: ReviewSource
    author_name: str
    band_label: str
    text: str
    is_visible: bool
    created_at: datetime
    user_id: UUID | None = None
    user_display_name: str | None = None
    user_username: str | None = None
    created_by_admin_id: UUID | None = None


class AdminReviewCreateRequest(BaseModel):
    user_id: UUID | None = None
    author_name: str | None = Field(default=None, max_length=160)
    band_label: str = Field(min_length=1, max_length=32)
    text: str = Field(min_length=10, max_length=1200)
    is_visible: bool = True

    @model_validator(mode="after")
    def validate_author_name(self) -> "AdminReviewCreateRequest":
        if self.user_id is None and not (self.author_name and self.author_name.strip()):
            raise ValueError("author_name is required when user_id is not provided.")
        return self


class AdminReviewVisibilityRequest(BaseModel):
    is_visible: bool
