"use client";

import { ArrowRight, BookOpen, ClipboardList, FileText, Sparkles, Target, WritingInlineAnnotation, WritingSubmissionResult, WritingSubmissionStatus } from "./dependencies";



export interface ResultClientProps {
  submissionId: string;
  initialStatus: WritingSubmissionStatus;
  initialErrorMessage: string | null;
  initialResult: WritingSubmissionResult | null;
}

export type LoadingStage = "idle" | "polling" | "loading_result" | "ready" | "failed";

export const GRADING_STEPS = [
  { id: "reading", label: "Reading your essay", icon: BookOpen },
  { id: "task", label: "Task achievement", icon: Target },
  { id: "coherence", label: "Coherence & cohesion", icon: ArrowRight },
  { id: "lexical", label: "Lexical resource", icon: Sparkles },
  { id: "grammar", label: "Grammatical range & accuracy", icon: ClipboardList },
  { id: "compile", label: "Compiling feedback", icon: FileText },
];

export const STEP_ADVANCE_MS = 5000;

export const CATEGORY_STYLE: Record<
  string,
  {
    label: string;
    underline: string;
    chip: string;
    dot: string;
    fill: string;
    fillActive: string;
    text: string;
  }
> = {
  spelling: {
    label: "Spelling",
    underline: "decoration-red-500",
    chip: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
    dot: "bg-red-500",
    fill: "bg-red-500/25 hover:bg-red-500/35 dark:bg-red-500/20 dark:hover:bg-red-500/30 shadow-[inset_0_-1px_0_rgba(239,68,68,0.2)]",
    fillActive: "bg-red-500/40 ring-2 ring-red-500/70 dark:bg-red-500/35 shadow-[inset_0_-1px_0_rgba(239,68,68,0.35)]",
    text: "text-red-700 dark:text-red-300",
  },
  grammar: {
    label: "Grammar",
    underline: "decoration-orange-500",
    chip: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30",
    dot: "bg-orange-500",
    fill: "bg-orange-500/25 hover:bg-orange-500/35 dark:bg-orange-500/20 dark:hover:bg-orange-500/30 shadow-[inset_0_-1px_0_rgba(249,115,22,0.2)]",
    fillActive: "bg-orange-500/40 ring-2 ring-orange-500/70 dark:bg-orange-500/35 shadow-[inset_0_-1px_0_rgba(249,115,22,0.35)]",
    text: "text-orange-700 dark:text-orange-300",
  },
  lexical: {
    label: "Word choice",
    underline: "decoration-violet-500",
    chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
    dot: "bg-violet-500",
    fill: "bg-violet-500/25 hover:bg-violet-500/35 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 shadow-[inset_0_-1px_0_rgba(139,92,246,0.2)]",
    fillActive: "bg-violet-500/40 ring-2 ring-violet-500/70 dark:bg-violet-500/35 shadow-[inset_0_-1px_0_rgba(139,92,246,0.35)]",
    text: "text-violet-700 dark:text-violet-300",
  },
  cohesion: {
    label: "Cohesion",
    underline: "decoration-sky-500",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    dot: "bg-sky-500",
    fill: "bg-sky-500/25 hover:bg-sky-500/35 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 shadow-[inset_0_-1px_0_rgba(14,165,233,0.2)]",
    fillActive: "bg-sky-500/40 ring-2 ring-sky-500/70 dark:bg-sky-500/35 shadow-[inset_0_-1px_0_rgba(14,165,233,0.35)]",
    text: "text-sky-700 dark:text-sky-300",
  },
  style: {
    label: "Style",
    underline: "decoration-amber-500",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
    fill: "bg-amber-500/25 hover:bg-amber-500/35 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 shadow-[inset_0_-1px_0_rgba(245,158,11,0.2)]",
    fillActive: "bg-amber-500/40 ring-2 ring-amber-500/70 dark:bg-amber-500/35 shadow-[inset_0_-1px_0_rgba(245,158,11,0.35)]",
    text: "text-amber-700 dark:text-amber-300",
  },
  punctuation: {
    label: "Punctuation",
    underline: "decoration-pink-500",
    chip: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30",
    dot: "bg-pink-500",
    fill: "bg-pink-500/25 hover:bg-pink-500/35 dark:bg-pink-500/20 dark:hover:bg-pink-500/30 shadow-[inset_0_-1px_0_rgba(236,72,153,0.2)]",
    fillActive: "bg-pink-500/40 ring-2 ring-pink-500/70 dark:bg-pink-500/35 shadow-[inset_0_-1px_0_rgba(236,72,153,0.35)]",
    text: "text-pink-700 dark:text-pink-300",
  },
};

