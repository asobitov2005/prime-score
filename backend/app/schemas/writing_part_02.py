from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.schemas.writing_dependencies import *
from app.schemas.writing_part_01 import WritingActionPlan, WritingBandBoundary, WritingChecklistItem, WritingCriterionFeedback, WritingErrorPattern, WritingInlineAnnotation, WritingRevisionDiff, WritingRoastFeedback, WritingScoreBooster, WritingSelectedBenchmark, WritingSentenceFix, WritingTargetAction, WritingVocabularySuggestion

class WritingEvaluationRead(BaseModel):
    submission_id: UUID
    task_id: UUID
    task_type: WritingTaskType
    task_title: str
    word_count: int
    word_minimum: int
    desired_score: float | None = None
    time_spent_seconds: int
    submitted_at: datetime
    graded_at: datetime
    essay_text: str
    overall_band: float
    potential_band: float | None = None
    word_count_penalty: float = 0.0
    task_achievement: WritingCriterionFeedback
    coherence: WritingCriterionFeedback
    lexical: WritingCriterionFeedback
    grammar: WritingCriterionFeedback
    inline_annotations: list[WritingInlineAnnotation] = Field(default_factory=list)
    vocabulary_suggestions: list[WritingVocabularySuggestion] = Field(default_factory=list)
    improved_version: str | None = None
    overall_summary: str = ""
    next_steps: list[str] = Field(default_factory=list)
    action_plan: WritingActionPlan | None = None
    target_action_plan: list[WritingTargetAction] = Field(default_factory=list)
    band_boundaries: list[WritingBandBoundary] = Field(default_factory=list)
    score_boosters: list[WritingScoreBooster] = Field(default_factory=list)
    checklist: list[WritingChecklistItem] = Field(default_factory=list)
    error_patterns: list[WritingErrorPattern] = Field(default_factory=list)
    history_error_trends: list[WritingErrorPattern] = Field(default_factory=list)
    sentence_fixes: list[WritingSentenceFix] = Field(default_factory=list)
    revision_diff: list[WritingRevisionDiff] = Field(default_factory=list)
    roast: WritingRoastFeedback | None = None
    is_ai_estimate: bool = True
    confidence: str = "Medium"
    possible_score_range: str = ""
    selected_benchmarks: list[WritingSelectedBenchmark] = Field(default_factory=list)
    calibration_result: dict = Field(default_factory=dict)
    audit_result: dict = Field(default_factory=dict)
    meta_learning_note: str = ""
    cache_hit: bool = False
    model_version: str = ""
    prompt_version: str = "v1"
    grader_profile_version: int | None = None
    rubric_version: int | None = None
    anchor_set_version: int | None = None
    roast_profile_version: int | None = None
    improved_profile_version: int | None = None
    annotation_profile_version: int | None = None
    xp_awarded_total: int = 0
    xp_breakdown: dict = Field(default_factory=dict)
    xp_level_after: int | None = None
    xp_current_streak: int | None = None

class WritingHistoryItem(BaseModel):
    submission_id: UUID
    task_id: UUID
    task_title: str
    task_type: WritingTaskType
    word_count: int
    time_spent_seconds: int = 0
    overall_band: float | None = None
    status: WritingSubmissionStatus
    submitted_at: datetime
    graded_at: datetime | None = None

class WritingHistoryResponse(BaseModel):
    items: list[WritingHistoryItem]
    total: int

class WritingDashboardSummary(BaseModel):
    total_submissions: int = 0
    average_band: float | None = None
    best_band: float | None = None
    last_band: float | None = None
    last_submitted_at: datetime | None = None
    task_1_average: float | None = None
    task_2_average: float | None = None
    task_1_best: float | None = None
    task_2_best: float | None = None
    task_1_last: float | None = None
    task_2_last: float | None = None

class WritingLimitRead(BaseModel):
    is_premium: bool
    premium_until: datetime | None = None
    daily_limit: int | None = None
    used_today: int
    remaining_today: int | None = None
    can_submit: bool
    reset_at: datetime
    plan_name: str | None = None
