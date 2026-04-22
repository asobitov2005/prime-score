import type {
  AccessType,
  AttemptMode,
  LeaderboardPeriod,
  TestScope,
  TestType
} from "@/lib/types";

export interface ApiListResponse<T> {
  data: T[];
  meta?: {
    total: number;
    page?: number;
    pageSize?: number;
  };
}

export interface AuthRequestCodeBody {
  telegramId: string;
}

export interface AuthVerifyCodeBody {
  telegramId: string;
  code: string;
}

export interface TestListQuery {
  type?: TestType;
  access?: AccessType;
}

export interface StartAttemptBody {
  scope: TestScope;
  sectionId?: string;
  mode: AttemptMode;
}

export interface SaveAnswerBody {
  questionId: string;
  value: string | string[];
}

export interface LeaderboardQuery {
  type?: TestType | "combined";
  period?: LeaderboardPeriod;
}

export interface SubscribeBody {
  planId: string;
  paymentMethod: "payme" | "click" | "uzum";
  promoCode?: string;
  isGift?: boolean;
}

export interface RedeemBody {
  code: string;
}

export interface AuthSessionRead {
  id: string;
  user_id: string;
  device_info: Record<string, string>;
  ip_address?: string;
  is_active: boolean;
  expires_at: string;
  last_used_at?: string;
}

export interface AuthSessionListResponse {
  items: AuthSessionRead[];
}

export interface AuthSessionStatusResponse {
  session_id: string;
  user: {
    id: string;
    first_name: string;
    last_name?: string | null;
    username?: string | null;
    is_premium: boolean;
    premium_until?: string | null;
    telegram_id?: number | null;
  };
}

export interface DashboardAnalyticsQuestionTypeAnalysisRead {
  label: string;
  worked_count: number;
  correct_count: number;
  accuracy: number;
  error_count: number;
}

export interface DashboardAnalyticsQuestionTypeComparisonItemRead {
  label: string;
  previous_accuracy?: number | null;
  current_accuracy?: number | null;
  delta?: number | null;
  accuracies?: Array<number | null>;
}

export interface DashboardAnalyticsQuestionTypeComparisonTestRead {
  test_title: string;
  test_date: string;
}

export interface DashboardAnalyticsQuestionTypeComparisonRead {
  previous_test_title?: string | null;
  previous_test_date?: string | null;
  current_test_title?: string | null;
  current_test_date?: string | null;
  tests: DashboardAnalyticsQuestionTypeComparisonTestRead[];
  items: DashboardAnalyticsQuestionTypeComparisonItemRead[];
}

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
}

export interface DashboardAnalyticsPerformanceStudyTimeRead {
  total_time_sec: number;
  reading_time_sec: number;
  listening_time_sec: number;
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
}

export interface DashboardAnalyticsResponse {
  performance_summary: DashboardAnalyticsPerformanceSummaryRead;
  question_type_analysis: DashboardAnalyticsQuestionTypeAnalysisRead[];
  comparison: DashboardAnalyticsQuestionTypeComparisonRead;
  error_distribution: DashboardAnalyticsErrorDistributionRead[];
  progress_series: DashboardAnalyticsBandProgressRead[];
}
