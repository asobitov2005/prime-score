"use client";

import { AiUseCase, WritingPromptKey } from "./dependencies";



export const PROMPT_KEYS: WritingPromptKey[] = [
  "grader_system",
  "grader_user_template",
  "criterion_task_achievement",
  "criterion_coherence_cohesion",
  "criterion_lexical_resource",
  "criterion_grammar_accuracy",
  "annotation_prompt",
  "annotation_repair_prompt",
  "json_repair_prompt",
  "improved_version_prompt",
  "roast_system",
  "roast_user_template",
  "vocabulary_upgrade_policy",
];

export const WRITING_USE_CASES: AiUseCase[] = [
  "writing_grader",
  "writing_improver",
  "writing_roast",
  "writing_image_summary",
];

export const USE_CASE_LABELS: Record<AiUseCase, { title: string; description: string }> = {
  admin_chat: {
    title: "Admin chat",
    description: "Legacy admin workspace chat binding.",
  },
  writing_grader: {
    title: "Writing grader",
    description: "Main IELTS band scoring, feedback, criterion scores, and annotations.",
  },
  writing_improver: {
    title: "Writing improved version",
    description: "Rewrites the essay into a stronger version after grading.",
  },
  writing_roast: {
    title: "Writing roast feedback",
    description: "Direct, natural-language roast feedback for writing results.",
  },
  writing_image_summary: {
    title: "Writing Task 1 image summary",
    description: "Vision model used to read/summarize Task 1 chart or image prompts.",
  },
  audio_transcription: {
    title: "Audio transcription",
    description: "Listening audio transcript generation.",
  },
  speaking_examiner: {
    title: "Speaking AI examiner",
    description: "Gemini Live model used for IELTS Speaking sessions and per-part examiner turns.",
  },
  speaking_grader: {
    title: "Speaking grader",
    description: "Post-session scoring model and prompt settings used after the full Speaking conversation is complete.",
  },
};

export const PROMPT_LABELS: Record<WritingPromptKey, { title: string; description: string; rows: number }> = {
  grader_system: {
    title: "Grader system prompt",
    description: "Main system instruction used by the IELTS writing grader.",
    rows: 10,
  },
  grader_user_template: {
    title: "Grader user template",
    description: "User prompt template. Keep required placeholders intact.",
    rows: 12,
  },
  criterion_task_achievement: {
    title: "Criterion: Task Achievement / Response",
    description: "Criterion-specific grading policy.",
    rows: 5,
  },
  criterion_coherence_cohesion: {
    title: "Criterion: Coherence and Cohesion",
    description: "Criterion-specific grading policy.",
    rows: 5,
  },
  criterion_lexical_resource: {
    title: "Criterion: Lexical Resource",
    description: "Criterion-specific grading policy.",
    rows: 5,
  },
  criterion_grammar_accuracy: {
    title: "Criterion: Grammar Accuracy",
    description: "Criterion-specific grading policy.",
    rows: 5,
  },
  annotation_prompt: {
    title: "Annotation prompt",
    description: "Prompt for essay issue annotations.",
    rows: 8,
  },
  annotation_repair_prompt: {
    title: "Annotation repair prompt",
    description: "Used to repair malformed annotation JSON.",
    rows: 6,
  },
  json_repair_prompt: {
    title: "JSON repair prompt",
    description: "General JSON repair instruction.",
    rows: 6,
  },
  improved_version_prompt: {
    title: "Improved version prompt",
    description: "Prompt used to rewrite/improve submitted writing.",
    rows: 8,
  },
  roast_system: {
    title: "Roast system prompt",
    description: "System instruction for roast feedback.",
    rows: 8,
  },
  roast_user_template: {
    title: "Roast user template",
    description: "User template for roast feedback.",
    rows: 10,
  },
  vocabulary_upgrade_policy: {
    title: "Vocabulary upgrade policy",
    description: "Policy block used when suggesting vocabulary upgrades.",
    rows: 6,
  },
};

export const SPEAKING_EXAMINER_PROMPT_FIELDS = [
  {
    label: "Base system instruction",
    description: "Shared instruction included before every Speaking mode.",
    path: ["system_instruction"],
    rows: 6,
  },
  {
    label: "Strict IELTS exam mode",
    description: "Examiner behavior for the formal IELTS flow.",
    path: ["mode_instructions", "strict_exam"],
    rows: 6,
  },
  {
    label: "Free talk mode",
    description: "Open conversation behavior outside the IELTS structure.",
    path: ["mode_instructions", "free_talk"],
    rows: 6,
  },
  {
    label: "Uzbek roast mode",
    description: "Harsh Uzbek coach behavior. Keep abuse focused on effort, answer quality, and exam performance.",
    path: ["mode_instructions", "uzbek_roast"],
    rows: 7,
  },
  {
    label: "Part 1 instruction",
    description: "Extra instruction for familiar-topic questions.",
    path: ["part_instructions", "part_1"],
    rows: 3,
  },
  {
    label: "Part 2 instruction",
    description: "Extra instruction for cue-card long turn sessions.",
    path: ["part_instructions", "part_2"],
    rows: 3,
  },
  {
    label: "Part 3 instruction",
    description: "Extra instruction for abstract follow-up questions.",
    path: ["part_instructions", "part_3"],
    rows: 3,
  },
] as const;

export type ProviderDraft = {
  label: string;
  apiKey: string;
  baseUrl: string;
  isEnabled: boolean;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSettingsDraft(draft: string | undefined, fallback: Record<string, unknown>): Record<string, unknown> {
  if (!draft) return fallback;
  try {
    const parsed = JSON.parse(draft) as unknown;
    return isRecord(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function cloneSettings(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export function readNestedString(settings: Record<string, unknown>, path: readonly string[]): string {
  let current: unknown = settings;
  for (const segment of path) {
    if (!isRecord(current)) return "";
    current = current[segment];
  }
  return typeof current === "string" ? current : "";
}
