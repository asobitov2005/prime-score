import { requestServerUserApi } from "@/lib/server-user-auth";

export type WritingTaskType = "task_1" | "task_2";
export type WritingDifficulty = "easy" | "medium" | "hard";
export type WritingSubmissionStatus =
  | "queued"
  | "QUEUED"
  | "processing"
  | "PROCESSING"
  | "completed"
  | "COMPLETED"
  | "failed"
  | "FAILED";

export interface WritingTaskListItem {
  id: string;
  title: string;
  task_type: WritingTaskType;
  image_url?: string | null;
  word_minimum: number;
  time_limit_seconds: number;
  difficulty?: WritingDifficulty | null;
  source?: string | null;
  description?: string | null;
}

export interface WritingTaskListResponse {
  items: WritingTaskListItem[];
  total: number;
}

export interface WritingTaskDetail extends WritingTaskListItem {
  prompt_html: string;
  image_summary?: string | null;
}

export interface WritingSubmissionRecord {
  id: string;
  status: WritingSubmissionStatus;
  error_message?: string | null;
  task_id?: string;
  task_title?: string;
  task_type?: WritingTaskType;
  word_count?: number | null;
  overall_band?: number | string | null;
  submitted_at?: string | null;
  graded_at?: string | null;
}

export interface WritingCriterionEvaluation {
  band: number | string;
  summary: string;
  strengths: string[];
  improvements: string[];
  evidence_quotes: string[];
  reasoning: string;
}

export interface WritingInlineAnnotation {
  offset: number;
  length: number;
  original: string;
  replacements: string[];
  category: string;
  severity?: string | null;
  short_message?: string | null;
  explanation?: string | null;
}

export interface WritingSubmissionResult {
  submission_id: string;
  task_id: string;
  task_type: WritingTaskType;
  task_title: string;
  word_count: number;
  word_minimum: number;
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
  improved_version: string;
  overall_summary: string;
  next_steps: string[];
}

export interface WritingHistoryItem {
  submission_id: string;
  task_id: string;
  task_title: string;
  task_type: WritingTaskType;
  word_count: number;
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
}

export async function listWritingTasks(params: {
  task_type?: WritingTaskType;
  difficulty?: WritingDifficulty;
  page?: number;
  page_size?: number;
}): Promise<WritingTaskListResponse> {
  const search = new URLSearchParams();
  if (params.task_type) search.set("task_type", params.task_type);
  if (params.difficulty) search.set("difficulty", params.difficulty);
  if (params.page) search.set("page", String(params.page));
  if (params.page_size) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  return requestServerUserApi<WritingTaskListResponse>(`/writing/tasks${qs ? `?${qs}` : ""}`);
}

export async function getWritingTask(taskId: string): Promise<WritingTaskDetail> {
  return requestServerUserApi<WritingTaskDetail>(`/writing/tasks/${taskId}`);
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

const STORAGE_PREFIX = "/api/storage/";

export function resolveWritingAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:8000"
  )
    .replace(/\/$/, "")
    .replace(/\/api$/, "");
  if (url.startsWith(STORAGE_PREFIX) || url.startsWith("/api/")) {
    return `${base}${url}`;
  }
  if (url.startsWith("/")) {
    return `${base}${url}`;
  }
  return `${base}/${url}`;
}
