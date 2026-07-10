"use client";

import { pushDataLayerEvent, pushDataLayerEventOnce } from "./analytics-part-01";

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
  attemptId?: string;
  testId: string;
  testTitle: string;
  testType: string;
  mode: string;
  scope: string;
  sectionId?: string;
}) {
  pushDataLayerEvent("test_start", {
    attempt_id: payload.attemptId ?? null,
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
