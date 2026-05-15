import type { WritingTaskType } from "@/lib/server-writing";

export interface CustomTaskConfig {
  title: string;
  description: string;
  promptLabel: string;
  promptPlaceholder: string;
  readyTitle: string;
  readyDescription: string;
  ctaLabel: string;
  requiresImage: boolean;
  imageLabel: string | null;
  imageTitle: string | null;
  imageHint: string | null;
}

const CUSTOM_TASK_DRAFT_KEYS: Record<WritingTaskType, string> = {
  task_1: "writing-exam-draft:custom:task_1",
  task_2: "writing-exam-draft:custom:task_2",
};

const CUSTOM_TASK_CONFIG: Record<WritingTaskType, CustomTaskConfig> = {
  task_1: {
    title: "Add custom Task 1",
    description: "Upload or paste the chart image, then enter the exact essay prompt before opening the workspace.",
    promptLabel: "Essay prompt",
    promptPlaceholder: "Paste the exact Task 1 question here, for example: The chart below shows...",
    readyTitle: "Ready for Task 1 workspace",
    readyDescription: "The prompt and visual will be saved, then the timer starts in the workspace.",
    ctaLabel: "Open workspace",
    requiresImage: true,
    imageLabel: "Chart image",
    imageTitle: "Drop or paste chart image here",
    imageHint: "Click this area to focus, then press Ctrl+V. Use Upload to choose a file.",
  },
  task_2: {
    title: "Add custom Task 2",
    description: "Paste the exact Task 2 question before opening a private workspace for your own essay.",
    promptLabel: "Essay question",
    promptPlaceholder: "Paste the exact Task 2 question here, for example: Some people think...",
    readyTitle: "Ready for Task 2 workspace",
    readyDescription: "The question is saved only for your account and opens directly in the writing workspace.",
    ctaLabel: "Open workspace",
    requiresImage: false,
    imageLabel: null,
    imageTitle: null,
    imageHint: null,
  },
};

export function getCustomTaskDraftKey(taskType: WritingTaskType): string {
  return CUSTOM_TASK_DRAFT_KEYS[taskType];
}

export function createCustomTaskDraftKey(taskType: WritingTaskType): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${getCustomTaskDraftKey(taskType)}:${suffix}`;
}

export function getCustomTaskWorkspaceHref(taskType: WritingTaskType, draftKey?: string): string {
  const params = new URLSearchParams({ task_type: taskType });
  if (draftKey) {
    params.set("draft_key", draftKey);
  }
  return `/exam-preview/writing?${params.toString()}`;
}

export function getCustomTaskConfig(taskType: WritingTaskType): CustomTaskConfig {
  return CUSTOM_TASK_CONFIG[taskType];
}
