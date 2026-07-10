import { DashboardAnalyticsQuestionTypeAnalysisRead, DashboardAnalyticsQuestionTypeComparisonRead, DashboardAnalyticsSpeakingCriteriaRead, DashboardAnalyticsWritingCriteriaRead } from "./types-part-02";

export interface DashboardAnalyticsErrorDistributionRead {
  label: string;
  error_count: number;
  share: number;
}

export interface DashboardAnalyticsBandProgressRead {
  label: string;
  occurred_at: string;
  reading?: number | null;
  listening?: number | null;
  writing?: number | null;
  speaking?: number | null;
}

export interface DashboardAnalyticsPerformanceStudyTimeRead {
  total_time_sec: number;
  reading_time_sec: number;
  listening_time_sec: number;
  writing_time_sec?: number;
  speaking_time_sec?: number;
}

export interface DashboardAnalyticsPerformanceTestCountBucketRead {
  full_count: number;
  section_1_count: number;
  section_2_count: number;
  section_3_count: number;
  section_4_count: number;
}

export interface DashboardAnalyticsPerformanceSummaryRead {
  study_time: DashboardAnalyticsPerformanceStudyTimeRead;
  reading: DashboardAnalyticsPerformanceTestCountBucketRead;
  listening: DashboardAnalyticsPerformanceTestCountBucketRead;
  writing?: DashboardAnalyticsPerformanceTestCountBucketRead;
  speaking?: DashboardAnalyticsPerformanceTestCountBucketRead;
}

export interface DashboardAnalyticsSectionAnalysisRead {
  section_number: number;
  label: string;
  worked_count: number;
  correct_count: number;
  accuracy: number;
  attempts_count: number;
  avg_time_sec?: number | null;
}

export interface DashboardAnalyticsSkillFocusRead {
  key: string;
  label: string;
  value?: number | null;
  value_label: string;
  subtext?: string | null;
  status?: string | null;
}

export interface DashboardAnalyticsTimeAnalysisRead {
  avg_time_per_test_sec?: number | null;
  recommended_time_sec?: number | null;
  time_management_status: string;
  slowest_section?: DashboardAnalyticsSectionAnalysisRead | null;
  fastest_section?: DashboardAnalyticsSectionAnalysisRead | null;
  unanswered_avg_percent?: number | null;
}

export interface DashboardAnalyticsResponse {
  performance_summary: DashboardAnalyticsPerformanceSummaryRead;
  writing_criteria?: DashboardAnalyticsWritingCriteriaRead | null;
  speaking_criteria?: DashboardAnalyticsSpeakingCriteriaRead | null;
  question_type_analysis: DashboardAnalyticsQuestionTypeAnalysisRead[];
  comparison: DashboardAnalyticsQuestionTypeComparisonRead;
  error_distribution: DashboardAnalyticsErrorDistributionRead[];
  progress_series: DashboardAnalyticsBandProgressRead[];
  accuracy_trend?: Array<{ date: string; accuracy: number; band?: number | null; test_type?: string | null }>;
  weekly_activity?: Array<{ week_label: string; attempts_count: number; time_spent_min: number }>;
  score_distribution?: { band_1_to_3: number; band_3_5_to_5: number; band_5_to_6_5: number; band_6_5_to_7_5: number; band_7_5_to_9: number };
  personal_bests?: { best_band?: number | null; best_accuracy?: number | null; longest_streak: number; current_streak: number; fastest_full_test_sec?: number | null };
  speed_metrics?: { avg_time_per_question_sec?: number | null; reading_avg_sec_per_question?: number | null; listening_avg_sec_per_question?: number | null };
  improvement_rate?: { last_5_avg_band?: number | null; prev_5_avg_band?: number | null; delta?: number | null; percent_change?: number | null };
  section_analysis?: DashboardAnalyticsSectionAnalysisRead[];
  skill_focus?: DashboardAnalyticsSkillFocusRead[];
  time_analysis?: DashboardAnalyticsTimeAnalysisRead | null;
}
