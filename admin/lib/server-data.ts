import { cookies } from "next/headers";
import http from "node:http";
import https from "node:https";
import { getAdminServerApiBaseUrl } from "@/lib/admin-api-base";
import { createEmptyDraft } from "@/lib/draft-template";
import { ADMIN_ACCESS_COOKIE } from "@/lib/auth";
import { normalizeAdminTestSourceDetail } from "@/lib/test-source";
import type {
  AdminAnalyticsPoint,
  AdminIdentity,
  AdminAuditEntry,
  AdminDashboardOverview,
  AdminDashboardKpi,
  AdminPaymentCardSummary,
  AdminPaymentSettingsSummary,
  AdminPaymentSummary,
  AdminPlanSummary,
  AdminPromoCodeSummary,
  AdminTestDraftState,
  AdminTestSummary,
  AdminUserSummary,
  TestFormat,
  TestType
} from "@/lib/types";

const baseUrl = getAdminServerApiBaseUrl();
const ADMIN_REQUEST_TIMEOUT_MS = 60_000;
const ADMIN_REQUEST_MAX_ATTEMPTS = 3;

function requestJsonFromAdminApi(url: string, headers: Record<string, string>): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === "https:" ? https : http;
    const request = transport.request(
      parsedUrl,
      {
        method: "GET",
        headers,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 500,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );

    request.setTimeout(ADMIN_REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`Admin API request timed out after ${ADMIN_REQUEST_TIMEOUT_MS}ms`));
    });
    request.on("error", reject);
    request.end();
  });
}

function sanitizeListeningSectionTitle(type: TestType, title: string) {
  const trimmedTitle = title.trim();
  if (type !== "listening") {
    return title;
  }
  if (/^(Reading Passage|Listening Part|Passage|Part)\s+\d+\s*$/i.test(trimmedTitle)) {
    return "";
  }
  if (/^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(trimmedTitle)) {
    return "";
  }
  return title;
}

function sanitizeListeningSectionContent(type: TestType, content: string) {
  if (type !== "listening") {
    return content;
  }
  return content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !/^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(trimmed);
    })
    .join("\n")
    .trim();
}

type BackendAdminTest = {
  id: string;
  title: string;
  test_type: TestType;
  format: TestFormat;
  source: "cambridge" | "real_exam" | "custom";
  source_detail: string;
  access_type: "public" | "premium";
  status: "draft" | "published" | "archived";
  review_status?: "needs_review" | "approved" | "rejected";
  updated_at?: string | null;
  total_questions: number;
  version: number;
};

type BackendAdminDraft = {
  metadata: {
    title: string;
    type: TestType;
    format: TestFormat;
    source: "cambridge" | "real_exam" | "custom";
    source_detail: string;
    status: "draft" | "published" | "archived";
    access_type: "public" | "premium";
    version: number;
    time_limit_label: string;
  };
  content: {
    sections: Array<{
      id: string;
      label: string;
      title: string;
      subtitle: string;
      content: string;
      paragraphs?: Array<{ id: string; label: string; text: string }>;
      showLabels?: boolean;
      media_kind: "text" | "audio";
      audio_url?: string;
      audio_duration_seconds?: number | null;
      transcript?: string;
      transcript_segments?: Array<{
        id?: string;
        start_sec?: number;
        end_sec?: number;
        text?: string;
        confidence?: number;
        drift_start_sec?: number;
        drift_end_sec?: number;
        needs_review?: boolean;
      }>;
      transcript_question_locations?: Array<{
        question_id?: string | null;
        question_label?: string;
        question_prompt?: string;
        start_sec?: number;
        end_sec?: number;
        answer_text?: string;
        correct_answer?: string;
      }>;
      marker_count: number;
    }>;
  };
  questionGroups: Array<{
    id: string;
    section_id: string;
    title: string;
    instructions: string;
    type_id: string;
    question_start: number;
    question_end: number;
    shared_options: string[];
    question_block?: string;
    answer_block?: string;
    secondary_block?: string;
    raw_content?: string;
    questions: Array<{
      id: string;
      label: string;
      prompt: string;
      accepted_answers: string[];
      explanation: string;
      variants: string[];
    }>;
  }>;
  questions: Array<{
    id: string;
    section_id: string;
    label: string;
    type_id: string;
    prompt: string;
    accepted_answers: string[];
    explanation: string;
    variants: string[];
  }>;
  review: {
    checklist: Array<{
      id: string;
      label: string;
      status: "ready" | "draft" | "blocked";
      detail: string;
    }>;
    notes: string[];
  };
  decisions: {
    question_bank: {
      label: string;
      state: "not_supported";
      detail: string;
    };
    payment: {
      label: string;
      state: "paused";
      detail: string;
    };
    listening_timer: {
      label: string;
      state: "audio_duration_plus_2_minutes";
      detail: string;
    };
  };
};

