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

export interface LeaderboardUserProfileResponse {
  user_id: string;
  avatar_url?: string | null;
  display_name: string;
  level: number;
  total_xp: number;
  rank: number;
  is_online: boolean;
  is_premium: boolean;
  current_streak: number;
  equipped_badge?: {
    title: string;
    rarity: string;
    tagline: string;
    image?: string | null;
  } | null;
  active_titles: string[];
  stats: {
    longest_streak: number;
    highest_band?: number | null;
    total_mock_tests: number;
    total_study_hours: number;
    accuracy?: number | null;
    achievements_unlocked: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    rarity: string;
    image?: string | null;
  }>;
  achievement_catalog: Array<{
    id: string;
    title: string;
    description: string;
    category: "level" | "streak" | "skill" | "performance" | "special";
    skill_type?: "reading" | "listening" | "writing" | "speaking" | null;
    rarity: string;
    image?: string | null;
    status: "unlocked" | "in_progress" | "locked";
    requirement: string;
    required_xp?: number | null;
    unlock_level?: number | null;
    streak_days?: number | null;
    xp_reward?: number | null;
    unlocked_at?: string | null;
    progress?: {
      current: number;
      target: number;
      label: string;
    } | null;
  }>;
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

export interface GenerateGiftCodeBody {
  gift_days: number;
}

export interface RedeemResponse {
  message: string;
  code: string;
  plan_name: string;
  duration_days: number;
  is_premium: boolean;
  premium_until: string;
}

export interface GiftCodeSummaryItemResponse {
  gift_days: number;
  total_count: number;
  generated_count: number;
  available_count: number;
}

export interface GiftCodeRecordResponse {
  id: string;
  code: string;
  duration_days: number;
  status: "available" | "paused" | "redeemed" | "revoked" | "expired";
  expires_at?: string | null;
  redeemed_at?: string | null;
  created_at?: string | null;
}

export interface GiftCodeSummaryResponse {
  items: GiftCodeSummaryItemResponse[];
  recent_codes: GiftCodeRecordResponse[];
  total_available_count: number;
  can_generate: boolean;
}

export interface GenerateGiftCodeResponse {
  message: string;
  gift_code: GiftCodeRecordResponse;
  summary: GiftCodeSummaryResponse;
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
  support_contact?: string | null;
  payment_instructions?: string | null;
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
  phone?: string | null;
  avatar_url?: string | null;
  role: string;
  is_premium: boolean;
  premium_until?: string | null;
  show_on_leaderboard: boolean;
  telegram_id?: number | null;
  last_active_at?: string | null;
  created_at?: string | null;
  total_xp?: number;
  current_level?: number;
  current_streak?: number;
  best_streak?: number;
}

export interface XpSummaryResponse {
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
    phone?: string | null;
    avatar_url?: string | null;
    is_premium: boolean;
    premium_until?: string | null;
    telegram_id?: number | null;
    created_at?: string | null;
  };
}

export interface DashboardAnalyticsWritingCriteriaRead {
  task_achievement?: number | null;
  coherence_cohesion?: number | null;
  lexical_resource?: number | null;
  grammatical_range_accuracy?: number | null;
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
  writing?: number | null;
}

export interface DashboardAnalyticsPerformanceStudyTimeRead {
  total_time_sec: number;
  reading_time_sec: number;
  listening_time_sec: number;
  writing_time_sec?: number;
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
}

export interface DashboardAnalyticsResponse {
  performance_summary: DashboardAnalyticsPerformanceSummaryRead;
  writing_criteria?: DashboardAnalyticsWritingCriteriaRead | null;
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
}
