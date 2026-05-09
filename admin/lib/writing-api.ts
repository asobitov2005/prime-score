import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";

const baseUrl = ADMIN_PUBLIC_API_BASE_URL;

export type WritingTaskType = "task_1" | "task_2";
export type WritingTaskStatus = "draft" | "published" | "archived";
export type WritingDifficulty = "easy" | "medium" | "hard";
export type WritingQuestionSubtype =
  | "bar_chart" | "line_graph" | "pie_chart" | "table"
  | "process" | "map" | "two_charts"
  | "opinion" | "advantages_disadvantages" | "discussion"
  | "problem_solution" | "two_part" | "causes_effects";
export type WritingImageSummaryStatus =
  | "not_required"
  | "pending"
  | "ready"
  | "failed";

export interface WritingTask {
  id: string;
  title: string;
  task_type: WritingTaskType;
  prompt_html: string;
  image_url: string | null;
  image_summary: string | null;
  image_summary_status: WritingImageSummaryStatus | string;
  word_minimum: number;
  time_limit_seconds: number;
  difficulty: WritingDifficulty;
  status: WritingTaskStatus;
  source: string | null;
  question_subtype: WritingQuestionSubtype | null;
  description: string | null;
  sample_band: number | null;
  sample_answer: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface WritingTaskListResponse {
  items: WritingTask[];
  total: number;
}

export interface WritingTaskCreateInput {
  title: string;
  task_type: WritingTaskType;
  prompt_html: string;
  image_url?: string | null;
  word_minimum: number;
  time_limit_seconds: number;
  difficulty: WritingDifficulty;
  source?: string | null;
  question_subtype: WritingQuestionSubtype;
  description?: string | null;
  sample_band?: number | null;
  sample_answer?: string | null;
  status: WritingTaskStatus;
}

export type WritingTaskUpdateInput = Partial<WritingTaskCreateInput>;

export interface WritingSubmission {
  id: string;
  user_id: string;
  user_username?: string | null;
  user_email?: string | null;
  task_id: string;
  task_title?: string | null;
  task_type: WritingTaskType;
  essay_text: string;
  word_count: number;
  status: string;
  submitted_at: string;
  time_spent_seconds: number;
  error_message?: string | null;
  evaluation?: WritingEvaluation | null;
}

export interface WritingEvaluation {
  id: string;
  submission_id: string;
  task_achievement_band: number;
  coherence_band: number;
  lexical_band: number;
  grammar_band: number;
  overall_band: number;
  potential_band?: number | null;
  word_count_penalty: number;
  feedback?: Record<string, unknown> | null;
  inline_annotations?: unknown[];
  improved_version?: string | null;
  rubric_reasoning?: Record<string, unknown> | null;
  model_version?: string;
  prompt_version?: string;
  anchors_version?: string;
  latency_ms?: number;
  cache_hit?: boolean;
  graded_at: string;
}

export interface WritingSubmissionListResponse {
  items: WritingSubmission[];
  total: number;
}

function authHeaders(): Record<string, string> {
  const token = getClientAdminAccessToken();
  if (!token) {
    throw new Error("Admin session is missing.");
  }
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...authHeaders()
  };
}

async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

async function handleEmpty(response: Response): Promise<void> {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}

export interface ListWritingTaskParams {
  status?: WritingTaskStatus | "all";
  task_type?: WritingTaskType | "all";
  page?: number;
  page_size?: number;
  search?: string;
}

