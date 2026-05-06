"use client";

import { getFrontendClientApiBaseUrl } from "@/lib/api-base";
import { useAuthStore } from "@/store/auth-store";
import type {
  WritingSubmissionRecord,
  WritingSubmissionResult,
  WritingTaskDetail,
} from "@/lib/server-writing";

async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getFrontendClientApiBaseUrl();
  const accessToken = useAuthStore.getState().accessToken;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
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
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return (await response.json()) as T;
}

export function getWritingTaskClient(taskId: string): Promise<WritingTaskDetail> {
  return clientFetch<WritingTaskDetail>(`/writing/tasks/${taskId}`);
}

export function pollWritingSubmission(submissionId: string): Promise<WritingSubmissionRecord> {
  return clientFetch<WritingSubmissionRecord>(`/writing/submissions/${submissionId}`);
}

export function fetchWritingSubmissionResult(submissionId: string): Promise<WritingSubmissionResult> {
  return clientFetch<WritingSubmissionResult>(`/writing/submissions/${submissionId}/result`);
}

export function submitWritingSubmission(payload: {
  task_id?: string;
  task_type?: "task_1" | "task_2";
  topic?: string;
  image_url?: string | null;
  essay_text: string;
  time_spent_seconds: number;
}): Promise<WritingSubmissionRecord> {
  return clientFetch<WritingSubmissionRecord>(`/writing/submissions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadWritingImage(file: File): Promise<{ url: string }> {
  const baseUrl = getFrontendClientApiBaseUrl();
  const accessToken = useAuthStore.getState().accessToken;
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${baseUrl}/writing/upload-image`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
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
    throw new Error(message);
  }

  return (await response.json()) as { url: string };
}