async function requestAdmin<T>(path: string): Promise<T> {
  const token = cookies().get(ADMIN_ACCESS_COOKIE)?.value;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const url = `${baseUrl}${path}`;

  for (let attempt = 1; attempt <= ADMIN_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await requestJsonFromAdminApi(url, headers);
      const text = response.text;

      if (response.status < 200 || response.status >= 300) {
        console.error(`Admin API request failed for ${path} with status ${response.status}: ${text}`);
        const error = new Error(`Admin API request failed for ${path}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;
      const isRetryableStatus = status == null || status >= 500;
      const isLastAttempt = attempt === ADMIN_REQUEST_MAX_ATTEMPTS;
      if (!isRetryableStatus || isLastAttempt) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }

  throw new Error(`Admin API request failed for ${path}`);
}

type BackendAdminIdentity = {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin";
  is_active: boolean;
};

function mapAdminIdentity(admin: BackendAdminIdentity): AdminIdentity {
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    isActive: admin.is_active
  };
}

export async function getAdminMe(): Promise<AdminIdentity | null> {
  try {
    const admin = await requestAdmin<BackendAdminIdentity>("/auth/me");
    return mapAdminIdentity(admin);
  } catch {
    return null;
  }
}

function mapAdminTest(test: BackendAdminTest): AdminTestSummary {
  return {
    id: test.id,
    title: test.title,
    type: test.test_type,
    format: test.format ?? "full",
    source: test.source,
    sourceDetail: normalizeAdminTestSourceDetail(test.source, test.source_detail),
    accessType: test.access_type,
    status: test.status,
    reviewStatus: test.review_status ?? "needs_review",
    updatedAt: test.updated_at ?? new Date().toISOString(),
    questions: test.total_questions,
    version: test.version
  };
}

function mapAdminDraft(draft: BackendAdminDraft): AdminTestDraftState {
  return {
    metadata: {
      title: draft.metadata.title,
      type: draft.metadata.type,
      format: draft.metadata.format ?? "full",
      source: draft.metadata.source,
      sourceDetail: normalizeAdminTestSourceDetail(draft.metadata.source, draft.metadata.source_detail),
      accessType: draft.metadata.access_type,
      status: draft.metadata.status,
      version: draft.metadata.version,
      timeLimitLabel: draft.metadata.time_limit_label
    },
    content: {
      sections: draft.content.sections.map((section) => ({
        id: section.id,
        label: section.label,
        title: sanitizeListeningSectionTitle(draft.metadata.type, section.title),
        subtitle: section.subtitle,
        content: sanitizeListeningSectionContent(draft.metadata.type, section.content),
        paragraphs: section.paragraphs,
        showLabels: section.showLabels,
        mediaKind: section.media_kind,
        audioUrl: section.audio_url ?? "",
        audioDurationSeconds: section.audio_duration_seconds ?? null,
        transcript: section.transcript ?? "",
        transcriptSegments: (section.transcript_segments ?? []).map((segment, index) => ({
          id: String(segment.id ?? `segment-${index + 1}`),
          startSec: Number(segment.start_sec ?? 0),
          endSec: Number(segment.end_sec ?? segment.start_sec ?? 0),
          text: String(segment.text ?? ""),
          confidence: segment.confidence == null ? undefined : Number(segment.confidence),
          driftStartSec: segment.drift_start_sec == null ? undefined : Number(segment.drift_start_sec),
          driftEndSec: segment.drift_end_sec == null ? undefined : Number(segment.drift_end_sec),
          needsReview: segment.needs_review == null ? undefined : Boolean(segment.needs_review),
        })),
        transcriptQuestionLocations: (section.transcript_question_locations ?? []).map((location) => ({
          questionId: location.question_id ?? undefined,
          questionLabel: String(location.question_label ?? ""),
          questionPrompt: String(location.question_prompt ?? ""),
          startSec: Number(location.start_sec ?? 0),
          endSec: Number(location.end_sec ?? location.start_sec ?? 0),
          answerText: String(location.answer_text ?? ""),
          correctAnswer: String(location.correct_answer ?? ""),
        })),
        markerCount: section.marker_count
      }))
    },
    questionGroups: (draft.questionGroups ?? []).map(group => ({
      id: group.id,
      sectionId: group.section_id,
      title: group.title,
      instructions: group.instructions,
      typeId: group.type_id,
      questionStart: group.question_start,
      questionEnd: group.question_end,
      sharedOptions: group.shared_options,
      questionBlock: group.question_block,
      answerBlock: group.answer_block,
      secondaryBlock: group.secondary_block,
      rawContent: group.raw_content,
      questions: group.questions.map(q => ({
        id: q.id,
        label: q.label,
        prompt: q.prompt,
        acceptedAnswers: q.accepted_answers,
        explanation: q.explanation,
        variants: q.variants
      }))
    })),
    questions: (draft.questions ?? []).map((question) => ({
      id: question.id,
      label: question.label,
      prompt: question.prompt,
      acceptedAnswers: question.accepted_answers,
      explanation: question.explanation,
      variants: question.variants
    })),
    review: {
      checklist: draft.review.checklist,
      notes: draft.review.notes
    },
    decisions: {
      questionBank: draft.decisions.question_bank,
      payment: draft.decisions.payment,
      listeningTimer: draft.decisions.listening_timer
    }
  };
}

export async function getAdminTests(): Promise<AdminTestSummary[]> {
  try {
    const items = await requestAdmin<BackendAdminTest[]>("/tests");
    return items.map(mapAdminTest);
  } catch (error) {
    console.error("Failed to fetch admin tests:", error);
    return [];
  }
}

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

type BackendDashboard = {
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
};

type BackendUser = {
  id: string;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  premium_expires_at?: string | null;
  show_on_leaderboard: boolean;
  created_at?: string | null;
};

type BackendPlan = {
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

type BackendPromoCode = {
  id: string;
  code: string;
  discount_percent: number;
  current_uses?: number;
  max_uses?: number;
  expires_at?: string | null;
  is_active?: boolean;
};

type BackendAudit = {
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

type BackendPayment = {
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

type BackendPaymentCard = {
  id: string;
  label: string;
  card_number: string;
  card_type: string;
  holder_name?: string | null;
  is_active: boolean;
  priority: number;
  bot_source: string;
};

type BackendPaymentSettings = {
  id: string;
  telegram_api_id?: string | null;
  telegram_api_hash?: string | null;
  phone_number?: string | null;
  active_bot: string;
  support_contact?: string | null;
  is_enabled: boolean;
  poll_fallback_enabled: boolean;
};

function emptyDashboardOverview(): AdminDashboardOverview {
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

function mapDashboardOverview(dashboard: BackendDashboard): AdminDashboardOverview {
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
      botSource: item.bot_source,
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
      telegramApiId: item.telegram_api_id ?? null,
      telegramApiHash: item.telegram_api_hash ?? null,
      phoneNumber: item.phone_number ?? null,
      activeBot: item.active_bot,
      supportContact: item.support_contact ?? null,
      isEnabled: item.is_enabled,
      pollFallbackEnabled: item.poll_fallback_enabled,
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

export async function getAdminActivityFeed(): Promise<string[]> {
  const entries = await getAdminAuditEntries();
  return entries.slice(0, 4).map((entry) => `${entry.action} • ${entry.resource}`);
}

export async function getAdminAnalyticsPoints(params?: Record<string, string>): Promise<AdminAnalyticsPoint[]> {
  const report = await getAdminAnalyticsReport(params);
  return report.activityPoints;
}

export interface AdminAnalyticsReport {
  dau: number;
  wau: number;
  mau: number;
  conversionRate: string;
  churnRate: string;
  activityPoints: AdminAnalyticsPoint[];
  topTests: { title: string; count: number }[];
  hardestTypes: { type: string; errorRate: string }[];
  dauTrend: { date: string; value: number }[];
  completionFunnel: { started: number; completed: number; rate: number } | null;
  avgScoreByTest: { testTitle: string; avgBand: number; attemptCount: number }[];
  hourlyDistribution: { label: string; value: number }[];
  userSegmentation: { free: { count: number; avgAttempts: number }; premium: { count: number; avgAttempts: number } } | null;
  weekdayActivity: { label: string; value: number }[];
}

export async function getAdminAnalyticsReport(params?: Record<string, string>): Promise<AdminAnalyticsReport> {
  try {
    const qs = params ? new URLSearchParams(params).toString() : "";
    const endpoint = qs ? `/analytics?${qs}` : "/analytics";
    const report = await requestAdmin<{
      dau: number;
      wau: number;
      mau: number;
      conversion_rate: string;
      churn_rate: string;
      activity_points: Array<{ label: string; value: number }>;
      top_tests: Array<{ title: string; count: number }>;
      hardest_question_types: Array<{ type: string; error_rate: string }>;
      dau_trend?: Array<{ date: string; value: number }>;
      completion_funnel?: { started: number; completed: number; rate: number } | null;
      avg_score_by_test?: Array<{ test_title: string; avg_band: number; attempt_count: number }>;
      hourly_distribution?: Array<{ label: string; value: number }>;
      user_segmentation?: { free: { count: number; avg_attempts: number }; premium: { count: number; avg_attempts: number } } | null;
      weekday_activity?: Array<{ label: string; value: number }>;
    }>("/analytics");
    return {
      dau: report.dau,
      wau: report.wau,
      mau: report.mau,
      conversionRate: report.conversion_rate,
      churnRate: report.churn_rate,
      activityPoints: report.activity_points.map((point) => ({ label: point.label, value: point.value })),
      topTests: report.top_tests.map((item) => ({ title: item.title, count: item.count })),
      hardestTypes: report.hardest_question_types.map((item) => ({ type: item.type, errorRate: item.error_rate })),
      dauTrend: (report.dau_trend ?? []).map(p => ({ date: p.date, value: p.value })),
      completionFunnel: report.completion_funnel ? { started: report.completion_funnel.started, completed: report.completion_funnel.completed, rate: report.completion_funnel.rate } : null,
      avgScoreByTest: (report.avg_score_by_test ?? []).map(t => ({ testTitle: t.test_title, avgBand: t.avg_band, attemptCount: t.attempt_count })),
      hourlyDistribution: (report.hourly_distribution ?? []).map(h => ({ label: h.label, value: h.value })),
      userSegmentation: report.user_segmentation ? { free: { count: report.user_segmentation.free.count, avgAttempts: report.user_segmentation.free.avg_attempts }, premium: { count: report.user_segmentation.premium.count, avgAttempts: report.user_segmentation.premium.avg_attempts } } : null,
      weekdayActivity: (report.weekday_activity ?? []).map(w => ({ label: w.label, value: w.value })),
    };
  } catch {
    return {
      dau: 0,
      wau: 0,
      mau: 0,
      conversionRate: "0%",
      churnRate: "0%",
      activityPoints: [
        { label: "Mon", value: 0 },
        { label: "Tue", value: 0 },
        { label: "Wed", value: 0 },
        { label: "Thu", value: 0 },
        { label: "Fri", value: 0 },
        { label: "Sat", value: 0 },
        { label: "Sun", value: 0 }
      ],
      topTests: [],
      hardestTypes: [],
      dauTrend: [],
      completionFunnel: null,
      avgScoreByTest: [],
      hourlyDistribution: [],
      userSegmentation: null,
      weekdayActivity: [],
    };
  }
}
