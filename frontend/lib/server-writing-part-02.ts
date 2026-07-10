import { FRONTEND_API_TIMEOUT_MS, getFrontendServerApiBaseUrl, requestServerUserApi } from "./server-writing-dependencies";
import { WritingActionPlan, WritingBandBoundary, WritingChecklistItem, WritingCriterionEvaluation, WritingErrorPattern, WritingInlineAnnotation, WritingQuestionSubtype, WritingRevisionDiff, WritingRoastFeedback, WritingScoreBooster, WritingSentenceFix, WritingSubmissionRecord, WritingSubmissionStatus, WritingTargetAction, WritingTaskDetail, WritingTaskListResponse, WritingTaskType, WritingVocabularySuggestion } from "./server-writing-part-01";

export interface WritingSelectedBenchmark {
  card_id: string;
  title: string;
  band: number | string;
  use_when: string;
  tolerance_lesson: string;
  band_limiting_signs: string[];
}

export interface WritingSubmissionResult {
  submission_id: string;
  task_id: string;
  task_type: WritingTaskType;
  task_title: string;
  word_count: number;
  word_minimum: number;
  desired_score?: number | string | null;
  time_spent_seconds: number;
  submitted_at: string | null;
  graded_at: string | null;
  essay_text: string;
  overall_band: number | string;
  potential_band?: number | string | null;
  word_count_penalty?: number | string | null;
  task_achievement: WritingCriterionEvaluation;
  coherence: WritingCriterionEvaluation;
  lexical: WritingCriterionEvaluation;
  grammar: WritingCriterionEvaluation;
  inline_annotations: WritingInlineAnnotation[];
  vocabulary_suggestions: WritingVocabularySuggestion[];
  improved_version: string;
  overall_summary: string;
  next_steps: string[];
  action_plan?: WritingActionPlan | null;
  target_action_plan?: WritingTargetAction[];
  band_boundaries?: WritingBandBoundary[];
  score_boosters?: WritingScoreBooster[];
  checklist?: WritingChecklistItem[];
  error_patterns?: WritingErrorPattern[];
  history_error_trends?: WritingErrorPattern[];
  sentence_fixes?: WritingSentenceFix[];
  revision_diff?: WritingRevisionDiff[];
  roast?: WritingRoastFeedback | null;
  is_ai_estimate?: boolean;
  confidence?: string;
  possible_score_range?: string;
  selected_benchmarks?: WritingSelectedBenchmark[];
  calibration_result?: Record<string, unknown>;
  audit_result?: Record<string, unknown>;
  meta_learning_note?: string;
  xp_awarded_total?: number;
  xp_breakdown?: Record<string, unknown>;
  xp_level_after?: number | null;
  xp_current_streak?: number | null;
}

export interface WritingDraftListItem {
  draft_key: string;
  task_id?: string | null;
  task_type: WritingTaskType;
  task_title?: string | null;
  topic: string;
  essay_text: string;
  image_data_url?: string | null;
  started: boolean;
  time_spent_seconds: number;
  updated_at: string;
}

export interface WritingDraftListResponse {
  items: WritingDraftListItem[];
}

export interface WritingHistoryItem {
  submission_id: string;
  task_id: string;
  task_title: string;
  task_type: WritingTaskType;
  word_count: number;
  time_spent_seconds: number;
  overall_band: number | string | null;
  status: WritingSubmissionStatus;
  submitted_at: string;
  graded_at?: string | null;
}

export interface WritingHistoryResponse {
  items: WritingHistoryItem[];
  total: number;
}

export interface WritingDashboardSummary {
  total_submissions: number;
  average_band?: number | null;
  best_band?: number | null;
  last_band?: number | null;
  last_submitted_at?: string | null;
  task_1_average?: number | null;
  task_2_average?: number | null;
  task_1_best?: number | null;
  task_2_best?: number | null;
  task_1_last?: number | null;
  task_2_last?: number | null;
}

export interface WritingLimitStatus {
  is_premium: boolean;
  premium_until?: string | null;
  daily_limit: number | null;
  used_today: number;
  remaining_today: number | null;
  can_submit: boolean;
  reset_at: string;
  plan_name?: string | null;
}

export async function requestPublicWritingApi<T>(path: string): Promise<T> {
  const baseUrl = getFrontendServerApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${path}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function listWritingTasks(params: {
  task_type?: WritingTaskType;
  question_subtype?: WritingQuestionSubtype;
  page?: number;
  page_size?: number;
}): Promise<WritingTaskListResponse> {
  const search = new URLSearchParams();
  if (params.task_type) search.set("task_type", params.task_type);
  if (params.question_subtype) search.set("question_subtype", params.question_subtype);
  if (params.page) search.set("page", String(params.page));
  if (params.page_size) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  return requestPublicWritingApi<WritingTaskListResponse>(`/writing/tasks${qs ? `?${qs}` : ""}`);
}

export async function getWritingTask(taskId: string): Promise<WritingTaskDetail> {
  return requestPublicWritingApi<WritingTaskDetail>(`/writing/tasks/${taskId}`);
}

export async function getWritingSubmission(submissionId: string): Promise<WritingSubmissionRecord> {
  return requestServerUserApi<WritingSubmissionRecord>(`/writing/submissions/${submissionId}`);
}

export async function getWritingSubmissionResult(submissionId: string): Promise<WritingSubmissionResult> {
  return requestServerUserApi<WritingSubmissionResult>(`/writing/submissions/${submissionId}/result`);
}

export async function getWritingHistory(): Promise<WritingHistoryResponse> {
  return requestServerUserApi<WritingHistoryResponse>(`/writing/history`);
}

export async function getWritingDashboardSummary(): Promise<WritingDashboardSummary> {
  return requestServerUserApi<WritingDashboardSummary>(`/writing/dashboard-summary`);
}