export function categoryStyle(category: string) {
  return CATEGORY_STYLE[category.toLowerCase()] ?? CATEGORY_STYLE.style;
}

export function toBandNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function bandTone(band: number) {
  if (band >= 8) return { ring: "stroke-teal-500", text: "text-teal-600 dark:text-teal-400", bar: "bg-teal-500", label: "Very good user" };
  if (band >= 7) return { ring: "stroke-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", label: "Good user" };
  if (band >= 6) return { ring: "stroke-blue-500", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500", label: "Competent user" };
  if (band >= 5) return { ring: "stroke-amber-500", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", label: "Modest user" };
  return { ring: "stroke-rose-500", text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500", label: "Limited user" };
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function formatDuration(totalSeconds: number) {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export function normalizedEssayText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function splitDiffTokens(value: string): string[] {
  return (value.match(/\s+|[^\s]+/g) ?? []);
}

export function buildInlineDiff(original: string, revised: string): Array<{ kind: "same" | "removed" | "added"; text: string }> {
  const a = splitDiffTokens(original);
  const b = splitDiffTokens(revised);
  const rows = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }
  const parts: Array<{ kind: "same" | "removed" | "added"; text: string }> = [];
  const push = (kind: "same" | "removed" | "added", text: string) => {
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last?.kind === kind) {
      last.text += text;
      return;
    }
    parts.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i += 1;
      j += 1;
    } else if (rows[i + 1][j] >= rows[i][j + 1]) {
      push("removed", a[i]);
      i += 1;
    } else {
      push("added", b[j]);
      j += 1;
    }
  }
  while (i < a.length) {
    push("removed", a[i]);
    i += 1;
  }
  while (j < b.length) {
    push("added", b[j]);
    j += 1;
  }
  return parts;
}

export function buildAnnotationTooltip(annotation: WritingInlineAnnotation): string {
  const lines: string[] = [];
  if (annotation.short_message) lines.push(annotation.short_message);
  if (annotation.replacements?.[0]) lines.push(`Fix: ${annotation.replacements[0]}`);
  if (annotation.explanation) lines.push(annotation.explanation);
  if (annotation.band_impact) lines.push(`Band impact: ${annotation.band_impact}`);
  if (annotation.examiner_tip) lines.push(`Tip: ${annotation.examiner_tip}`);
  return lines.join("\n");
}

export function findSentenceStart(text: string, offset: number): number {
  let start = Math.max(0, Math.min(offset, text.length));
  for (let i = start - 1; i >= 0; i -= 1) {
    const ch = text[i];
    if (ch === "\n" || ch === "\r") {
      start = i + 1;
      break;
    }
    if (/[.!?]/.test(ch)) {
      start = i + 1;
      break;
    }
    start = i;
  }
  while (start < text.length && /\s/.test(text[start])) {
    start += 1;
  }
  return start;
}

export function findSentenceEnd(text: string, offset: number): number {
  let end = Math.max(0, Math.min(offset, text.length));
  for (let i = end; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\n" || ch === "\r") {
      end = i;
      break;
    }
    end = i + 1;
    if (/[.!?]/.test(ch)) {
      break;
    }
  }
  while (end > 0 && /\s/.test(text[end - 1])) {
    end -= 1;
  }
  return end;
}
