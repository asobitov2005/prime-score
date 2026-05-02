import { cookies } from "next/headers";
import { getAdminServerApiBaseUrl } from "@/lib/admin-api-base";
import { createEmptyDraft } from "@/lib/draft-template";
import { ADMIN_ACCESS_COOKIE } from "@/lib/auth";
import { normalizeAdminTestSourceDetail } from "@/lib/test-source";
import type {
  AdminAnalyticsPoint,
  AdminIdentity,
  AdminAuditEntry,
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
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "no body");
    console.error(`Admin API request failed for ${path} with status ${response.status}: ${text}`);
    const error = new Error(`Admin API request failed for ${path}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
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
        title: section.title,
        subtitle: section.subtitle,
        content: section.content,
        paragraphs: section.paragraphs,
        showLabels: section.showLabels,
        mediaKind: section.media_kind,
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
  premium_users: number;
  tests_total: number;
  tests_published: number;
  tests_draft: number;
  tests_archived: number;
  attempts_total: number;
  attempts_completed: number;
  payments_pending: number;
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
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  meta: Record<string, unknown>;
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

export async function getAdminDashboardKpis(): Promise<AdminDashboardKpi[]> {
  try {
    const dashboard = await requestAdmin<BackendDashboard>("/dashboard");
    return [
      { label: "Users", value: dashboard.users_total.toString(), delta: `${dashboard.attempts_total} attempts`, tone: "neutral" },
      { label: "Premium", value: dashboard.premium_users.toString(), delta: "Active subscribers", tone: "success" },
      { label: "Tests", value: dashboard.tests_total.toString(), delta: `${dashboard.tests_published} published / ${dashboard.tests_draft} draft`, tone: "warning" },
      { label: "Payments Pending", value: dashboard.payments_pending.toString(), delta: "Awaiting settlement", tone: dashboard.payments_pending > 0 ? "warning" : "neutral" }
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
      premiumState: item.premium_expires_at ? "active" : "free",
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
      actor: entry.actor_user_id,
      action: entry.action,
      resource: `${entry.entity_type}:${entry.entity_id}`,
      createdAt: entry.created_at,
      meta: Object.keys(entry.meta ?? {}).length > 0 ? JSON.stringify(entry.meta) : "-"
    }));
  } catch {
    return [];
  }
}

export async function getAdminActivityFeed(): Promise<string[]> {
  const entries = await getAdminAuditEntries();
  return entries.slice(0, 4).map((entry) => `${entry.action} • ${entry.resource}`);
}

export async function getAdminAnalyticsPoints(): Promise<AdminAnalyticsPoint[]> {
  return [
    { label: "Mon", value: 45 },
    { label: "Tue", value: 52 },
    { label: "Wed", value: 48 },
    { label: "Thu", value: 70 },
    { label: "Fri", value: 65 },
    { label: "Sat", value: 85 },
    { label: "Sun", value: 92 }
  ];
}

export interface AdminAnalyticsReport {
  dau: number;
  wau: number;
  mau: number;
  conversionRate: string;
  churnRate: string;
  topTests: { title: string; count: number }[];
  hardestTypes: { type: string; errorRate: string }[];
}

export async function getAdminAnalyticsReport(): Promise<AdminAnalyticsReport> {
  return {
    dau: 124,
    wau: 850,
    mau: 3200,
    conversionRate: "12.4%",
    churnRate: "2.1%",
    topTests: [
      { title: "Cambridge 16 - Reading Test 1", count: 450 },
      { title: "History of Glass - Practice", count: 320 },
      { title: "Listening Part 3 - Academic", count: 280 }
    ],
    hardestTypes: [
      { type: "Matching Headings", errorRate: "64%" },
      { type: "True/False/Not Given", errorRate: "42%" },
      { type: "Multiple Choice", errorRate: "38%" }
    ]
  };
}