export const writingApi = {
  async listTasks(params: ListWritingTaskParams = {}): Promise<WritingTaskListResponse> {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.task_type && params.task_type !== "all") query.set("task_type", params.task_type);
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    if (params.search) query.set("search", params.search);
    const qs = query.toString();
    const response = await fetch(`${baseUrl}/writing/tasks${qs ? `?${qs}` : ""}`, {
      headers: authHeaders(),
      cache: "no-store"
    });
    return handleJson<WritingTaskListResponse>(response);
  },

  async getTask(id: string): Promise<WritingTask> {
    const response = await fetch(`${baseUrl}/writing/tasks/${id}`, {
      headers: authHeaders(),
      cache: "no-store"
    });
    return handleJson<WritingTask>(response);
  },

  async createTask(input: WritingTaskCreateInput): Promise<WritingTask> {
    const response = await fetch(`${baseUrl}/writing/tasks`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input)
    });
    return handleJson<WritingTask>(response);
  },

  async updateTask(id: string, input: WritingTaskUpdateInput): Promise<WritingTask> {
    const response = await fetch(`${baseUrl}/writing/tasks/${id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(input)
    });
    return handleJson<WritingTask>(response);
  },

  async deleteTask(id: string): Promise<void> {
    const response = await fetch(`${baseUrl}/writing/tasks/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    await handleEmpty(response);
  },

  async publishTask(id: string): Promise<WritingTask> {
    const response = await fetch(`${baseUrl}/writing/tasks/${id}/publish`, {
      method: "POST",
      headers: authHeaders()
    });
    return handleJson<WritingTask>(response);
  },

  async archiveTask(id: string): Promise<WritingTask> {
    const response = await fetch(`${baseUrl}/writing/tasks/${id}/archive`, {
      method: "POST",
      headers: authHeaders()
    });
    return handleJson<WritingTask>(response);
  },

  async regenerateImageSummary(id: string): Promise<void> {
    const response = await fetch(`${baseUrl}/writing/tasks/${id}/regenerate-image-summary`, {
      method: "POST",
      headers: authHeaders()
    });
    await handleEmpty(response);
  },

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${baseUrl}/writing/tasks/upload-image`, {
      method: "POST",
      headers: authHeaders(),
      body: formData
    });
    return handleJson<{ url: string }>(response);
  },

  async listSubmissions(params: {
    status?: string;
    task_id?: string;
    user_id?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<WritingSubmissionListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.task_id) query.set("task_id", params.task_id);
    if (params.user_id) query.set("user_id", params.user_id);
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    const response = await fetch(`${baseUrl}/writing/submissions${qs ? `?${qs}` : ""}`, {
      headers: authHeaders(),
      cache: "no-store"
    });
    return handleJson<WritingSubmissionListResponse>(response);
  },

  async getSubmission(id: string): Promise<WritingSubmission> {
    const response = await fetch(`${baseUrl}/writing/submissions/${id}`, {
      headers: authHeaders(),
      cache: "no-store"
    });
    return handleJson<WritingSubmission>(response);
  },

  async regradeSubmission(id: string): Promise<void> {
    const response = await fetch(`${baseUrl}/writing/submissions/${id}/regrade`, {
      method: "POST",
      headers: authHeaders()
    });
    await handleEmpty(response);
  }
};

export function resolveWritingImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return url;
}

export function formatTaskType(t: WritingTaskType): string {
  return t === "task_1" ? "Task 1" : "Task 2";
}

export function formatStatus(s: WritingTaskStatus | string): string {
  if (s === "draft") return "Draft";
  if (s === "published") return "Published";
  if (s === "archived") return "Archived";
  return s;
}

export function formatImageSummaryStatus(s: string | null | undefined): string {
  if (!s) return "Not Required";
  if (s === "not_required") return "Not Required";
  if (s === "pending") return "Pending";
  if (s === "ready") return "Ready";
  if (s === "failed") return "Failed";
  return s;
}

export const QUESTION_SUBTYPES_TASK1: { value: WritingQuestionSubtype; label: string }[] = [
  { value: "bar_chart", label: "Bar Chart" },
  { value: "line_graph", label: "Line Graph" },
  { value: "pie_chart", label: "Pie Chart" },
  { value: "table", label: "Table" },
  { value: "process", label: "Process" },
  { value: "map", label: "Map" },
  { value: "two_charts", label: "Two Charts" },
];

export const QUESTION_SUBTYPES_TASK2: { value: WritingQuestionSubtype; label: string }[] = [
  { value: "opinion", label: "Opinion Essay" },
  { value: "advantages_disadvantages", label: "Advantages & Disadvantages" },
  { value: "discussion", label: "Discussion Essay" },
  { value: "problem_solution", label: "Problem & Solution" },
  { value: "two_part", label: "Two-Part Question" },
  { value: "causes_effects", label: "Causes & Effects" },
];
