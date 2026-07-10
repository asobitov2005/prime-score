from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.schemas.me_dependencies import *
from app.schemas.me_part_01 import MeAccuracyTrendPointRead, MeBandProgressPointRead, MeErrorDistributionItemRead, MeImprovementRateRead, MePerformanceSummaryRead, MePersonalBestsRead, MeQuestionTypeAnalysisItemRead, MeQuestionTypeComparisonRead, MeScoreDistributionRead, MeSectionAnalysisItemRead, MeSkillFocusItemRead, MeSpeakingCriteriaRead, MeSpeedMetricsRead, MeWeeklyActivityPointRead, MeWritingCriteriaRead

class MeSkillTimeAnalysisRead(BaseModel):
    avg_time_per_test_sec: int | None = None
    recommended_time_sec: int | None = None
    time_management_status: str = "No timing data"
    slowest_section: MeSectionAnalysisItemRead | None = None
    fastest_section: MeSectionAnalysisItemRead | None = None
    unanswered_avg_percent: float | None = None

class MeDashboardAnalyticsRead(BaseModel):
    performance_summary: MePerformanceSummaryRead = Field(default_factory=MePerformanceSummaryRead)
    writing_criteria: MeWritingCriteriaRead | None = Field(default=None)
    speaking_criteria: MeSpeakingCriteriaRead | None = Field(default=None)
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
    section_analysis: list[MeSectionAnalysisItemRead] = Field(default_factory=list)
    skill_focus: list[MeSkillFocusItemRead] = Field(default_factory=list)
    time_analysis: MeSkillTimeAnalysisRead = Field(default_factory=MeSkillTimeAnalysisRead)

class MeLevelProgressRead(BaseModel):
    level: int = 1
    level_floor_xp: int = 0
    next_level_xp: int = 100
    xp_into_level: int = 0
    xp_needed_for_next_level: int = 100
    progress_percent: float = 0.0

class MeXpSummaryRead(BaseModel):
    total_xp: int = 0
    level: int = 1
    current_streak: int = 0
    best_streak: int = 0
    weekly_xp: int = 0
    monthly_xp: int = 0
    latest_xp_gain: int | None = None
    progress: MeLevelProgressRead = Field(default_factory=MeLevelProgressRead)

class MeXpTransactionRead(BaseModel):
    id: UUID
    type: str
    source_type: str
    source_id: str | None = None
    xp_amount: int
    message: str
    flagged: bool = False
    created_at: datetime
    metadata: dict = Field(default_factory=dict)
