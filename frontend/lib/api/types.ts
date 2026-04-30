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

export interface RedeemResponse {
  message: string;
  code: string;
  plan_name: string;
  duration_days: number;
  is_premium: boolean;
  premium_until: string;
}

export interface CreatePaymentBody {
  plan_id: string;
}

export interface PaymentRecordResponse {
  id: string;
  invoice_code: string;
  plan_id?: string | null;
  plan_name: string;
  duration_days?: number | null;
  method: "card_transfer" | "manual" | "payme" | "click" | "uzum";
  status: "pending" | "matched" | "completed" | "expired" | "canceled" | "review" | "failed";
  base_amount: string | number;
  compare_at_amount: string | number;
  amount: string | number;
  discount_amount: string | number;
  currency: string;
  card_label?: string | null;
  card_number?: string | null;
  wheel_options?: Array<string | number>;
  expires_at?: string | null;
  matched_at?: string | null;
  paid_at?: string | null;
  archived_at?: string | null;
  granted_until?: string | null;
  status_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreatePaymentResponse {
  message: string;
  payment: PaymentRecordResponse;
}

export interface CancelPaymentResponse {
  message: string;
  payment: PaymentRecordResponse;
}

export interface MeProfileUpdateBody {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  show_on_leaderboard?: boolean;
}

export interface MeProfileRead {
  id: string;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  role: string;
  is_premium: boolean;
  premium_until?: string | null;
  show_on_leaderboard: boolean;
  telegram_id?: number | null;
  last_active_at?: string | null;
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
