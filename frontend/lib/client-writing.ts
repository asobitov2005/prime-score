"use client";

import { getFrontendClientApiBaseUrl } from "@/lib/api-base";
import {
  isUserAuthFailureStatus,
  performClientUserAuthedFetch,
  USER_SESSION_EXPIRED_MESSAGE,
} from "@/lib/user-auth-client";
import type {
  WritingTaskType,
  WritingSubmissionRecord,
  WritingSubmissionResult,
  WritingTaskDetail,
  WritingLimitStatus,
} from "@/lib/server-writing";

export interface WritingDraftRead {
  draft_key: string;
  task_id?: string | null;
  task_type: WritingTaskType;
  topic: string;
  essay_text: string;
  image_data_url?: string | null;
  started: boolean;
  time_spent_seconds: number;
  updated_at: string;
}

export interface WritingDraftUpsertRequest {
  task_id?: string | null;
  task_type: WritingTaskType;
  topic?: string | null;
  essay_text: string;
  image_data_url?: string | null;
  started: boolean;
  time_spent_seconds: number;
}

async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getFrontendClientApiBaseUrl();
  const response = await performClientUserAuthedFetch(path, init, {
    baseUrl,
    includeJsonContentType: true,
  });
  if (!response.ok) {
    let message = `Request failed for ${path}`;
    try {
      const payload = (await response.json()) as { detail?: string; message?: string };
      message = payload.detail ?? payload.message ?? message;
    } catch {
      try {
        const text = await response.text();
        if (text.trim()) message = text.trim();
      } catch {}
    }
    if (isUserAuthFailureStatus(response.status) && message.startsWith("Request failed")) {
      message = USER_SESSION_EXPIRED_MESSAGE;
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function getWritingTaskClient(taskId: string): Promise<WritingTaskDetail> {
  return clientFetch<WritingTaskDetail>(`/writing/tasks/${taskId}`);
}

export function getWritingDraftClient(draftKey: string): Promise<WritingDraftRead> {
  return clientFetch<WritingDraftRead>(`/writing/drafts/${draftKey}`);
}

export function saveWritingDraftClient(draftKey: string, payload: WritingDraftUpsertRequest): Promise<WritingDraftRead> {
  return clientFetch<WritingDraftRead>(`/writing/drafts/${draftKey}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteWritingDraftClient(draftKey: string): Promise<void> {
  return clientFetch<void>(`/writing/drafts/${draftKey}`, {
    method: "DELETE",
  });
}

export function pollWritingSubmission(submissionId: string): Promise<WritingSubmissionRecord> {
  return clientFetch<WritingSubmissionRecord>(`/writing/submissions/${submissionId}`);
}

export function fetchWritingSubmissionResult(submissionId: string): Promise<WritingSubmissionResult> {
  return clientFetch<WritingSubmissionResult>(`/writing/submissions/${submissionId}/result`);
}

export function fetchWritingLimits(): Promise<WritingLimitStatus> {
  return clientFetch<WritingLimitStatus>(`/writing/limits`);
}

export function retryWritingSubmission(submissionId: string): Promise<WritingSubmissionRecord> {
  return clientFetch<WritingSubmissionRecord>(`/writing/submissions/${submissionId}/retry`, {
    method: "POST",
  });
}

export function getStoredDesiredScore(): number {
  try {
    const saved = window.localStorage.getItem("prime-desired-score");
    const parsed = saved ? parseFloat(saved) : 7.5;
    return Number.isFinite(parsed) ? Math.min(9, Math.max(4, parsed)) : 7.5;
  } catch {
    return 7.5;
  }
}

export function submitWritingSubmission(payload: {
  task_id?: string;
  task_type?: "task_1" | "task_2";
  topic?: string;
  image_url?: string | null;
  essay_text: string;
  time_spent_seconds: number;
  desired_score?: number | null;
}): Promise<WritingSubmissionRecord> {
  return clientFetch<WritingSubmissionRecord>(`/writing/submissions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadWritingImage(file: File): Promise<{ url: string }> {
  const baseUrl = getFrontendClientApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);

  const response = await performClientUserAuthedFetch("/writing/upload-image", {
    method: "POST",
    body: formData,
  }, {
    baseUrl,
    includeJsonContentType: false,
  });

  if (!response.ok) {
    let message = "Image upload failed.";
    try {
      const payload = (await response.json()) as { detail?: string; message?: string };
      message = payload.detail ?? payload.message ?? message;
    } catch {
      try {
        const text = await response.text();
        if (text.trim()) message = text.trim();
      } catch {}
    }
    if (isUserAuthFailureStatus(response.status) && message === "Image upload failed.") {
      message = USER_SESSION_EXPIRED_MESSAGE;
    }
    throw new Error(message);
  }

  return (await response.json()) as { url: string };
}
