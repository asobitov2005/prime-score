import { fetchAdminApi } from "./writing-api-dependencies";
import { WritingSubmission, WritingSubmissionListResponse, WritingTask, WritingTaskCreateInput, WritingTaskListResponse, WritingTaskStatus, WritingTaskType, WritingTaskUpdateInput, baseUrl } from "./writing-api-part-01";

export function jsonHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
  };
}

export async function handleJson<T>(response: Response): Promise<T> {
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

export async function handleEmpty(response: Response): Promise<void> {
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
    const response = await fetchAdminApi(`${baseUrl}/writing/tasks${qs ? `?${qs}` : ""}`, {
      cache: "no-store"
    });
    return handleJson<WritingTaskListResponse>(response);
  },

  async getTask(id: string): Promise<WritingTask> {
    const response = await fetchAdminApi(`${baseUrl}/writing/tasks/${id}`, {
      cache: "no-store"
    });
    return handleJson<WritingTask>(response);
  },

  async createTask(input: WritingTaskCreateInput): Promise<WritingTask> {
    const response = await fetchAdminApi(`${baseUrl}/writing/tasks`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(input)
    });
    return handleJson<WritingTask>(response);
  },

  async updateTask(id: string, input: WritingTaskUpdateInput): Promise<WritingTask> {
    const response = await fetchAdminApi(`${baseUrl}/writing/tasks/${id}`, {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify(input)
    });
    return handleJson<WritingTask>(response);
  },

  async deleteTask(id: string): Promise<void> {
    const response = await fetchAdminApi(`${baseUrl}/writing/tasks/${id}`, {
      method: "DELETE",
    });
    await handleEmpty(response);
  },

  async publishTask(id: string): Promise<WritingTask> {
    const response = await fetchAdminApi(`${baseUrl}/writing/tasks/${id}/publish`, {
      method: "POST",
    });
    return handleJson<WritingTask>(response);
  },

  async archiveTask(id: string): Promise<WritingTask> {
    const response = await fetchAdminApi(`${baseUrl}/writing/tasks/${id}/archive`, {
      method: "POST",
    });
    return handleJson<WritingTask>(response);
  },

  async regenerateImageSummary(id: string): Promise<void> {
    const response = await fetchAdminApi(`${baseUrl}/writing/tasks/${id}/regenerate-image-summary`, {
      method: "POST",
    });
    await handleEmpty(response);
  },

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetchAdminApi(`${baseUrl}/writing/tasks/upload-image`, {
      method: "POST",
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
    const response = await fetchAdminApi(`${baseUrl}/writing/submissions${qs ? `?${qs}` : ""}`, {
      cache: "no-store"
    });
    return handleJson<WritingSubmissionListResponse>(response);
  },

  async getSubmission(id: string): Promise<WritingSubmission> {
    const response = await fetchAdminApi(`${baseUrl}/writing/submissions/${id}`, {
      cache: "no-store"
    });
    return handleJson<WritingSubmission>(response);
  },

  async regradeSubmission(id: string): Promise<void> {
    const response = await fetchAdminApi(`${baseUrl}/writing/submissions/${id}/regrade`, {
      method: "POST",
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

export function formatSubmissionStatus(s: string | null | undefined): string {
  if (!s) return "Unknown";
  const normalized = s.toLowerCase();
  if (normalized === "queued") return "Queued";
  if (normalized === "running" || normalized === "processing") return "Running";
  if (normalized === "completed") return "Completed";
  if (normalized === "failed") return "Failed";
  return s;
}
