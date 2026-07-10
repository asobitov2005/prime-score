from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.models.writing_dependencies import *

class WritingEvaluationRun(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_evaluation_runs"

    submission_id: Mapped[UUID] = mapped_column(
        ForeignKey("writing_submissions.id"), unique=True, index=True
    )
    evaluation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("writing_evaluations.id"), nullable=True, index=True
    )
    pipeline_version: Mapped[str] = mapped_column(String(32), default="blueprint_v1")
    mode: Mapped[str] = mapped_column(String(32), default="full_diagnostic")
    initial_scores: Mapped[dict] = mapped_column(JSONB, default=dict)
    selected_benchmarks: Mapped[list] = mapped_column(JSONB, default=list)
    calibration_result: Mapped[dict] = mapped_column(JSONB, default=dict)
    audit_result: Mapped[dict] = mapped_column(JSONB, default=dict)
    confidence: Mapped[str] = mapped_column(String(32), default="Medium")
    possible_score_range: Mapped[str] = mapped_column(String(32), default="")
    meta_learning_note: Mapped[str] = mapped_column(Text, default="")

class WritingConfigAuditLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "writing_config_audit_logs"

    actor_admin_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("admins.id"), nullable=True, index=True
    )
    entity_type: Mapped[WritingConfigEntityType] = mapped_column(
        EnumValueString(WritingConfigEntityType), index=True
    )
    entity_id: Mapped[UUID] = mapped_column(index=True)
    action: Mapped[str] = mapped_column(String(64))
    previous_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    new_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
