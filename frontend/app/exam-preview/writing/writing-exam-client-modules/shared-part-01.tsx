"use client";

import { WritingLimitStatus, cn } from "./dependencies";



export type WritingTaskType = "task_1" | "task_2";

export interface ExamWritingTask {
  id: string;
  title: string;
  task_type: WritingTaskType;
  prompt_html: string;
  image_url: string | null;
  word_minimum: number;
  time_limit_seconds: number;
  source: string | null;
}

export interface WritingDraftRecord {
  topic?: string;
  essay?: string;
  imageDataUrl?: string | null;
  started?: boolean;
  timeSpentSeconds?: number;
  updatedAt?: string;
}

export interface DraftPayload {
  task_id: string | null;
  task_type: WritingTaskType;
  topic: string;
  essay_text: string;
  image_data_url: string | null;
  started: boolean;
  time_spent_seconds: number;
}

export const TASK_CONFIG: Record<WritingTaskType, { label: string; words: number; seconds: number; instruction: string }> = {
  task_1: {
    label: "Task 1",
    words: 150,
    seconds: 20 * 60,
    instruction: "You should spend about 20 minutes on this task. Write at least 150 words.",
  },
  task_2: {
    label: "Task 2",
    words: 250,
    seconds: 40 * 60,
    instruction: "You should spend about 40 minutes on this task. Write at least 250 words.",
  },
};

export const TASK_1_SUMMARY_INSTRUCTION =
  "Summarize the information by selecting and reporting the main features, and make comparisons where relevant.";

export const MIN_DRAFT_WORDS = 20;

export function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizePromptText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function hasSummaryInstruction(value: string): boolean {
  return normalizePromptText(value).includes(normalizePromptText(TASK_1_SUMMARY_INSTRUCTION));
}

export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function WritingLimitPill({ limitStatus }: { limitStatus: WritingLimitStatus | null }) {
  if (!limitStatus) {
    return null;
  }
  const label = limitStatus.daily_limit === null
    ? "Writing: unlimited"
    : `Writing: ${Math.max(0, limitStatus.remaining_today ?? 0)}/${limitStatus.daily_limit} left`;

  return (
    <span
      className={cn(
        "inline-flex h-9 items-center rounded-xl border px-3 text-[11px] font-semibold uppercase tracking-[0.12em]",
        limitStatus.can_submit
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      )}
    >
      {limitStatus.is_premium ? label : "Premium Writing"}
    </span>
  );
}

export function AutosaveCloud({ syncState }: { syncState: "idle" | "saving" | "saved" | "error" }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 flex-none items-center justify-center",
        syncState === "error"
          ? "text-red-500"
          : syncState === "saving"
            ? "animate-pulse text-primary"
            : "text-primary"
      )}
      title={
        syncState === "error"
          ? "Save failed"
          : syncState === "saving"
            ? "Saving changes"
            : syncState === "saved"
              ? "Saved"
              : "Autosave ready"
      }
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d="M6.5 18.25C4.01 18.25 2 16.24 2 13.75C2 11.49 3.67 9.62 5.84 9.31C6.6 6.77 8.95 5 11.75 5C15.19 5 18 7.81 18 11.25V11.5H18.5C20.43 11.5 22 13.07 22 15C22 16.93 20.43 18.5 18.5 18.5H6.5V18.25Z"
          className="stroke-current"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {syncState === "error" ? (
          <path
            d="M10.1 10.1L13.9 13.9M13.9 10.1L10.1 13.9"
            className="stroke-current"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : syncState === "saving" ? (
          <path
            d="M8.5 13.1L10.2 14.8L13.1 11.9"
            className="stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
        ) : (
          <path
            d="M8.5 13.1L10.2 14.8L13.1 11.9"
            className="stroke-emerald-500"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}
