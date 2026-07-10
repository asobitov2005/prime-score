import { AdminAuditEntry, AdminDashboardKpi, AdminDashboardOverview, AdminPaymentCardSummary, AdminPaymentSettingsSummary, AdminPaymentSummary, AdminPlanSummary, AdminPromoCodeSummary, AdminUserSummary } from "./server-data-dependencies";
import { requestAdmin } from "./server-data-part-02";
import { BackendAudit, BackendDashboard, BackendPayment, BackendPaymentCard, BackendPaymentSettings, BackendPlan, BackendPromoCode, BackendUser, emptyDashboardOverview } from "./server-data-part-03";

export function mapDashboardOverview(dashboard: BackendDashboard): AdminDashboardOverview {
  return {
    usersTotal: dashboard.users_total,
    usersNewToday: dashboard.users_new_today ?? 0,
    activeUsers7d: dashboard.active_users_7d ?? 0,
    premiumUsers: dashboard.premium_users,
    testsTotal: dashboard.tests_total,
    testsPublished: dashboard.tests_published,
    testsDraft: dashboard.tests_draft,
    testsArchived: dashboard.tests_archived,
    attemptsTotal: dashboard.attempts_total,
    attemptsCompleted: dashboard.attempts_completed,
    attemptsToday: dashboard.attempts_today ?? 0,
    paymentsPending: dashboard.payments_pending,
    paymentsCompleted: dashboard.payments_completed ?? 0,
    revenueTotal: typeof dashboard.revenue_total === "number"
      ? dashboard.revenue_total
      : Number(String(dashboard.revenue_total ?? 0).replace(/[^\d.-]/g, "")) || 0,
    averageBand: dashboard.average_band ?? null,
    completionRate: dashboard.completion_rate ?? 0,
    premiumRate: dashboard.premium_rate ?? 0,
    recentActivity: Array.isArray(dashboard.recent_activity) ? dashboard.recent_activity.map(String) : [],
    revenueTrend: (dashboard.revenue_trend ?? []).map(p => ({ date: p.date, value: p.value })),
    registrationTrend: (dashboard.registration_trend ?? []).map(p => ({ date: p.date, value: p.value })),
    attemptsByDay: (dashboard.attempts_by_day ?? []).map(p => ({ date: p.date, value: p.value })),
    typeSplit: dashboard.type_split ? { reading: dashboard.type_split.reading, listening: dashboard.type_split.listening } : null,
    bandDistribution: (dashboard.band_distribution ?? []).map(p => ({ band: p.band, count: p.count })),
    topActiveUsers: (dashboard.top_active_users ?? []).map(u => ({ name: u.name, attemptCount: u.attempt_count, lastActive: u.last_active ?? null })),
    avgTimePerTest: dashboard.avg_time_per_test ? { readingAvgMin: dashboard.avg_time_per_test.reading_avg_min ?? null, listeningAvgMin: dashboard.avg_time_per_test.listening_avg_min ?? null } : null,
    paymentMethodSplit: (dashboard.payment_method_split ?? []).map(p => ({ label: p.label, value: p.value })),
    attemptStatusSplit: (dashboard.attempt_status_split ?? []).map(s => ({ label: s.label, value: s.value })),
    quickStats: dashboard.quick_stats ? {
      fastestCompletionMin: dashboard.quick_stats.fastest_completion_min ?? null,
      averageAccuracy: dashboard.quick_stats.average_accuracy ?? 0,
      highestBandAchieved: dashboard.quick_stats.highest_band_achieved ?? null,
    } : null,
  };
}

export async function getAdminDashboardOverview(params?: Record<string, string>): Promise<AdminDashboardOverview> {
  try {
    const qs = params ? new URLSearchParams(params).toString() : "";
    const endpoint = qs ? `/dashboard?${qs}` : "/dashboard";
    const dashboard = await requestAdmin<BackendDashboard>(endpoint);
    return mapDashboardOverview(dashboard);
  } catch {
    return emptyDashboardOverview();
  }
}

export async function getAdminDashboardKpis(params?: Record<string, string>): Promise<AdminDashboardKpi[]> {
  try {
    const dashboard = await getAdminDashboardOverview(params);
    return [
      { label: "Users", value: dashboard.usersTotal.toString(), delta: `${dashboard.activeUsers7d} active in 7 days`, tone: "neutral" },
      { label: "Premium", value: dashboard.premiumUsers.toString(), delta: `${dashboard.premiumRate}% conversion`, tone: "success" },
      { label: "Tests", value: dashboard.testsTotal.toString(), delta: `${dashboard.testsPublished} published / ${dashboard.testsDraft} draft`, tone: "warning" },
      { label: "Payments Pending", value: dashboard.paymentsPending.toString(), delta: "Awaiting settlement", tone: dashboard.paymentsPending > 0 ? "warning" : "neutral" }
    ];
  } catch {
    return [];
  }
}

