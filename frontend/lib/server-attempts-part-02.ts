import { TestType, requestServerUserApi } from "./server-attempts-dependencies";
import { BackendAttemptRead, BackendAttemptResult, BackendAttemptTextHighlight, BackendStartAttemptResponse, StartAttemptPayload } from "./server-attempts-part-01";

export type BackendAttemptReview = {
  attempt_id: string;
  test_title?: string | null;
  test_type?: TestType | null;
  can_show_explanations: boolean;
  diagram_groups: Array<{
    group_id: string;
    section_title: string;
    group_title: string;
    question_start: number;
    question_end: number;
    diagram_title?: string | null;
    diagram_image_url: string;
  }>;
  items: Array<{
    question_id: string;
    question_number: number;
    question_label?: string | null;
    prompt: string;
    section_title: string;
    group_title: string;
    question_type: string;
    options: string[];
    answer_value?: string | null;
    is_correct?: boolean | null;
    correct_answers: string[];
    explanation?: string | null;
    explanation_reference?: {
      quote?: string;
      highlighted_answer?: string;
      answer_status?: string;
      suggested_answers?: string[];
      issue?: string;
      confidence?: number | null;
      quote_verified?: boolean;
    } | null;
  }>;
};

export function forwardedAuthHeaders(authHeader?: string | null): HeadersInit | undefined {
  return authHeader ? { Authorization: authHeader } : undefined;
}

export async function requestBackend<T>(path: string, init?: RequestInit): Promise<T> {
  return requestServerUserApi<T>(path, init);
}

export async function startBackendAttempt(
  payload: StartAttemptPayload,
  authHeader?: string | null
): Promise<{
  attemptId: string;
  timeLimitSeconds: number;
}> {
  const response = await requestBackend<BackendStartAttemptResponse>(`/tests/${payload.testId}/start`, {
    method: "POST",
    headers: forwardedAuthHeaders(authHeader),
    body: JSON.stringify({
      scope: payload.scope,
      section_id: payload.sectionId,
      mode: payload.mode,
      force_new: payload.forceNew ?? false
    })
  });

  return {
    attemptId: response.attempt_id,
    timeLimitSeconds: response.time_limit_seconds
  };
}

export async function getBackendAttempt(attemptId: string): Promise<BackendAttemptRead> {
  return requestBackend<BackendAttemptRead>(`/attempts/${attemptId}`);
}

export async function getBackendAttemptResult(attemptId: string): Promise<BackendAttemptResult> {
  return requestBackend<BackendAttemptResult>(`/attempts/${attemptId}/result`);
}

export async function getBackendAttemptReview(attemptId: string): Promise<BackendAttemptReview> {
  return requestBackend<BackendAttemptReview>(`/attempts/${attemptId}/review`);
}

export async function saveBackendAttemptAnswer(
  attemptId: string,
  questionId: string,
  value: string,
  authHeader?: string | null
): Promise<void> {
  await requestBackend(`/attempts/${attemptId}/answer`, {
    method: "PATCH",
    headers: forwardedAuthHeaders(authHeader),
    body: JSON.stringify({
      question_id: questionId,
      value
    })
  });
}

export async function saveBackendAttemptProgress(
  attemptId: string,
  payload: {
    timeSpentSec?: number;
    sectionTimeSpentSec?: Record<string, number>;
    activeQuestionId?: string;
    textHighlights?: Record<string, BackendAttemptTextHighlight[]>;
    uiState?: { theme?: "light" | "dark"; splitRatio?: number; fontScale?: number };
  },
  authHeader?: string | null
): Promise<void> {
  await requestBackend(`/attempts/${attemptId}/progress`, {
    method: "PATCH",
    headers: forwardedAuthHeaders(authHeader),
    body: JSON.stringify({
      time_spent_sec: payload.timeSpentSec,
      section_time_spent_sec: payload.sectionTimeSpentSec,
      active_question_id: payload.activeQuestionId,
      text_highlights: payload.textHighlights,
      ui_state: payload.uiState
        ? {
            theme: payload.uiState.theme,
            split_ratio: payload.uiState.splitRatio,
            font_scale: payload.uiState.fontScale,
          }
        : undefined,
    })
  });
}

export async function submitBackendAttempt(
  attemptId: string,
  reason: string = "user_confirmed",
  authHeader?: string | null
): Promise<void> {
  await requestBackend(`/attempts/${attemptId}/submit`, {
    method: "POST",
    headers: forwardedAuthHeaders(authHeader),
    body: JSON.stringify({ confirm: true, reason })
  });
}
