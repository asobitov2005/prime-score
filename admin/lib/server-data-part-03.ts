import { AdminDashboardOverview, AdminTestDraftState, TestType, createEmptyDraft } from "./server-data-dependencies";
import { BackendAdminDraft } from "./server-data-part-01";
import { mapAdminDraft, requestAdmin } from "./server-data-part-02";

export async function getAdminTestDraft(testId?: string, type: TestType = "reading"): Promise<AdminTestDraftState | null> {
  if (!testId) {
    return createEmptyDraft(type);
  }

  try {
    const draft = await requestAdmin<BackendAdminDraft>(`/tests/${testId}/draft`);
    return mapAdminDraft(draft);
  } catch (error) {
    if ((error as { status?: number } | null)?.status === 404) {
      return null;
    }
    throw error;
  }
}

export type BackendDashboard = {
  users_total: number;
  users_new_today?: number;
  active_users_7d?: number;
  premium_users: number;
  tests_total: number;
  tests_published: number;
  tests_draft: number;
  tests_archived: number;
  attempts_total: number;
  attempts_completed: number;
  attempts_today?: number;
  payments_pending: number;
  payments_completed?: number;
  revenue_total?: number | string;
  average_band?: number | null;
  completion_rate?: number;
  premium_rate?: number;
  recent_activity?: string[];
  revenue_trend?: Array<{ date: string; value: number }>;
  registration_trend?: Array<{ date: string; value: number }>;
  attempts_by_day?: Array<{ date: string; value: number }>;
  type_split?: { reading: number; listening: number };
  band_distribution?: Array<{ band: string; count: number }>;
  top_active_users?: Array<{ name: string; attempt_count: number; last_active?: string | null }>;
  avg_time_per_test?: { reading_avg_min?: number | null; listening_avg_min?: number | null };
  payment_method_split?: Array<{ label: string; value: number }>;
  attempt_status_split?: Array<{ label: string; value: number }>;
  quick_stats?: {
    fastest_completion_min?: number | null;
    average_accuracy?: number | null;
    highest_band_achieved?: number | null;
  };
};

export type BackendUser = {
  id: string;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  premium_until?: string | null;
  premium_expires_at?: string | null;
  show_on_leaderboard: boolean;
  created_at?: string | null;
};

export type BackendPlan = {
  id: string;
  name: string;
  duration_days: number;
  price: number | string;
  badge_label?: string | null;
  perks?: string[];
  display_order?: number;
  is_featured?: boolean;
  is_active?: boolean;
};

export type BackendPromoCode = {
  id: string;
  code: string;
  discount_percent: number;
  current_uses?: number;
  max_uses?: number;
  expires_at?: string | null;
  is_active?: boolean;
};

export type BackendAudit = {
  id: string;
  admin_id?: string;
  actor_user_id?: string;
  action: string;
  entity_type?: string;
  target_type?: string;
  entity_id?: string;
  target_id?: string;
  changes?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  created_at: string;
};

export type BackendPayment = {
  id: string;
  invoice_code: string;
  user_name?: string | null;
  user_username?: string | null;
  plan_name: string;
  method: "card_transfer" | "manual" | "payme" | "click" | "uzum";
  status: "paused" | "pending" | "matched" | "completed" | "expired" | "canceled" | "review" | "failed" | "refunded";
  amount: number | string;
  card_number?: string | null;
  expires_at?: string | null;
  status_reason?: string | null;
  updated_at?: string | null;
};

export type BackendPaymentCard = {
  id: string;
  label: string;
  card_number: string;
  card_type: string;
  holder_name?: string | null;
  is_active: boolean;
  priority: number;
};

export type BackendPaymentSettings = {
  id: string;
  support_contact?: string | null;
};

export function emptyDashboardOverview(): AdminDashboardOverview {
  return {
    usersTotal: 0,
    usersNewToday: 0,
    activeUsers7d: 0,
    premiumUsers: 0,
    testsTotal: 0,
    testsPublished: 0,
    testsDraft: 0,
    testsArchived: 0,
    attemptsTotal: 0,
    attemptsCompleted: 0,
    attemptsToday: 0,
    paymentsPending: 0,
    paymentsCompleted: 0,
    revenueTotal: 0,
    averageBand: null,
    completionRate: 0,
    premiumRate: 0,
    recentActivity: [],
    revenueTrend: [],
    registrationTrend: [],
    attemptsByDay: [],
    typeSplit: null,
    bandDistribution: [],
    topActiveUsers: [],
    avgTimePerTest: null,
    paymentMethodSplit: [],
    attemptStatusSplit: [],
    quickStats: null,
  };
}
