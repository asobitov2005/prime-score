import { TestType } from "./server-me-dependencies";
import { BackendAccuracyTrendPoint, BackendImprovementRate, BackendPersonalBests, BackendScoreDistribution, BackendSectionAnalysisItem, BackendSkillFocusItem, BackendSkillTimeAnalysis, BackendSpeedMetrics, BackendWeeklyActivityPoint } from "./server-me-part-02";

export type BackendMeStats = {
  attempts_total: number;
  average_band?: number | null;
  reading_band?: number | null;
  listening_band?: number | null;
  leaderboard_rank?: number | null;
  active_sessions: number;
  total_xp?: number;
  current_level?: number;
  weekly_xp?: number;
  monthly_xp?: number;
};

export type BackendXpSummary = {
  total_xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  weekly_xp: number;
  monthly_xp: number;
  latest_xp_gain?: number | null;
  progress: {
    level: number;
    level_floor_xp: number;
    next_level_xp: number;
    xp_into_level: number;
    xp_needed_for_next_level: number;
    progress_percent: number;
  };
};

export type BackendMeActivityPoint = {
  activity_date: string;
  attempts_count: number;
  time_spent_sec: number;
  reading_time_sec: number;
  listening_time_sec: number;
  writing_time_sec: number;
  speaking_time_sec?: number;
};

export type BackendMeAttempt = {
  attempt_id: string;
  test_id: string;
  test_title: string;
  test_type: TestType;
  test_format?: "full" | "passage_1" | "passage_2" | "passage_3" | "part_1" | "part_2" | "part_3" | "part_4" | null;
  mode: "practice" | "exam";
  status: "draft" | "in_progress" | "completed" | "archived" | "auto_submitted";
  source?: string | null;
  raw_score?: number | null;
  band_score?: number | string | null;
  total_questions?: number | null;
  time_spent_sec?: number | null;
  answered_count?: number | null;
  progress_percent?: number | null;
  time_limit_seconds?: number | null;
  last_answered_question_number?: number | null;
  started_at: string;
  completed_at?: string | null;
  updated_at?: string | null;
  violation_count?: number;
};

export type BackendQuestionTypeAnalysisItem = {
  label: string;
  worked_count: number;
  correct_count: number;
  accuracy: number;
  error_count: number;
};

export type BackendQuestionTypeComparisonItem = {
  label: string;
  previous_accuracy?: number | null;
  current_accuracy?: number | null;
  delta?: number | null;
  accuracies?: Array<number | null>;
  current_worked_count?: number;
  current_error_count?: number;
};

export type BackendQuestionTypeComparisonTest = {
  test_title: string;
  test_date: string;
};

export type BackendQuestionTypeComparison = {
  previous_test_title?: string | null;
  previous_test_date?: string | null;
  current_test_title?: string | null;
  current_test_date?: string | null;
  tests: BackendQuestionTypeComparisonTest[];
  items: BackendQuestionTypeComparisonItem[];
};

export type BackendErrorDistributionItem = {
  label: string;
  error_count: number;
  share: number;
};

export type BackendBandProgressPoint = {
  label: string;
  occurred_at: string;
  reading?: number | null;
  listening?: number | null;
  writing?: number | null;
  speaking?: number | null;
};

export type BackendPerformanceStudyTime = {
  total_time_sec: number;
  reading_time_sec: number;
  listening_time_sec: number;
  writing_time_sec?: number | null;
  speaking_time_sec?: number | null;
};

export type BackendPerformanceTestCountBucket = {
  full_count: number;
  section_1_count: number;
  section_2_count: number;
  section_3_count: number;
  section_4_count: number;
};

export type BackendPerformanceSummary = {
  study_time: BackendPerformanceStudyTime;
  reading: BackendPerformanceTestCountBucket;
  listening: BackendPerformanceTestCountBucket;
  writing?: BackendPerformanceTestCountBucket | null;
  speaking?: BackendPerformanceTestCountBucket | null;
};

export type BackendWritingCriteria = {
  task_achievement?: number | null;
  coherence_cohesion?: number | null;
  lexical_resource?: number | null;
  grammatical_range_accuracy?: number | null;
};

export type BackendSpeakingCriteria = {
  fluency?: number | null;
  lexical_resource?: number | null;
  grammar?: number | null;
  pronunciation?: number | null;
};

export type BackendDashboardAnalytics = {
  performance_summary: BackendPerformanceSummary;
  writing_criteria?: BackendWritingCriteria | null;
  speaking_criteria?: BackendSpeakingCriteria | null;
  question_type_analysis: BackendQuestionTypeAnalysisItem[];
  comparison: BackendQuestionTypeComparison;
  error_distribution: BackendErrorDistributionItem[];
  progress_series: BackendBandProgressPoint[];
  accuracy_trend?: BackendAccuracyTrendPoint[];
  weekly_activity?: BackendWeeklyActivityPoint[];
  score_distribution?: BackendScoreDistribution;
  personal_bests?: BackendPersonalBests;
  speed_metrics?: BackendSpeedMetrics;
  improvement_rate?: BackendImprovementRate;
  section_analysis?: BackendSectionAnalysisItem[];
  skill_focus?: BackendSkillFocusItem[];
  time_analysis?: BackendSkillTimeAnalysis | null;
};
