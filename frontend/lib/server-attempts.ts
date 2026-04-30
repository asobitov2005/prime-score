import { requestServerUserApi } from "@/lib/server-user-auth";
import type { AttemptMode, QuestionType, TestScope, TestType } from "@/lib/types";

export type BackendAttemptTextHighlight = {
  id: string;
  start: number;
  end: number;
};

export type BackendAttemptUiState = {
  theme?: "light" | "dark" | null;
  split_ratio?: number | null;
  font_scale?: number | null;
};

type StartAttemptPayload = {
  testId: string;
  scope: TestScope;
  sectionId?: string;
  mode: AttemptMode;
  forceNew?: boolean;
};

type BackendStartAttemptResponse = {
  attempt_id: string;
  time_limit_seconds: number;
};

export type BackendAttemptSnapshot = {
  test_id: string;
  title: string;
  test_type: TestType;
  format?: string | null;
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
    paragraphs?: Array<string | {
      id?: string;
      text?: string;
      label?: string;
    }>;
    show_labels?: boolean;
    question_count: number;
    question_groups?: Array<{
      group_id: string;
      group_title: string;
      question_type: QuestionType;
      question_start: number;
      question_end: number;
      shared_options?: string[];
      shared_content?: {
        question_block?: string;
        answer_block?: string;
        secondary_block?: string;
        diagram_title?: string;
        diagram_image_url?: string;
      };
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
        label?: string | null;
        options: string[];
        selection_limit?: number | null;
        word_limit?: number | null;
      }>;
    }>;
  }>;
};

export type BackendAttemptRead = {
  attempt_id: string;
  test_id: string;
  test_title: string;
  test_type: TestType;
  scope: TestScope;
  section_id?: string | null;
  mode: AttemptMode;
  time_limit_seconds: number;
  time_spent_sec?: number;
  answers?: Record<string, string>;
  active_question_id?: string | null;
  text_highlights?: Record<string, BackendAttemptTextHighlight[]>;
  ui_state?: BackendAttemptUiState | null;
  test_snapshot?: BackendAttemptSnapshot | null;
};

export type BackendAttemptResult = {
  attempt_id: string;
  status: string;
  test_id: string;
  test_type: TestType;
  test_title?: string | null;
  raw_score?: number | null;
  band_score?: number | string | null;
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
  diagram_groups: Array<{
    group_id: string;
    section_title: string;
    group_title: string;
    question_start: number;
    question_end: number;
    diagram_title?: string | null;
    diagram_image_url: string;
  }>;
};

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
    prompt: string;
    section_title: string;
    group_title: string;
    question_type: string;
    options: string[];
    answer_value?: string | null;
    is_correct?: boolean | null;
    correct_answers: string[];
    explanation?: string | null;
  }>;
};

async function requestBackend<T>(path: string, init?: RequestInit): Promise<T> {
  return requestServerUserApi<T>(path, init);
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

export async function saveBackendAttemptProgress(
  attemptId: string,
  payload: {
    timeSpentSec?: number;
    activeQuestionId?: string;
    textHighlights?: Record<string, BackendAttemptTextHighlight[]>;
    uiState?: { theme?: "light" | "dark"; splitRatio?: number; fontScale?: number };
  }
): Promise<void> {
  await requestBackend(`/attempts/${attemptId}/progress`, {
    method: "PATCH",
    body: JSON.stringify({
      time_spent_sec: payload.timeSpentSec,
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

export async function submitBackendAttempt(attemptId: string, reason: string = "user_confirmed"): Promise<void> {
  await requestBackend(`/attempts/${attemptId}/submit`, {
    method: "POST",
    body: JSON.stringify({ confirm: true, reason })
  });
}
