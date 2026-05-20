"use client";

type DataLayerPrimitive = string | number | boolean | null;
type DataLayerValue =
  | DataLayerPrimitive
  | DataLayerValue[]
  | { [key: string]: DataLayerValue | undefined };

export type DataLayerPayload = Record<string, DataLayerValue | undefined>;

const SESSION_EVENT_KEYS_STORAGE = "prime-gtm-session-events";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function normalizeValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeValue(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, normalizeValue(item)])
        .filter(([, item]) => item !== undefined),
    );
  }

  return String(value);
}

function normalizePayload(payload: DataLayerPayload): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => [key, normalizeValue(value)])
      .filter(([, value]) => value !== undefined),
  );
}

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function getSessionEventKeys(): string[] {
  if (!canUseBrowserStorage()) {
    return [];
  }

  try {
    const stored = window.sessionStorage.getItem(SESSION_EVENT_KEYS_STORAGE);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rememberSessionEventKey(key: string) {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    const next = [...new Set([...getSessionEventKeys(), key])].slice(-100);
    window.sessionStorage.setItem(SESSION_EVENT_KEYS_STORAGE, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

function hasSeenSessionEvent(key: string) {
  return getSessionEventKeys().includes(key);
}

export function pushDataLayerEvent(event: string, payload: DataLayerPayload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...normalizePayload(payload),
  });
}

export function pushDataLayerEventOnce(key: string, event: string, payload: DataLayerPayload = {}) {
  if (hasSeenSessionEvent(key)) {
    return;
  }

  rememberSessionEventKey(key);
  pushDataLayerEvent(event, payload);
}

export function parseAnalyticsAmount(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function trackPageView(payload: {
  pagePath: string;
  pageLocation: string;
  pageTitle: string;
  pageGroup: string;
  queryString?: string;
}) {
  pushDataLayerEvent("page_view", {
    page_path: payload.pagePath,
    page_location: payload.pageLocation,
    page_title: payload.pageTitle,
    page_group: payload.pageGroup,
    query_string: payload.queryString || undefined,
  });
}

export function trackLogin(payload: { method: string; isPremium: boolean }) {
  pushDataLayerEvent("login", {
    method: payload.method,
    user_tier: payload.isPremium ? "premium" : "free",
  });
}

export function trackCtaClick(payload: {
  ctaName: string;
  ctaLabel: string;
  ctaLocation: string;
  destination: string;
  authState?: "guest" | "authenticated";
}) {
  pushDataLayerEvent("cta_click", {
    cta_name: payload.ctaName,
    cta_label: payload.ctaLabel,
    cta_location: payload.ctaLocation,
    destination: payload.destination,
    auth_state: payload.authState,
  });
}

export function trackNavigationClick(payload: {
  label: string;
  href: string;
  location: string;
  authState?: "guest" | "authenticated";
}) {
  pushDataLayerEvent("navigation_click", {
    nav_label: payload.label,
    destination: payload.href,
    nav_location: payload.location,
    auth_state: payload.authState,
  });
}

export function trackUiInteraction(payload: {
  action: string;
  component: string;
  value?: string | number | boolean | null;
}) {
  pushDataLayerEvent("ui_interaction", {
    interaction_action: payload.action,
    component: payload.component,
    value: payload.value,
  });
}

export function trackLogout(payload: { method: string }) {
  pushDataLayerEvent("logout", {
    method: payload.method,
  });
}

export function trackTestStart(payload: {
  attemptId: string;
  testId: string;
  testTitle: string;
  testType: string;
  mode: string;
  scope: string;
  sectionId?: string;
}) {
  pushDataLayerEvent("test_start", {
    attempt_id: payload.attemptId,
    test_id: payload.testId,
    test_title: payload.testTitle,
    test_type: payload.testType,
    mode: payload.mode,
    scope: payload.scope,
    section_id: payload.sectionId ?? null,
  });
}

export function trackAttemptSubmit(payload: {
  attemptId: string;
  testTitle: string;
  testType: string;
  mode: string;
  scope: string;
  submitReason: string;
}) {
  pushDataLayerEventOnce(`attempt_submit:${payload.attemptId}:${payload.submitReason}`, "attempt_submit", {
    attempt_id: payload.attemptId,
    test_title: payload.testTitle,
    test_type: payload.testType,
    mode: payload.mode,
    scope: payload.scope,
    submit_reason: payload.submitReason,
  });
}

export function trackAttemptResultView(payload: {
  attemptId: string;
  testId: string;
  testTitle: string;
  testType: string;
  testFormat?: string | null;
  rawScore?: number | null;
  totalQuestions?: number | null;
  bandScore?: string | number | null;
}) {
  pushDataLayerEventOnce(`attempt_result_view:${payload.attemptId}`, "attempt_result_view", {
    attempt_id: payload.attemptId,
    test_id: payload.testId,
    test_title: payload.testTitle,
    test_type: payload.testType,
    test_format: payload.testFormat ?? undefined,
    raw_score: payload.rawScore ?? undefined,
    total_questions: payload.totalQuestions ?? undefined,
    band_score: payload.bandScore ?? undefined,
  });
}

export function trackWritingStart(payload: {
  taskType: string;
  source: "custom_prompt" | "task_library";
  taskId?: string | null;
  hasImage?: boolean;
}) {
  pushDataLayerEvent("writing_start", {
    task_type: payload.taskType,
    source: payload.source,
    task_id: payload.taskId ?? undefined,
    has_image: payload.hasImage,
  });
}

export function trackWritingSubmit(payload: {
  taskType: string;
  source: "custom_prompt" | "task_library" | "finished_answer";
  submissionId?: string | null;
  taskId?: string | null;
  wordCount: number;
  timeSpentSeconds?: number | null;
  hasImage?: boolean;
}) {
  pushDataLayerEventOnce(
    `writing_submit:${payload.submissionId ?? `${payload.source}:${payload.taskId ?? "custom"}:${payload.wordCount}`}`,
    "writing_submit",
    {
      task_type: payload.taskType,
      source: payload.source,
      submission_id: payload.submissionId ?? undefined,
      task_id: payload.taskId ?? undefined,
      word_count: payload.wordCount,
      time_spent_seconds: payload.timeSpentSeconds ?? undefined,
      has_image: payload.hasImage,
    },
  );
}

export function trackReviewSubmit(payload: {
  band: string;
  isPremium: boolean;
  textLength: number;
}) {
  pushDataLayerEvent("review_submit", {
    band_score: payload.band,
    user_tier: payload.isPremium ? "premium" : "free",
    text_length: payload.textLength,
  });
}

export function trackPlanSelect(payload: {
  planId: string;
  planName: string;
  durationDays: number | null;
  value: number | null;
  currency: string;
  location: string;
  authState: "guest" | "authenticated";
}) {
  pushDataLayerEvent("plan_select", {
    item_id: payload.planId,
    item_name: payload.planName,
    item_category: "subscription",
    item_variant: payload.durationDays ? `${payload.durationDays}_days` : "subscription",
    value: payload.value ?? undefined,
    currency: payload.currency,
    cta_location: payload.location,
    auth_state: payload.authState,
    items: [
      {
        item_id: payload.planId,
        item_name: payload.planName,
        item_category: "subscription",
        item_variant: payload.durationDays ? `${payload.durationDays}_days` : "subscription",
        price: payload.value ?? undefined,
        quantity: 1,
      },
    ],
  });
}

export function trackBeginCheckout(payload: {
  paymentId: string;
  invoiceCode: string;
  planId: string | null;
  planName: string;
  durationDays: number | null;
  value: number | null;
  currency: string;
  discountValue: number | null;
}) {
  pushDataLayerEvent("begin_checkout", {
    currency: payload.currency,
    value: payload.value ?? undefined,
    invoice_code: payload.invoiceCode,
    payment_id: payload.paymentId,
    discount_value: payload.discountValue ?? undefined,
    items: [
      {
        item_id: payload.planId ?? payload.paymentId,
        item_name: payload.planName,
        item_category: "subscription",
        item_variant: payload.durationDays ? `${payload.durationDays}_days` : "subscription",
        price: payload.value ?? undefined,
        quantity: 1,
      },
    ],
  });
}

export function trackPaymentCanceled(payload: {
  paymentId: string;
  invoiceCode: string;
  planId: string | null;
  planName: string;
  value: number | null;
  currency: string;
}) {
  pushDataLayerEventOnce(`payment_cancel:${payload.paymentId}`, "payment_cancel", {
    payment_id: payload.paymentId,
    invoice_code: payload.invoiceCode,
    plan_id: payload.planId ?? undefined,
    plan_name: payload.planName,
    currency: payload.currency,
    value: payload.value ?? undefined,
  });
}

export function trackPaymentCopy(payload: {
  paymentId: string;
  field: "card" | "amount";
}) {
  pushDataLayerEvent("payment_detail_copy", {
    payment_id: payload.paymentId,
    copied_field: payload.field,
  });
}

export function trackPaymentProofClick(payload: {
  paymentId: string;
  supportContact: string;
}) {
  pushDataLayerEvent("payment_proof_click", {
    payment_id: payload.paymentId,
    support_contact: payload.supportContact,
    destination: `https://t.me/${payload.supportContact.replace(/^@/, "")}`,
  });
}

export function trackPaymentMatched(payload: {
  paymentId: string;
  invoiceCode: string;
  planId: string | null;
  planName: string;
  durationDays: number | null;
  value: number | null;
  currency: string;
}) {
  pushDataLayerEventOnce(`payment_matched:${payload.paymentId}`, "payment_matched", {
    payment_id: payload.paymentId,
    invoice_code: payload.invoiceCode,
    currency: payload.currency,
    value: payload.value ?? undefined,
    items: [
      {
        item_id: payload.planId ?? payload.paymentId,
        item_name: payload.planName,
        item_category: "subscription",
        item_variant: payload.durationDays ? `${payload.durationDays}_days` : "subscription",
        price: payload.value ?? undefined,
        quantity: 1,
      },
    ],
  });
}

export function trackPurchase(payload: {
  paymentId: string;
  invoiceCode: string;
  planId: string | null;
  planName: string;
  durationDays: number | null;
  value: number | null;
  currency: string;
  grantedUntil?: string | null;
}) {
  pushDataLayerEventOnce(`purchase:${payload.paymentId}`, "purchase", {
    transaction_id: payload.paymentId,
    invoice_code: payload.invoiceCode,
    currency: payload.currency,
    value: payload.value ?? undefined,
    subscription_until: payload.grantedUntil ?? undefined,
    items: [
      {
        item_id: payload.planId ?? payload.paymentId,
        item_name: payload.planName,
        item_category: "subscription",
        item_variant: payload.durationDays ? `${payload.durationDays}_days` : "subscription",
        price: payload.value ?? undefined,
        quantity: 1,
      },
    ],
  });
}
