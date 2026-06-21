from datetime import date
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.enum_values import EnumValueString
from app.models.enums import AccessType, QuestionType, TestFormat, TestSource, TestStatus, TestType


class Test(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "tests"

    title: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    type: Mapped[TestType] = mapped_column(EnumValueString(TestType), index=True)
    format: Mapped[TestFormat] = mapped_column(EnumValueString(TestFormat), index=True, default=TestFormat.FULL)
    access_type: Mapped[AccessType] = mapped_column(EnumValueString(AccessType), index=True)
    status: Mapped[TestStatus] = mapped_column(EnumValueString(TestStatus), default=TestStatus.DRAFT)
    source: Mapped[TestSource] = mapped_column(EnumValueString(TestSource))
    source_detail: Mapped[str | None] = mapped_column(String(255), nullable=True)
    exam_date: Mapped[date | None] = mapped_column(nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    exam_time_limit_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, default=40)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("admins.id"), nullable=True, index=True)
    payments_paused: Mapped[bool] = mapped_column(Boolean, default=True)
    review_status: Mapped[str] = mapped_column(String(32), default="needs_review", index=True)

    sections: Mapped[list["TestSection"]] = relationship(back_populates="test")


class TestSlugRedirect(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "test_slug_redirects"

    slug: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    test_id: Mapped[UUID] = mapped_column(ForeignKey("tests.id"), index=True)


class TestSection(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "test_sections"

    test_id: Mapped[UUID] = mapped_column(ForeignKey("tests.id"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(255))
    intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[dict] = mapped_column(JSONB, default=dict)
    audio_asset_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    audio_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript: Mapped[dict] = mapped_column(JSONB, default=dict)

    test: Mapped[Test] = relationship(back_populates="sections")
    question_groups: Mapped[list["QuestionGroup"]] = relationship(back_populates="section")


class QuestionGroup(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "question_groups"

    section_id: Mapped[UUID] = mapped_column(ForeignKey("test_sections.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    question_type: Mapped[QuestionType] = mapped_column(EnumValueString(QuestionType), index=True)
    question_start: Mapped[int] = mapped_column(Integer)
    question_end: Mapped[int] = mapped_column(Integer)
    shared_content: Mapped[dict] = mapped_column(JSONB, default=dict)
    shared_options: Mapped[list] = mapped_column(JSONB, default=list)

    section: Mapped[TestSection] = relationship(back_populates="question_groups")
    questions: Mapped[list["Question"]] = relationship(back_populates="question_group")


class Question(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "questions"

    question_group_id: Mapped[UUID] = mapped_column(ForeignKey("question_groups.id"), index=True)
    number: Mapped[int] = mapped_column(Integer, index=True)
    prompt: Mapped[str] = mapped_column(Text)
    question_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation_reference: Mapped[dict] = mapped_column(JSONB, default=dict)
    word_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)

    question_group: Mapped[QuestionGroup] = relationship(back_populates="questions")
    answer_variants: Mapped[list["AnswerVariant"]] = relationship(back_populates="question")


class AnswerVariant(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "answer_variants"

    question_id: Mapped[UUID] = mapped_column(ForeignKey("questions.id"), index=True)
    value: Mapped[str] = mapped_column(Text)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    question: Mapped[Question] = relationship(back_populates="answer_variants")
