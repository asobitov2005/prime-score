from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OnlineMockCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=10000)
    listening_test_id: UUID
    reading_test_id: UUID
    writing_task_1_id: UUID
    writing_task_2_id: UUID
    is_published: bool = False
    academic_confirmed: bool = False


class OnlineMockPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=10000)
    listening_test_id: UUID | None = None
    reading_test_id: UUID | None = None
    writing_task_1_id: UUID | None = None
    writing_task_2_id: UUID | None = None
    is_published: bool | None = None
    academic_confirmed: bool | None = None

    @field_validator(
        "title", "listening_test_id", "reading_test_id", "writing_task_1_id",
        "writing_task_2_id", "is_published", "academic_confirmed",
    )
    @classmethod
    def reject_explicit_null(cls, value):
        if value is None:
            raise ValueError("This field cannot be null.")
        return value


class OnlineMockAdminRead(OnlineMockCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    module: Literal["academic"] = "academic"


class OnlineMockCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    module: Literal["academic"] = "academic"
    requires_premium: Literal[True] = True
    skills: tuple[Literal["listening"], Literal["reading"], Literal["writing"]] = (
        "listening", "reading", "writing",
    )
    stage_count: Literal[4] = 4
    total_seconds: int | None = None
    duration_minutes: float | None = None


class OnlineMockStage(BaseModel):
    key: Literal["listening", "reading", "writing_task_1", "writing_task_2"]
    resource_id: UUID
    resource_type: Literal["test", "writing_task"]
    title: str
    launch_url: str
    time_limit_seconds: int | None


class OnlineMockDetail(OnlineMockCard):
    stages: list[OnlineMockStage]


class OnlineMockList(BaseModel):
    items: list[OnlineMockCard]
    total: int
    page: int
    page_size: int


class OnlineMockAdminList(BaseModel):
    items: list[OnlineMockAdminRead]
    total: int
    page: int
    page_size: int