export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  try {
    const users = await requestAdmin<BackendUser[]>("/users");
    return users.map((item) => ({
      id: item.id,
      name: `${item.first_name}${item.last_name ? ` ${item.last_name}` : ""}`.trim(),
      email: item.username ? `@${item.username}` : "No username",
      premiumState: item.premium_until ? "active" : "free",
      attempts: 0,
      band: "-",
      lastActiveAt: item.created_at ?? new Date().toISOString(),
      leaderboardVisible: item.show_on_leaderboard
    }));
  } catch {
    return [];
  }
}

export async function getAdminPlans(): Promise<AdminPlanSummary[]> {
  try {
    const plans = await requestAdmin<BackendPlan[]>("/plans");
    return plans.map((item) => ({
      id: item.id,
      name: item.name,
      durationDays: item.duration_days,
      price: typeof item.price === "number" ? item.price : Number(String(item.price).replace(/[^\d.-]/g, "")),
      badgeLabel: (item.badge_label ?? "").trim(),
      perks: Array.isArray(item.perks) ? item.perks.map((perk) => String(perk ?? "").trim()).filter(Boolean) : [],
      displayOrder: item.display_order ?? 0,
      isActive: item.is_active !== false,
      isFeatured: item.is_featured === true
    }));
  } catch {
    return [];
  }
}

export async function getAdminPayments(page: number = 1, limit: number = 20): Promise<{ items: AdminPaymentSummary[], total: number, page: number }> {
  try {
    const response = await requestAdmin<{ items: BackendPayment[], total: number, page: number }>(`/payments?page=${page}&limit=${limit}`);
    return {
      items: response.items.map((item) => ({
        id: item.id,
        invoiceCode: item.invoice_code,
        user: item.user_name ?? (item.user_username ? `@${item.user_username}` : "Unknown user"),
        plan: item.plan_name,
        method: item.method,
        status: item.status,
        amount: typeof item.amount === "number" ? item.amount.toLocaleString("en-US") : String(item.amount),
        card: item.card_number ?? "-",
        expiresAt: item.expires_at ?? null,
        statusReason: item.status_reason ?? null,
        updatedAt: item.updated_at ?? new Date().toISOString(),
      })),
      total: response.total,
      page: response.page,
    };
  } catch {
    return { items: [], total: 0, page: 1 };
  }
}

export async function getAdminPaymentCards(): Promise<AdminPaymentCardSummary[]> {
  try {
    const cards = await requestAdmin<BackendPaymentCard[]>("/payment-cards");
    return cards.map((item) => ({
      id: item.id,
      label: item.label,
      cardNumber: item.card_number,
      cardType: item.card_type,
      holderName: item.holder_name ?? null,
      isActive: item.is_active,
      priority: item.priority,
    }));
  } catch {
    return [];
  }
}

export async function getAdminPaymentSettings(): Promise<AdminPaymentSettingsSummary | null> {
  try {
    const item = await requestAdmin<BackendPaymentSettings>("/payment-settings");
    return {
      id: item.id,
      supportContact: item.support_contact ?? null,
    };
  } catch {
    return null;
  }
}

export async function getAdminPromoCodes(): Promise<AdminPromoCodeSummary[]> {
  try {
    const promoCodes = await requestAdmin<BackendPromoCode[]>("/promo-codes");
    return promoCodes.map((item) => ({
      id: item.id,
      code: item.code,
      discount: `${item.discount_percent}%`,
      uses: `${item.current_uses ?? 0} / ${item.max_uses ?? "-"}`,
      validUntil: item.expires_at ?? new Date().toISOString(),
      status: item.is_active === false ? "paused" : "active"
    }));
  } catch {
    return [];
  }
}

export async function getAdminAuditEntries(): Promise<AdminAuditEntry[]> {
  try {
    const entries = await requestAdmin<BackendAudit[]>("/audit-log");
    return entries.map((entry) => ({
      id: entry.id,
      actor: entry.actor_user_id ?? entry.admin_id ?? "admin",
      action: entry.action,
      resource: `${entry.entity_type ?? entry.target_type ?? "resource"}:${entry.entity_id ?? entry.target_id ?? "-"}`,
      createdAt: entry.created_at,
      meta: Object.keys(entry.meta ?? entry.changes ?? {}).length > 0 ? JSON.stringify(entry.meta ?? entry.changes) : "-"
    }));
  } catch {
    return [];
  }
}
