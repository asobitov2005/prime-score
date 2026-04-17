import type { AttemptMode, QuestionType, TestScope, TestType } from "@/lib/types";

const baseUrl = (
  process.env.API_INTERNAL_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? "http://localhost:8000/api"
).replace(/\/$/, "");

const debugHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Debug-User-Id": process.env.PRIMESCORE_DEBUG_USER_ID ?? "33333333-3333-3333-3333-333333333333",
  "X-Debug-First-Name": process.env.PRIMESCORE_DEBUG_USER_FIRST_NAME ?? "Azizbek",
  "X-Debug-Last-Name": process.env.PRIMESCORE_DEBUG_USER_LAST_NAME ?? "Prime",
  "X-Debug-Username": process.env.PRIMESCORE_DEBUG_USER_USERNAME ?? "azizbek",
  "X-Debug-Role": process.env.PRIMESCORE_DEBUG_USER_ROLE ?? "user",
  "X-Debug-Is-Premium": "true",
  "X-Debug-Show-On-Leaderboard": "true"
};

type StartAttemptPayload = {
  testId: string;
  scope: TestScope;
  sectionId?: string;
  mode: AttemptMode;
};

type BackendStartAttemptResponse = {
  attempt_id: string;
  time_limit_seconds: number;
};

type BackendAttemptSnapshot = {
  test_id: string;
  title: string;
  test_type: TestType;
  scope: TestScope;
  mode: AttemptMode;
  section_id?: string | null;
  time_limit_seconds: number;
  sections?: Array<{
    section_id: string;
    section_number: number;
    label?: string | null;
    title?: string | null;
    subtitle?: string | null;
    content?: string | null;
    question_count: number;
    question_groups?: Array<{
      group_id: string;
      group_title: string;
      question_type: QuestionType;
      question_start: number;
      question_end: number;
      questions: Array<{
        question_id: string;
        question_number: number;
        section_id: string;
        section_title: string;
        group_id: string;
        group_title: string;
        question_type: QuestionType;
        prompt: string;
        instructions: string;
        options: string[];
        word_limit?: number | null;
      }>;
    }>;
  }>;
};

type BackendAttemptRead = {
  attempt_id: string;
  test_id: string;
  test_title: string;
  test_type: TestType;
  scope: TestScope;
  section_id?: string | null;
  mode: AttemptMode;
  time_limit_seconds: number;
  test_snapshot?: BackendAttemptSnapshot | null;
};

export type BackendAttemptResult = {
  attempt_id: string;
  status: string;
  test_id: string;
  test_type: TestType;
  test_title?: string | null;
  raw_score?: number | null;
  band_score?: number | null;
  answers_count: number;
  total_questions: number;
  score_status: string;
  completed_at?: string | null;
  section_breakdown: Array<{
    label: string;
    correct: number;
    total: number;
  }>;
  question_type_breakdown: Array<{
    label: string;
    correct: number;
    total: number;
  }>;
};

export type BackendAttemptReview = {
  attempt_id: string;
  test_title?: string | null;
  test_type?: TestType | null;
  can_show_explanations: boolean;
  items: Array<{
    question_id: string;
    question_number: number;
    prompt: string;
    section_title: string;
    group_title: string;
    question_type: string;
    answer_value?: string | null;
    is_correct?: boolean | null;
    correct_answers: string[];
    explanation?: string | null;
  }>;
};

async function requestBackend<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...debugHeaders,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Attempt backend request failed for ${path}`);
  }

  return (await response.json()) as T;
}

export async function startBackendAttempt(payload: StartAttemptPayload): Promise<{
  attemptId: string;
  timeLimitSeconds: number;
}> {
  const response = await requestBackend<BackendStartAttemptResponse>(`/tests/${payload.testId}/start`, {
    method: "POST",
    body: JSON.stringify({
      scope: payload.scope,
      section_id: payload.sectionId,
      mode: payload.mode
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
  value: string
): Promise<void> {
  await requestBackend(`/attempts/${attemptId}/answer`, {
    method: "PATCH",
    body: JSON.stringify({
      question_id: questionId,
      value
    })
  });
}

export async function submitBackendAttempt(attemptId: string): Promise<void> {
  await requestBackend(`/attempts/${attemptId}/submit`, {
    method: "POST"
  });
}
