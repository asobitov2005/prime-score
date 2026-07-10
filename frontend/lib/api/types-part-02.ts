import { GiftCodeRecordResponse, GiftCodeSummaryResponse } from "./types-part-01";

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

export interface DashboardAnalyticsSpeakingCriteriaRead {
  fluency?: number | null;
  lexical_resource?: number | null;
  grammar?: number | null;
  pronunciation?: number | null;
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
  current_worked_count?: number;
  current_error_count?: number;
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
