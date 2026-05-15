from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import AccessType, AttemptStatus, TestMode, TestSource, TestStatus, TestType
from app.schemas.common import DebugPrincipal


class MeProfileUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    avatar_url: str | None = None
    show_on_leaderboard: bool | None = None


class MeRedeemCodeRequest(BaseModel):
    code: str = Field(min_length=4, max_length=50)


class MeRedeemCodeResponse(BaseModel):
    message: str
    code: str
    plan_name: str
    duration_days: int
    is_premium: bool
    premium_until: datetime


class MeProfileRead(DebugPrincipal):
    premium_until: datetime | None = None
    last_active_at: datetime | None = None


class MeStatsRead(BaseModel):
    attempts_total: int = 0
    favorites_total: int = 0
    current_streak: int = 0
    average_band: Decimal | None = None
    reading_band: Decimal | None = None
    listening_band: Decimal | None = None
    leaderboard_rank: int | None = None
    active_sessions: int = 0


class MeActivityPointRead(BaseModel):
    activity_date: date
    attempts_count: int = 0
    time_spent_sec: int = 0
    reading_time_sec: int = 0
    listening_time_sec: int = 0
    writing_time_sec: int = 0


class MeAttemptSummaryRead(BaseModel):
    attempt_id: UUID
    test_id: UUID
    test_title: str
    test_type: TestType
    test_format: str = "full"
    mode: TestMode
    status: AttemptStatus
    access_type: AccessType
    source: TestSource | None = None
    raw_score: int | None = None
    band_score: Decimal | None = None
    total_questions: int = 0
    time_spent_sec: int = 0
    answered_count: int = 0
    progress_percent: int = 0
    time_limit_seconds: int = 0
    last_answered_question_number: int | None = None
    started_at: datetime
    completed_at: datetime | None = None
    updated_at: datetime | None = None
    violation_count: int = 0


class FavoriteTestRead(BaseModel):
    test_id: UUID
    title: str
    test_type: TestType
    access_type: AccessType
    status: TestStatus


class MeQuestionTypeAnalysisItemRead(BaseModel):
    label: str
    worked_count: int = 0
    correct_count: int = 0
    accuracy: float = 0.0
    error_count: int = 0


class MeQuestionTypeComparisonItemRead(BaseModel):
    label: str
    previous_accuracy: float | None = None
    current_accuracy: float | None = None
    delta: float | None = None
    accuracies: list[float | None] = Field(default_factory=list)


class MeQuestionTypeComparisonTestRead(BaseModel):
    test_title: str
    test_date: datetime


class MeQuestionTypeComparisonRead(BaseModel):
    previous_test_title: str | None = None
    previous_test_date: datetime | None = None
    current_test_title: str | None = None
    current_test_date: datetime | None = None
    tests: list[MeQuestionTypeComparisonTestRead] = Field(default_factory=list)
    items: list[MeQuestionTypeComparisonItemRead] = Field(default_factory=list)


class MeErrorDistributionItemRead(BaseModel):
    label: str
    error_count: int = 0
    share: float = 0.0


class MeBandProgressPointRead(BaseModel):
    label: str
    occurred_at: datetime
    reading: float | None = None
    listening: float | None = None
    writing: float | None = None


class MePerformanceStudyTimeRead(BaseModel):
    total_time_sec: int = 0
    reading_time_sec: int = 0
    listening_time_sec: int = 0
    writing_time_sec: int = 0


class MePerformanceTestCountBucketRead(BaseModel):
    full_count: int = 0
    section_1_count: int = 0
    section_2_count: int = 0
    section_3_count: int = 0
    section_4_count: int = 0


class MePerformanceSummaryRead(BaseModel):
    study_time: MePerformanceStudyTimeRead = Field(default_factory=MePerformanceStudyTimeRead)
    reading: MePerformanceTestCountBucketRead = Field(default_factory=MePerformanceTestCountBucketRead)
    listening: MePerformanceTestCountBucketRead = Field(default_factory=MePerformanceTestCountBucketRead)
    writing: MePerformanceTestCountBucketRead | None = Field(default=None)


class MeAccuracyTrendPointRead(BaseModel):
    date: str
    accuracy: float
    band: float | None = None
    test_type: str | None = None


class MeWeeklyActivityPointRead(BaseModel):
    week_label: str
    attempts_count: int = 0
    time_spent_min: int = 0


class MeScoreDistributionRead(BaseModel):
    band_1_to_3: int = 0
    band_3_5_to_5: int = 0
    band_5_to_6_5: int = 0
    band_6_5_to_7_5: int = 0
    band_7_5_to_9: int = 0


class MePersonalBestsRead(BaseModel):
    best_band: float | None = None
    best_accuracy: float | None = None
    longest_streak: int = 0
    current_streak: int = 0
    fastest_full_test_sec: int | None = None


class MeSpeedMetricsRead(BaseModel):
    avg_time_per_question_sec: float | None = None
    reading_avg_sec_per_question: float | None = None
    listening_avg_sec_per_question: float | None = None


class MeImprovementRateRead(BaseModel):
    last_5_avg_band: float | None = None
    prev_5_avg_band: float | None = None
    delta: float | None = None
    percent_change: float | None = None


class MeWritingCriteriaRead(BaseModel):
    task_achievement: float | None = None
    coherence_cohesion: float | None = None
    lexical_resource: float | None = None
    grammatical_range_accuracy: float | None = None


class MeDashboardAnalyticsRead(BaseModel):
    performance_summary: MePerformanceSummaryRead = Field(default_factory=MePerformanceSummaryRead)
    writing_criteria: MeWritingCriteriaRead | None = Field(default=None)
    question_type_analysis: list[MeQuestionTypeAnalysisItemRead] = Field(default_factory=list)
    comparison: MeQuestionTypeComparisonRead = Field(default_factory=MeQuestionTypeComparisonRead)
    error_distribution: list[MeErrorDistributionItemRead] = Field(default_factory=list)
    progress_series: list[MeBandProgressPointRead] = Field(default_factory=list)
    accuracy_trend: list[MeAccuracyTrendPointRead] = Field(default_factory=list)
    weekly_activity: list[MeWeeklyActivityPointRead] = Field(default_factory=list)
    score_distribution: MeScoreDistributionRead = Field(default_factory=MeScoreDistributionRead)
    personal_bests: MePersonalBestsRead = Field(default_factory=MePersonalBestsRead)
    speed_metrics: MeSpeedMetricsRead = Field(default_factory=MeSpeedMetricsRead)
    improvement_rate: MeImprovementRateRead = Field(default_factory=MeImprovementRateRead)
