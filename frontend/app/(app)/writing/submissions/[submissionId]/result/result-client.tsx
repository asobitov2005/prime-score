"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  Flame,
  Lightbulb,
  Loader2,
  PenSquare,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchWritingSubmissionResult,
  fetchWritingHistory,
  pollWritingSubmission,
  retryWritingSubmission,
} from "@/lib/client-writing";
import { cn } from "@/lib/utils";
import type {
  WritingActionPlan,
  WritingChecklistItem,
  WritingCriterionEvaluation,
  WritingErrorPattern,
  WritingHistoryItem,
  WritingInlineAnnotation,
  WritingRoastFeedback,
  WritingSubmissionResult,
  WritingSubmissionStatus,
  WritingTargetAction,
  WritingVocabularySuggestion,
} from "@/lib/server-writing";

interface ResultClientProps {
  submissionId: string;
  initialStatus: WritingSubmissionStatus;
  initialErrorMessage: string | null;
  initialResult: WritingSubmissionResult | null;
}

type LoadingStage = "idle" | "polling" | "loading_result" | "ready" | "failed";

const GRADING_STEPS = [
  { id: "reading", label: "Reading your essay", icon: BookOpen },
  { id: "task", label: "Task achievement", icon: Target },
  { id: "coherence", label: "Coherence & cohesion", icon: ArrowRight },
  { id: "lexical", label: "Lexical resource", icon: Sparkles },
  { id: "grammar", label: "Grammatical range & accuracy", icon: ClipboardList },
  { id: "compile", label: "Compiling feedback", icon: FileText },
];
// Give the rubric checks room to breathe while keeping the final assembly step
// short. The last step is activated by the completed event, not by this timer.
const GRADING_STEP_DELAYS_MS = [7000, 7000, 6500, 6500, 6000] as const;

const CATEGORY_STYLE: Record<
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

function categoryStyle(category: string) {
  return CATEGORY_STYLE[category.toLowerCase()] ?? CATEGORY_STYLE.style;
}

function toBandNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function bandTone(band: number) {
  if (band >= 8) return { ring: "stroke-teal-500", text: "text-teal-600 dark:text-teal-400", bar: "bg-teal-500", label: "Very good user" };
  if (band >= 7) return { ring: "stroke-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", label: "Good user" };
  if (band >= 6) return { ring: "stroke-blue-500", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500", label: "Competent user" };
  if (band >= 5) return { ring: "stroke-amber-500", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", label: "Modest user" };
  return { ring: "stroke-rose-500", text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500", label: "Limited user" };
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatDuration(totalSeconds: number) {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function normalizedEssayText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function splitDiffTokens(value: string): string[] {
  return (value.match(/\s+|[^\s]+/g) ?? []);
}

function buildInlineDiff(original: string, revised: string): Array<{ kind: "same" | "removed" | "added"; text: string }> {
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

function buildAnnotationTooltip(annotation: WritingInlineAnnotation): string {
  const lines: string[] = [];
  if (annotation.short_message) lines.push(annotation.short_message);
  if (annotation.replacements?.[0]) lines.push(`Fix: ${annotation.replacements[0]}`);
  if (annotation.explanation) lines.push(annotation.explanation);
  if (annotation.band_impact) lines.push(`Band impact: ${annotation.band_impact}`);
  if (annotation.examiner_tip) lines.push(`Tip: ${annotation.examiner_tip}`);
  return lines.join("\n");
}

function findSentenceStart(text: string, offset: number): number {
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

function findSentenceEnd(text: string, offset: number): number {
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

function buildAnnotationSentencePreview(
  essay: string,
  annotation: WritingInlineAnnotation,
): { originalSentence: string; improvedSentence: string } {
  const start = findSentenceStart(essay, annotation.offset);
  const end = findSentenceEnd(essay, annotation.offset + annotation.length);
  const originalSentence = essay.slice(start, end).trim();
  if (annotation.improved_sentence?.trim()) {
    return {
      originalSentence,
      improvedSentence: annotation.improved_sentence.trim(),
    };
  }
  const replacement = annotation.replacements?.[0] ?? "";
  if (!originalSentence || !replacement) {
    return { originalSentence, improvedSentence: originalSentence };
  }
  const relativeStart = Math.max(0, annotation.offset - start);
  const relativeEnd = Math.min(originalSentence.length, relativeStart + annotation.length);
  return {
    originalSentence,
    improvedSentence:
      originalSentence.slice(0, relativeStart)
      + replacement
      + originalSentence.slice(relativeEnd),
  };
}

type AnnotatedSegment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; index: number; category: string };

function buildAnnotatedSegments(
  essay: string,
  annotations: WritingInlineAnnotation[],
): AnnotatedSegment[] {
  if (!annotations.length) return [{ kind: "text", text: essay }];
  const indexed = annotations
    .map((a, i) => ({ a, i }))
    .filter(
      ({ a }) =>
        a.offset >= 0 && a.length > 0 && a.offset + a.length <= essay.length,
    )
    .sort((x, y) => x.a.offset - y.a.offset);

  const segments: AnnotatedSegment[] = [];
  let cursor = 0;
  for (const { a, i } of indexed) {
    if (a.offset < cursor) continue;
    if (a.offset > cursor) {
      segments.push({ kind: "text", text: essay.slice(cursor, a.offset) });
    }
    segments.push({
      kind: "mark",
      text: essay.slice(a.offset, a.offset + a.length),
      index: i,
      category: a.category,
    });
    cursor = a.offset + a.length;
  }
  if (cursor < essay.length) {
    segments.push({ kind: "text", text: essay.slice(cursor) });
  }
  return segments;
}

function buildCriterionInsights(result: WritingSubmissionResult) {
  return [
    {
      key: "task_achievement",
      title: "Task Achievement",
      band: toBandNumber(result.task_achievement.band),
      data: result.task_achievement,
    },
    {
      key: "coherence",
      title: "Coherence & Cohesion",
      band: toBandNumber(result.coherence.band),
      data: result.coherence,
    },
    {
      key: "lexical",
      title: "Lexical Resource",
      band: toBandNumber(result.lexical.band),
      data: result.lexical,
    },
    {
      key: "grammar",
      title: "Grammatical Range & Accuracy",
      band: toBandNumber(result.grammar.band),
      data: result.grammar,
    },
  ];
}

function getTargetBandActions({
  actionPlan,
  annotations,
  checklist,
  currentBand,
  desiredScore,
  errorPatterns,
  result,
}: {
  actionPlan: WritingActionPlan | null | undefined;
  annotations: WritingInlineAnnotation[];
  checklist: WritingChecklistItem[];
  currentBand: number;
  desiredScore: number;
  errorPatterns: WritingErrorPattern[];
  result: WritingSubmissionResult;
}): WritingTargetAction[] {
  if (result.target_action_plan?.length) {
    return result.target_action_plan.slice(0, 3);
  }
  const gap = Math.max(0, desiredScore - currentBand);
  const steps: string[] = [];
  const seen = new Set<string>();
  const add = (value: string | null | undefined) => {
    const clean = (value ?? "").replace(/\s+/g, " ").trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    steps.push(clean);
  };

  const missingChecklist = checklist.filter((item) => item.status !== "met");
  const topPattern = errorPatterns[0];
  const firstFixable = annotations.find((item) => item.replacements?.[0] || item.improved_sentence);

  if (gap <= 0) {
    const nextTarget = Math.min(9, currentBand + 0.5);
    add(`You passed the desired Band ${desiredScore.toFixed(1)} target. Keep Band ${currentBand.toFixed(1)} stable, then push toward Band ${nextTarget.toFixed(1)}.`);
  } else if (gap <= 0.5) {
    add(`To reach Band ${desiredScore.toFixed(1)}, protect the current structure and remove the highest-impact sentence errors first.`);
  } else {
    add(`To move from Band ${currentBand.toFixed(1)} to Band ${desiredScore.toFixed(1)}, fix the score limiter first: ${actionPlan?.main_limiter || "the weakest IELTS criterion"}.`);
  }

  if (actionPlan?.fixes?.length) {
    actionPlan.fixes.forEach(add);
  }
  if (missingChecklist[0]) {
    add(`${missingChecklist[0].label}: ${missingChecklist[0].detail}`);
  }
  if (topPattern) {
    add(`Reduce ${topPattern.label.toLowerCase()} errors: ${topPattern.count} issue${topPattern.count === 1 ? "" : "s"} found${topPattern.examples[0] ? `, starting with "${topPattern.examples[0]}"` : ""}.`);
  }
  if (firstFixable) {
    const replacement = firstFixable.improved_sentence || firstFixable.replacements?.[0];
    add(`Fix this sentence first: replace "${firstFixable.original}"${replacement ? ` with "${replacement}"` : ""}.`);
  }
  result.next_steps?.forEach(add);

  const fallback = [
    "Rewrite the weakest body paragraph with one clear topic sentence, one explanation, and one concrete example or comparison.",
    "Check every paragraph for one main idea only; split mixed ideas into separate sentences.",
    "After revision, re-submit the essay and compare the new band against your desired score.",
  ];
  fallback.forEach(add);

  const target = currentBand >= desiredScore ? Math.min(9, currentBand + 0.5) : Math.min(desiredScore, currentBand + 1);
  return steps.slice(0, 3).map((step, index) => ({
    title: step.split(";")[0].split(".")[0].slice(0, 72),
    why: `Band ${currentBand.toFixed(1)} -> ${target.toFixed(1)}`,
    how: step,
    example: "",
    band_impact: `${currentBand.toFixed(1)} -> ${target.toFixed(1)}`,
    priority: index + 1,
  }));
}

function ScoreGauge({ band }: { band: number }) {
  const tone = bandTone(band);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, band / 9));
  const offset = circumference * (1 - pct);
  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg viewBox="0 0 200 200" className="h-40 w-40 -rotate-90">
        <circle cx="100" cy="100" r={radius} className="fill-none stroke-muted/40" strokeWidth="14" />
        <circle
          cx="100"
          cy="100"
          r={radius}
          className={cn("fill-none transition-all duration-1000 ease-out", tone.ring)}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn("text-[2.7rem] font-semibold tabular-nums", tone.text)}>
          {band.toFixed(1)}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">/ 9.0</div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div
        className={cn(
          "text-xl font-semibold tabular-nums",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "warning" && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function xpNumber(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}


function TargetActionPlanPanel({
  actionPlan,
  currentBand,
  desiredScore,
  targetActions,
}: {
  actionPlan: WritingActionPlan | null | undefined;
  currentBand: number;
  desiredScore: number;
  targetActions: WritingTargetAction[];
}) {
  const gap = Math.max(0, desiredScore - currentBand);
  const targetExceeded = currentBand >= desiredScore;
  const nextTarget = targetExceeded ? Math.min(9, currentBand + 0.5) : Math.min(desiredScore, currentBand + 1);
  return (
    <Card className="rounded-2xl border-border/60 bg-card/50 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{targetExceeded ? "Target passed" : "Target gap"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Band {currentBand.toFixed(1)} <ArrowRight className="mx-1 inline h-3.5 w-3.5" /> {nextTarget.toFixed(1)}
              {gap > 0 ? ` · aim +0.5 to +1.0` : " · protect this score, then +0.5"}
            </p>
          </div>
          {actionPlan?.main_limiter ? (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">Limiter</div>
              <div className="text-sm font-semibold">{actionPlan.main_limiter}</div>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {targetActions.map((action, index) => (
          <div
            key={`${action.title}-${index}`}
            className="flex gap-3 rounded-2xl border border-border/50 bg-background/40 p-3.5"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/12 text-sm font-bold text-violet-700 dark:text-violet-300">
              {action.priority || index + 1}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-foreground">{action.title}</p>
                <span className="shrink-0 rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                  {action.band_impact || `${currentBand.toFixed(1)} → ${nextTarget.toFixed(1)}`}
                </span>
              </div>
              {action.how ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{action.how}</p>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ImprovedDiffView({ original, improved }: { original: string; improved: string }) {
  const diff = useMemo(() => buildInlineDiff(original, improved), [original, improved]);
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 text-sm leading-7 whitespace-pre-wrap">
      {diff.map((part, index) => {
        if (part.kind === "removed") {
          return (
            <span key={index} className="rounded bg-rose-500/10 px-0.5 text-rose-700 line-through decoration-rose-500 decoration-2 dark:text-rose-300">
              {part.text}
            </span>
          );
        }
        if (part.kind === "added") {
          return (
            <span key={index} className="rounded bg-emerald-500/15 px-0.5 font-medium text-emerald-800 dark:text-emerald-200">
              {part.text}
            </span>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </div>
  );
}

function CriterionCard({
  title,
  data,
  accent,
}: {
  title: string;
  data: WritingCriterionEvaluation;
  accent: string;
}) {
  const band = toBandNumber(data.band);
  const tone = bandTone(band);
  return (
    <Card className="rounded-3xl border-border/60 bg-card/40 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={cn("text-[11px] font-semibold uppercase tracking-wider", accent)}>
              Criterion
            </div>
            <CardTitle className="text-lg mt-1">{title}</CardTitle>
          </div>
          <div className="text-right">
            <div className={cn("text-3xl font-semibold tabular-nums", tone.text)}>
              {band.toFixed(1)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{tone.label}</div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className={cn("h-full transition-all duration-700", tone.bar)}
            style={{ width: `${Math.min(100, (band / 9) * 100)}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {data.summary ? (
          <p className="text-sm text-foreground/90 italic leading-relaxed">{data.summary}</p>
        ) : null}

        {data.strengths?.length ? (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Strengths
            </div>
            <ul className="space-y-1.5">
              {data.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data.improvements?.length ? (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              How to improve
            </div>
            <ul className="space-y-1.5">
              {data.improvements.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/90">
                  <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data.evidence_quotes?.length ? (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Evidence from your essay
            </div>
            <div className="space-y-1.5">
              {data.evidence_quotes.map((q, i) => (
                <div
                  key={i}
                  className="flex gap-2 rounded-2xl border border-border/40 bg-muted/30 px-3 py-2 text-sm italic text-muted-foreground"
                >
                  <Quote className="h-3.5 w-3.5 mt-1 flex-shrink-0 opacity-60" />
                  <span>{q}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {data.reasoning ? (
          <details className="group rounded-2xl border border-border/40 bg-muted/20 px-3 py-2 text-sm">
            <summary className="cursor-pointer list-none font-medium text-muted-foreground group-open:text-foreground flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" />
              Why this band?
            </summary>
            <p className="mt-2 text-foreground/80 leading-relaxed">{data.reasoning}</p>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GradingScreen({ stage, activeStep }: { stage: LoadingStage; activeStep: number }) {
  const currentStep = GRADING_STEPS[Math.min(activeStep, GRADING_STEPS.length - 1)] ?? GRADING_STEPS[0];
  const CurrentIcon = currentStep.icon;
  const progress = Math.min(100, Math.max(8, ((activeStep + 0.72) / GRADING_STEPS.length) * 100));
  const statusCopy = stage === "loading_result"
    ? "Your feedback is being assembled into a clear, useful report."
    : "We’re checking your response against the IELTS writing rubric.";

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <Card className="relative overflow-hidden rounded-[28px] border-border/60 bg-card shadow-[0_24px_70px_-46px_rgba(15,23,42,0.35)]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        <CardContent className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.82fr)] lg:gap-12 lg:p-10">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <span className="absolute inset-0 animate-ping rounded-2xl bg-violet-500/10" />
                <Loader2 className="relative h-5 w-5 animate-spin" />
              </span>
              <Badge tone="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300">
                Writing review
              </Badge>
            </div>

            <h1 className="mt-6 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-4xl">
              Your essay is being read with care.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {statusCopy} Your final report will bring the score, evidence, and next steps together in one place.
            </p>

            <div className="mt-8 max-w-xl rounded-2xl border border-border/60 bg-muted/20 p-4" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span>Review in progress</span>
                <span>Quietly reviewing</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-400 transition-[width] duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-4 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <CurrentIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{currentStep.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{stage === "loading_result" ? "Polishing your feedback..." : "This step is happening quietly in the background."}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                  In progress
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-border/60 bg-muted/15 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Rubric review</p>
                <p className="mt-1 text-sm font-semibold text-foreground">A thoughtful check, not a quick guess.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-5 space-y-1.5">
              {GRADING_STEPS.map((step, idx) => {
                const isActive = idx === activeStep;
                const isDone = idx < activeStep;
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors",
                      isActive && "bg-violet-500/10",
                      isDone && "text-emerald-700 dark:text-emerald-300",
                      !isActive && !isDone && "text-muted-foreground",
                    )}
                  >
                    <span className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      isDone && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                      isActive && "bg-violet-500 text-white shadow-sm",
                      !isActive && !isDone && "bg-muted text-muted-foreground",
                    )}>
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn("min-w-0 truncate text-xs font-medium", isActive && "font-semibold text-violet-800 dark:text-violet-200")}>{step.label}</span>
                    {isDone ? <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Done</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 px-2 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        Your draft stays private while your feedback is prepared.
      </div>
    </div>
  );
}

function FailedScreen({
  message,
  onRetry,
  retrying,
}: {
  message: string | null;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <Card className="rounded-3xl border-rose-500/30 bg-rose-500/5">
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-rose-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Grading failed</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {message || "Something went wrong while grading your essay. Please try again."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={onRetry} disabled={retrying}>
            {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/writing">Back to writing</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackPanel({
  roast,
  taBand,
  ccBand,
  lrBand,
  graBand,
}: {
  roast: WritingRoastFeedback;
  taBand: number;
  ccBand: number;
  lrBand: number;
  graBand: number;
}) {
  const zingers: { label: string; tone: string; text: string; band: number }[] = [
    { label: "Task Achievement", tone: "text-violet-600 dark:text-violet-400", text: roast.task_achievement_zinger, band: taBand },
    { label: "Coherence & Cohesion", tone: "text-blue-600 dark:text-blue-400", text: roast.coherence_zinger, band: ccBand },
    { label: "Lexical Resource", tone: "text-emerald-600 dark:text-emerald-400", text: roast.lexical_zinger, band: lrBand },
    { label: "Grammar", tone: "text-amber-600 dark:text-amber-400", text: roast.grammar_zinger, band: graBand },
  ].filter((z) => z.text);

  return (
    <Card className="rounded-3xl border-border/60 bg-gradient-to-br from-amber-500/5 via-card to-card mt-2">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Roast feedback</CardTitle>
          <Badge tone="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            Savage mode
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Blunt, plain-English feedback about the writing. Bands are not affected by this section.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {roast.overall_roast ? (
          <p className="text-sm text-foreground/90 leading-relaxed">{roast.overall_roast}</p>
        ) : null}

        {roast.one_liner ? (
          <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-500/5 px-4 py-3 italic text-sm text-foreground/90">
            “{roast.one_liner}”
          </div>
        ) : null}

        {zingers.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {zingers.map((z) => (
              <div key={z.label} className="rounded-2xl border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className={cn("text-[11px] font-semibold uppercase tracking-wider", z.tone)}>
                    {z.label}
                  </div>
                  <div className="text-xs tabular-nums text-muted-foreground">Band {z.band.toFixed(1)}</div>
                </div>
                <p className="text-sm text-foreground/90 mt-1.5">{z.text}</p>
              </div>
            ))}
          </div>
        ) : null}

        {roast.savage_tips?.length ? (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              What to actually fix
            </div>
            <ul className="space-y-1.5">
              {roast.savage_tips.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Flame className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {roast.pep_talk ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{roast.pep_talk}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VocabularySuggestionCard({
  suggestion,
}: {
  suggestion: WritingVocabularySuggestion;
}) {
  const isC2 = suggestion.level.toUpperCase() === "C2";
  return (
    <div className="rounded-2xl border border-border/60 bg-card/55 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Natural upgrade
          </div>
          <div className="mt-1 text-sm font-semibold leading-snug text-foreground break-words">
            {suggestion.current_phrase}
          </div>
        </div>
        <Badge
          tone="outline"
          className={cn(
            "shrink-0 border-border/70 bg-muted/40 text-foreground",
            isC2 && "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
          )}
        >
          {suggestion.level}
        </Badge>
      </div>
      <div className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
        <span className="text-sm font-medium leading-snug text-emerald-700 dark:text-emerald-300 break-words">
          {suggestion.improved_phrase}
        </span>
      </div>
      {suggestion.example_sentence ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground break-words">
          <span className="font-semibold text-foreground/80">Example:</span> {suggestion.example_sentence}
        </p>
      ) : null}
    </div>
  );
}

type ReportCriterion = {
  key: "task_achievement" | "coherence" | "lexical" | "grammar";
  label: string;
  data: WritingCriterionEvaluation;
  band: number;
  bar: string;
  dot: string;
};

const REPORT_CRITERIA: Array<Pick<ReportCriterion, "key" | "label" | "bar" | "dot">> = [
  { key: "task_achievement", label: "Task Response", bar: "bg-violet-500", dot: "bg-violet-500" },
  { key: "coherence", label: "Coherence & Cohesion", bar: "bg-sky-500", dot: "bg-sky-500" },
  { key: "lexical", label: "Lexical Resource", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  { key: "grammar", label: "Grammar", bar: "bg-amber-500", dot: "bg-amber-500" },
];

function reportCriteria(result: WritingSubmissionResult): ReportCriterion[] {
  return REPORT_CRITERIA.map((item) => ({
    ...item,
    data: result[item.key],
    band: toBandNumber(result[item.key].band),
  }));
}

function reportLimiter(result: WritingSubmissionResult): string {
  if (result.score_limiting_criterion?.trim()) return result.score_limiting_criterion.trim();
  if (result.action_plan?.main_limiter?.trim()) return result.action_plan.main_limiter.trim();
  const weakest = reportCriteria(result).sort((a, b) => a.band - b.band)[0];
  return weakest?.label ?? "the weakest IELTS criterion";
}

function reportConfidenceReason(result: WritingSubmissionResult): string {
  const range = result.possible_score_range?.trim();
  const coverage = result.benchmark_coverage;
  const coverageText = coverage === null || coverage === undefined || coverage === ""
    ? "the available evidence"
    : `${coverage}% of the relevant benchmark coverage`;
  return range
    ? `The score is estimated within Band ${range}, based on ${coverageText}.`
    : `The estimate reflects ${coverageText}; use the highlighted evidence to judge the result.`;
}

function ReportConfidenceBadge({ result }: { result: WritingSubmissionResult }) {
  const confidence = String(result.confidence || "Medium").toLowerCase();
  const label = confidence.includes("high") ? "High confidence" : confidence.includes("low") ? "Low confidence" : "Medium confidence";
  const tone = label.startsWith("High")
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : label.startsWith("Low")
      ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return (
    <details className="relative group">
      <summary className={cn("list-none cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold", tone)}>
        {label}
      </summary>
      <div className="absolute left-0 top-9 z-20 w-64 rounded-xl border border-border bg-popover p-3 text-xs leading-5 text-popover-foreground shadow-xl">
        {reportConfidenceReason(result)}
      </div>
    </details>
  );
}

function ReportFlagBanner({ result }: { result: WritingSubmissionResult }) {
  const underLength = Boolean(result.flags?.under_length) || result.word_count < result.word_minimum;
  const nonEnglish = Boolean(result.flags?.non_english);
  const injection = Boolean(result.flags?.injection_attempt_detected);
  const partial = String(result.pipeline_status ?? "").toLowerCase() === "partial";
  if (!underLength && !nonEnglish && !injection && !partial) return null;
  const messages = [
    underLength ? `Your response is ${result.word_count} words; the task minimum is ${result.word_minimum}.` : null,
    nonEnglish ? "Some of the response may not be in English, so language scores may be less reliable." : null,
    injection ? "The response included instructions unrelated to the writing task; those parts were excluded from scoring." : null,
    partial ? "Some diagnostic sections are still unavailable, so this report is partial." : null,
  ].filter((message): message is string => Boolean(message));
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100" role="status">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
      <div>
        <p className="font-semibold">Read this estimate with care</p>
        <ul className="mt-1 space-y-1 text-xs leading-5 text-amber-800/90 dark:text-amber-100/80">
          {messages.map((message) => <li key={message}>{message}</li>)}
        </ul>
      </div>
    </div>
  );
}

function ReportCriterionBars({ result }: { result: WritingSubmissionResult }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {reportCriteria(result).map((criterion) => (
        <div key={criterion.key} className="rounded-xl border border-border/60 bg-background/55 p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-semibold leading-4 text-muted-foreground">{criterion.label}</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{criterion.band.toFixed(1)}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-[width] duration-700", criterion.bar)} style={{ width: `${Math.min(100, Math.max(0, criterion.band / 9 * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportAnnotatedEssay({
  result,
  segments,
  activeAnno,
  activeAnnotation,
  activeAnnoSentencePreview,
  annotatedRef,
  copiedAnnotation,
  onAnnotationSelect,
  onCopy,
}: {
  result: WritingSubmissionResult;
  segments: AnnotatedSegment[];
  activeAnno: WritingInlineAnnotation | null;
  activeAnnotation: number | null;
  activeAnnoSentencePreview: { originalSentence: string; improvedSentence: string } | null;
  annotatedRef: RefObject<HTMLDivElement>;
  copiedAnnotation: number | null;
  onAnnotationSelect: (index: number) => void;
  onCopy: (value: string, annotationIndex: number | null) => Promise<void>;
}) {
  return (
    <Card className="rounded-[24px] border-border/60 bg-card/55 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Tier 2 · Read view</p>
            <CardTitle className="mt-1 text-xl">Your essay, with useful signals</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Select a highlighted phrase to see one issue and one practical fix.</p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />Grammar</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" />Lexical</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" />Cohesion</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={annotatedRef} className="whitespace-pre-wrap rounded-2xl border border-border/60 bg-background/55 p-4 text-[15px] leading-8 text-foreground sm:p-6 sm:text-base">
          {segments.map((segment, index) => {
            if (segment.kind === "text") {
              return <span key={`text-${index}`}>{segment.text}</span>;
            }
            const annotation = result.inline_annotations[segment.index];
            const isActive = activeAnnotation === segment.index;
            const correctedText = annotation?.replacements?.[0] || annotation?.improved_sentence || "Use a clearer version of this phrase.";
            return (
              <span key={`mark-${segment.index}-${index}`} className="inline">
                <button
                  type="button"
                  data-anno-idx={segment.index}
                  aria-expanded={isActive}
                  onClick={() => onAnnotationSelect(segment.index)}
                  className={cn(
                    "rounded px-0.5 underline decoration-2 underline-offset-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    categoryStyle(segment.category).fill,
                    isActive && "ring-2 ring-ring/60",
                  )}
                >
                  {segment.text}
                </button>
                {isActive && annotation ? (
                  <span role="dialog" className="mx-1 inline-flex max-w-[min(19rem,calc(100vw-3rem))] translate-y-1 flex-col whitespace-normal rounded-xl border border-border/70 bg-popover px-3 py-2 align-top text-left text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-150">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Corrected version</span>
                    <span className="mt-0.5 text-sm font-semibold leading-5 text-emerald-700 dark:text-emerald-300">{correctedText}</span>
                    {annotation.short_message ? <span className="mt-1 text-[11px] leading-4 text-muted-foreground">{annotation.short_message}</span> : null}
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>
        {!result.inline_annotations.length ? <p className="mt-3 text-xs text-muted-foreground">No inline annotations were generated for this essay.</p> : null}
      </CardContent>
    </Card>
  );
}

function ReportPriorityActions({ actions }: { actions: WritingTargetAction[] }) {
  const fallback: WritingTargetAction[] = [
    { title: "Strengthen the score limiter", why: "Focus on the weakest criterion first.", how: "Use one clear improvement in every paragraph.", example: "", band_impact: "", priority: 1 },
    { title: "Make each paragraph do one job", why: "Clear structure is easier to follow.", how: "Use a topic sentence, explanation, and specific support.", example: "", band_impact: "", priority: 2 },
    { title: "Proofread the final draft", why: "Small repeated errors can hold a band down.", how: "Leave one short pass for grammar, word choice, and punctuation.", example: "", band_impact: "", priority: 3 },
  ];
  const visible = [...actions, ...fallback].slice(0, 3);
  return (
    <Card className="rounded-[24px] border-border/60 bg-card/55 shadow-sm">
      <CardHeader className="pb-2"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Top 3 priority actions</p><CardTitle className="mt-1 text-xl">What to work on next</CardTitle></CardHeader>
      <CardContent className="space-y-2.5">
        {visible.map((action, index) => (
          <div key={`${action.title}-${index}`} className="flex gap-3 rounded-2xl border border-border/50 bg-background/45 p-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-sm font-bold text-violet-700 dark:text-violet-300">{index + 1}</span>
            <div className="min-w-0"><p className="text-sm font-semibold text-foreground">{action.title || "Priority improvement"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{action.how || action.why || "Use this change consistently in your next response."}</p></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReportBandCeiling({ result, overall }: { result: WritingSubmissionResult; overall: number }) {
  const limiter = reportLimiter(result);
  const boundary = (result.band_boundaries ?? []).find((item) => item.criterion.toLowerCase().includes(limiter.toLowerCase().split(" ")[0])) ?? result.band_boundaries?.[0];
  const current = boundary ? toBandNumber(boundary.current_band) : overall;
  const next = boundary ? toBandNumber(boundary.next_band) : Math.min(9, overall + 0.5);
  return (
    <Card className="rounded-[24px] border-amber-500/20 bg-amber-500/5 shadow-sm">
      <CardHeader className="pb-2"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Band ceiling</p><CardTitle className="mt-1 text-xl">What would move this score up?</CardTitle></CardHeader>
      <CardContent><p className="text-sm leading-6 text-foreground/85">Your current ceiling is mainly shaped by <span className="font-semibold">{limiter}</span> at around Band {current.toFixed(1)}. {boundary?.why_current || `The next half-band will come from making this criterion more consistent across the whole essay.`}</p><p className="mt-2 text-sm leading-6 text-foreground/85">To move toward Band {next.toFixed(1)}, focus on {boundary?.required_for_next || result.action_plan?.fixes?.[0] || "one clear improvement from the priority actions above"}.</p></CardContent>
    </Card>
  );
}

function ReportCriterionAccordion({ criterion }: { criterion: ReportCriterion }) {
  return (
    <details className="group rounded-2xl border border-border/60 bg-card/45">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5"><span className="flex min-w-0 items-center gap-2.5"><span className={cn("h-2 w-2 rounded-full", criterion.dot)} /><span className="truncate text-sm font-semibold text-foreground">{criterion.label}</span></span><span className="flex items-center gap-2"><span className="text-sm font-bold tabular-nums text-foreground">{criterion.band.toFixed(1)}</span><ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground transition-transform group-open:-rotate-90" /></span></summary>
      <div className="border-t border-border/50 px-4 pb-4 pt-3"><p className="text-sm leading-6 text-foreground/85">{criterion.data.summary || "No summary was provided for this criterion."}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{criterion.data.strengths?.length ? <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">Strengths</p><ul className="mt-1 space-y-1 text-sm leading-5 text-muted-foreground">{criterion.data.strengths.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}{criterion.data.improvements?.length ? <div><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">Weaknesses</p><ul className="mt-1 space-y-1 text-sm leading-5 text-muted-foreground">{criterion.data.improvements.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}</div>{criterion.data.evidence_quotes?.length ? <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Evidence</p><ul className="mt-1 space-y-1 text-xs italic leading-5 text-muted-foreground">{criterion.data.evidence_quotes.map((item) => <li key={item}>“{item}”</li>)}</ul></div> : null}</div>
    </details>
  );
}

function BlueprintWritingReport({
  result,
  overall,
  confidence,
  possibleScoreRange,
  targetActions,
  annotations,
  segments,
  activeAnnotation,
  activeAnno,
  activeAnnoSentencePreview,
  annotatedRef,
  copiedAnnotation,
  onAnnotationSelect,
  onCopy,
  trend,
  showImprovedVersion,
  setShowImprovedVersion,
  checklist,
  errorPatterns,
}: {
  result: WritingSubmissionResult;
  overall: number;
  confidence: string;
  possibleScoreRange: string;
  targetActions: WritingTargetAction[];
  annotations: WritingInlineAnnotation[];
  segments: AnnotatedSegment[];
  activeAnnotation: number | null;
  activeAnno: WritingInlineAnnotation | null;
  activeAnnoSentencePreview: { originalSentence: string; improvedSentence: string } | null;
  annotatedRef: RefObject<HTMLDivElement>;
  copiedAnnotation: number | null;
  onAnnotationSelect: (index: number) => void;
  onCopy: (value: string, annotationIndex: number | null) => Promise<void>;
  trend: number | null;
  showImprovedVersion: boolean;
  setShowImprovedVersion: (value: boolean) => void;
  checklist: WritingChecklistItem[];
  errorPatterns: WritingErrorPattern[];
}) {
  const criteria = reportCriteria(result);
  const systematicPatterns = errorPatterns.filter((pattern) => pattern.count >= 2 && pattern.examples.length >= 2);
  const practiceTasks = checklist.filter((item) => item.status !== "met").slice(0, 4);
  const confidenceMode = String(result.mode ?? "").toLowerCase();
  const trendLabel = trend === null ? null : trend > 0.05 ? "Up" : trend < -0.05 ? "Down" : "Flat";
  return (
    <div className="mx-auto w-full max-w-[82rem] space-y-6 pb-10 animate-in fade-in duration-500">
      <Card className="rounded-[28px] border-border/60 bg-card shadow-[0_24px_70px_-46px_rgba(15,23,42,0.35)]">
        <CardContent className="p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">IELTS Writing report</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{result.task_title}</h1><p className="mt-1 text-xs text-muted-foreground">{result.task_type === "task_1" ? "Task 1" : "Task 2"} · {formatDate(result.graded_at)}</p></div><div className="flex flex-wrap gap-2"><Button asChild size="sm"><Link href="/writing"><ArrowLeft className="h-4 w-4" /> Back to writing</Link></Button><Button asChild size="sm" variant="outline"><Link href="/writing/history">History</Link></Button></div></div>
          <ReportFlagBanner result={result} />
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Final band</p><div className="mt-1 flex flex-wrap items-center gap-3"><span className="text-[5.5rem] font-semibold leading-none tracking-[-0.08em] text-foreground sm:text-[7rem]">{overall.toFixed(1)}</span><ReportConfidenceBadge result={result} />{trendLabel ? <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold", trendLabel === "Up" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : trendLabel === "Down" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-muted text-muted-foreground")}>{trendLabel === "Up" ? "↑" : trendLabel === "Down" ? "↓" : "→"} {trendLabel}</span> : null}</div>{confidenceMode === "fast" ? <p className="mt-2 text-xs text-muted-foreground">Quick estimate · a fuller diagnostic may add more detail.</p> : null}</div><div className="max-w-sm text-sm leading-6 text-muted-foreground">Your biggest opportunity right now: <span className="font-semibold text-foreground">{reportLimiter(result)}</span>.</div></div>
          <div className="mt-7"><ReportCriterionBars result={result} /></div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <ReportAnnotatedEssay result={result} segments={segments} activeAnno={activeAnno} activeAnnotation={activeAnnotation} activeAnnoSentencePreview={activeAnnoSentencePreview} annotatedRef={annotatedRef} copiedAnnotation={copiedAnnotation} onAnnotationSelect={onAnnotationSelect} onCopy={onCopy} />
        <div className="space-y-5"><ReportPriorityActions actions={targetActions} /><ReportBandCeiling result={result} overall={overall} /></div>
      </div>

      <Card className="rounded-[24px] border-border/60 bg-card/45 shadow-sm"><CardHeader className="pb-3"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Tier 3 · Deep dive</p><CardTitle className="mt-1 text-xl">Explore the detail when you’re ready</CardTitle><p className="mt-1 text-sm text-muted-foreground">Each section starts closed so the report stays easy to scan.</p></CardHeader><CardContent className="space-y-2.5">{criteria.map((criterion) => <ReportCriterionAccordion key={criterion.key} criterion={criterion} />)}
        {result.improved_version && normalizedEssayText(result.improved_version) !== normalizedEssayText(result.essay_text) ? <details className="group rounded-2xl border border-border/60 bg-card/45"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5"><span className="text-sm font-semibold">See a stronger version</span><ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground transition-transform group-open:-rotate-90" /></summary><div className="border-t border-border/50 px-4 pb-4 pt-3"><button type="button" onClick={() => setShowImprovedVersion(!showImprovedVersion)} className="text-sm font-semibold text-violet-700 dark:text-violet-300">{showImprovedVersion ? "Hide Band 8.0+ version" : "See a Band 8.0+ version of this essay"}</button>{showImprovedVersion ? <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-border/50 bg-background/55 p-4 text-sm leading-7 text-foreground sm:p-5">{result.improved_version}</div> : null}</div></details> : null}
        {systematicPatterns.length ? <details className="group rounded-2xl border border-border/60 bg-card/45"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5"><span className="text-sm font-semibold">Systematic error patterns</span><span className="text-xs text-muted-foreground">{systematicPatterns.length} patterns</span></summary><div className="grid gap-2 border-t border-border/50 px-4 pb-4 pt-3 sm:grid-cols-2">{systematicPatterns.map((pattern) => <div key={`${pattern.category}-${pattern.label}`} className="rounded-xl border border-border/50 bg-background/45 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{pattern.label}</p><span className="text-xs text-muted-foreground">{pattern.count} examples</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{pattern.fix || pattern.examples.slice(0, 2).join(" · ")}</p></div>)}</div></details> : null}
        <details className="group rounded-2xl border border-border/60 bg-card/45"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5"><span className="text-sm font-semibold">Practice checklist</span><span className="text-xs text-muted-foreground">{practiceTasks.length || 0} tasks</span></summary><div className="border-t border-border/50 px-4 pb-4 pt-3">{practiceTasks.length ? <ul className="space-y-2">{practiceTasks.map((item) => <li key={item.label} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="mt-1 h-3.5 w-3.5 shrink-0 rounded border border-violet-500/50" /><span><span className="font-semibold text-foreground">{item.label}</span>{item.how_to_fix || item.detail ? <span className="block text-xs leading-5">{item.how_to_fix || item.detail}</span> : null}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Your current checklist is clear. Re-read the essay once before submitting the next one.</p>}</div></details>
        {result.vocabulary_suggestions?.length ? <details className="group rounded-2xl border border-border/60 bg-card/45"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5"><span className="text-sm font-semibold">Vocabulary upgrades</span><span className="text-xs text-muted-foreground">{result.vocabulary_suggestions.length} suggestions</span></summary><div className="grid gap-2 border-t border-border/50 px-4 pb-4 pt-3 sm:grid-cols-2">{result.vocabulary_suggestions.slice(0, 6).map((suggestion, index) => <VocabularySuggestionCard key={`${suggestion.current_phrase}-${index}`} suggestion={suggestion} />)}</div></details> : null}
        {result.roast && (result.roast.overall_roast || result.roast.savage_tips?.length) ? <details open className="group rounded-2xl border border-amber-500/25 bg-amber-500/5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5"><span className="flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-amber-500" />Roast feedback</span><span className="text-xs text-muted-foreground">Optional</span></summary><div className="border-t border-amber-500/20 px-2 pb-2 pt-2"><FeedbackPanel roast={result.roast} taBand={toBandNumber(result.task_achievement.band)} ccBand={toBandNumber(result.coherence.band)} lrBand={toBandNumber(result.lexical.band)} graBand={toBandNumber(result.grammar.band)} /></div></details> : null}
      </CardContent></Card>

      <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild><Link href="/writing"><PenSquare className="h-4 w-4" /> Try another task</Link></Button><Button asChild variant="outline"><Link href="/dashboard">Back to dashboard</Link></Button></div>
    </div>
  );
}

export function WritingResultClient({
  submissionId,
  initialStatus,
  initialErrorMessage,
  initialResult,
}: ResultClientProps) {
  const initialStage = useMemo<LoadingStage>(() => {
    const status = String(initialStatus ?? "").toLowerCase();
    if (initialResult) return "ready";
    if (status === "failed") return "failed";
    return "polling";
  }, [initialStatus, initialResult]);

  const [stage, setStage] = useState<LoadingStage>(initialStage);
  const [result, setResult] = useState<WritingSubmissionResult | null>(initialResult);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage);
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);
  const [activeVersion, setActiveVersion] = useState<"original" | "improved">("improved");
  const [showImprovedVersion, setShowImprovedVersion] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [sseAvailable, setSseAvailable] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [desiredScore, setDesiredScore] = useState(7.5);
  const [copiedAnnotation, setCopiedAnnotation] = useState<number | null>(null);
  const [historyItems, setHistoryItems] = useState<WritingHistoryItem[]>([]);
  const annotatedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("prime-desired-score");
      const parsed = saved ? parseFloat(saved) : 7.5;
      if (Number.isFinite(parsed)) {
        setDesiredScore(Math.min(9, Math.max(4, parsed)));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (stage === "ready" || stage === "failed") return;
    if (activeStep >= GRADING_STEPS.length - 1) return;
    // Do not park the UI on "Compiling feedback" while the backend is still
    // working. That final step is set when the completed event arrives.
    if (activeStep >= GRADING_STEPS.length - 2 && stage !== "loading_result") return;

    const delay = GRADING_STEP_DELAYS_MS[Math.min(activeStep, GRADING_STEP_DELAYS_MS.length - 1)] ?? 6000;

    const timer = setTimeout(() => {
      setActiveStep((prev) => Math.min(GRADING_STEPS.length - 1, prev + 1));
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [activeStep, stage]);

  useEffect(() => {
    if (stage === "ready" || stage === "failed" || !sseAvailable) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setSseAvailable(false);
      return;
    }

    const events = new EventSource(`/internal-api/writing/submissions/${submissionId}/events`);

    events.onmessage = async (event) => {
      const payload = JSON.parse(event.data) as {
        status?: string;
        stepIndex?: number;
        errorMessage?: string | null;
      };
      const status = String(payload.status ?? "").toLowerCase();
      if (typeof payload.stepIndex === "number") {
        const nextStep = Math.max(0, Math.min(payload.stepIndex, GRADING_STEPS.length - 1));
        setActiveStep((prev) => Math.max(prev, nextStep));
      }

      if (status === "completed") {
        setStage("loading_result");
        setActiveStep(GRADING_STEPS.length - 1);
        try {
          const resultPayload = await fetchWritingSubmissionResult(submissionId);
          setResult(resultPayload);
          setStage("ready");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load writing result.");
          setStage("failed");
        } finally {
          events.close();
        }
        return;
      }

      if (status === "failed") {
        setErrorMessage(payload.errorMessage ?? "Writing evaluation failed.");
        setStage("failed");
        events.close();
        return;
      }

      setStage(status === "queued" ? "polling" : "loading_result");
    };

    events.onerror = () => {
      events.close();
      setSseAvailable(false);
      setStage((current) => (current === "ready" || current === "failed" ? current : "polling"));
    };

    return () => {
      events.close();
    };
  }, [stage, submissionId, sseAvailable]);

  useEffect(() => {
    if (sseAvailable || stage === "ready" || stage === "failed") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const data = await pollWritingSubmission(submissionId);
        const status = String(data.status ?? "").toLowerCase();
        if (cancelled) return;
        if (status === "completed") {
          setStage("loading_result");
          setActiveStep(GRADING_STEPS.length - 1);
          const payload = await fetchWritingSubmissionResult(submissionId);
          if (!cancelled) {
            setResult(payload);
            setStage("ready");
          }
          return;
        }
        if (status === "failed") {
          if (!cancelled) {
            setErrorMessage(data.error_message ?? null);
            setStage("failed");
          }
          return;
        }
        timer = setTimeout(poll, 3000);
      } catch (err) {
        if (cancelled) return;
        timer = setTimeout(poll, 4500);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sseAvailable, stage, submissionId]);

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    void fetchWritingHistory()
      .then((payload) => {
        if (!cancelled) setHistoryItems(payload.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistoryItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [result]);

  const annotations = useMemo(
    () => result?.inline_annotations ?? [],
    [result?.inline_annotations],
  );
  const segments = useMemo(
    () => (result ? buildAnnotatedSegments(result.essay_text, annotations) : []),
    [result, annotations],
  );

  useEffect(() => {
    if (activeAnnotation === null) return;
    const root = annotatedRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(
      `mark[data-anno-idx="${activeAnnotation}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeAnnotation]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    setErrorMessage(null);
    try {
      await retryWritingSubmission(submissionId);
      setResult(null);
      setActiveStep(0);
      setSseAvailable(true);
      setStage("polling");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Retry failed.");
      setStage("failed");
    } finally {
      setRetrying(false);
    }
  };

  const copyText = async (value: string, annotationIndex: number | null) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedAnnotation(annotationIndex);
      window.setTimeout(() => setCopiedAnnotation(null), 1500);
    } catch {}
  };

  if (stage === "failed") {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <FailedScreen message={errorMessage} onRetry={handleRetry} retrying={retrying} />
      </div>
    );
  }

  if (stage !== "ready" || !result) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <GradingScreen stage={stage} activeStep={activeStep} />
      </div>
    );
  }

  const overall = toBandNumber(result.overall_band);
  const storedDesiredScore = desiredScore;
  const resultDesiredScore = result.desired_score !== null && result.desired_score !== undefined
    ? toBandNumber(result.desired_score)
    : null;
  const effectiveDesiredScore = resultDesiredScore && resultDesiredScore > 0 ? resultDesiredScore : storedDesiredScore;
  const potential = result.potential_band !== null && result.potential_band !== undefined
    ? toBandNumber(result.potential_band)
    : null;
  const overallTone = bandTone(overall);

  const wordPenalty = toBandNumber(result.word_count_penalty);
  const errorCount = annotations.length;
  const focusedAnnotationIndex = activeAnnotation;
  const activeAnno = focusedAnnotationIndex !== null ? annotations[focusedAnnotationIndex] ?? null : null;
  const activeAnnoSentencePreview = activeAnno
    ? buildAnnotationSentencePreview(result.essay_text, activeAnno)
    : null;
  const hasImprovedTextChanges = Boolean(
    result.improved_version
      && normalizedEssayText(result.improved_version) !== normalizedEssayText(result.essay_text)
  );
  const taskBadgeLabel = result.task_type === "task_1" ? "Task 1" : "Task 2";
  const delta = potential !== null ? potential - overall : 0;
  const criterionInsights = buildCriterionInsights(result);
  const strongestCriterion = [...criterionInsights].sort((a, b) => b.band - a.band)[0] ?? null;
  const weakestCriterion = [...criterionInsights].sort((a, b) => a.band - b.band)[0] ?? null;
  const vocabularySuggestions = result.vocabulary_suggestions ?? [];
  const checklist = result.checklist ?? [];
  const errorPatterns = result.error_patterns ?? [];
  const selectedBenchmarks = result.selected_benchmarks ?? [];
  const confidence = result.confidence || "Medium";
  const possibleScoreRange = result.possible_score_range || `${overall.toFixed(1)}-${overall.toFixed(1)}`;
  const targetActions = getTargetBandActions({
    actionPlan: result.action_plan,
    annotations,
    checklist,
    currentBand: overall,
    desiredScore: effectiveDesiredScore,
    errorPatterns,
    result,
  });

  const priorSubmissions = historyItems
    .filter((item) => item.submission_id !== result.submission_id && item.task_type === result.task_type && String(item.status).toLowerCase() === "completed")
    .filter((item) => item.overall_band !== null && item.overall_band !== undefined)
    .sort((a, b) => new Date(b.graded_at ?? b.submitted_at).getTime() - new Date(a.graded_at ?? a.submitted_at).getTime());
  const trend = priorSubmissions.length >= 2
    ? toBandNumber(result.overall_band) - toBandNumber(priorSubmissions[0].overall_band)
    : null;

  return (
    <BlueprintWritingReport
      result={result}
      overall={overall}
      confidence={confidence}
      possibleScoreRange={possibleScoreRange}
      targetActions={targetActions}
      annotations={annotations}
      segments={segments}
      activeAnnotation={activeAnnotation}
      activeAnno={activeAnno}
      activeAnnoSentencePreview={activeAnnoSentencePreview}
      annotatedRef={annotatedRef}
      copiedAnnotation={copiedAnnotation}
      onAnnotationSelect={(index) => setActiveAnnotation((current) => (current === index ? null : index))}
      onCopy={copyText}
      trend={trend}
      showImprovedVersion={showImprovedVersion}
      setShowImprovedVersion={setShowImprovedVersion}
      checklist={checklist}
      errorPatterns={errorPatterns}
    />
  );

  // Keep the legacy branch type-safe while the report above owns the ready state.
  if (!result) return null;

  const readyResult = result!;
  const legacyActiveAnno = activeAnno;
  const legacyFocusedAnnotationIndex = focusedAnnotationIndex;
  const legacyActiveAnnoSentencePreview = activeAnnoSentencePreview;
  {
    const result = { ...readyResult, roast: readyResult.roast! };
    const activeAnno = legacyActiveAnno!;
    const focusedAnnotationIndex = legacyFocusedAnnotationIndex!;
    const activeAnnoSentencePreview = legacyActiveAnnoSentencePreview!;
    return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-0.5 px-0 pb-0 pt-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <CardTitle className="text-3xl text-foreground">{result.task_title}</CardTitle>
              <Badge tone="outline" className="border-border/70 bg-muted/40 text-foreground">
                Writing · {taskBadgeLabel}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button asChild size="sm">
                <Link href="/writing">
                  <ArrowLeft className="h-4 w-4" />
                  Back to writing
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/writing/history">View history</Link>
              </Button>
            </div>
          </div>
          <p className="-mt-1 text-sm text-muted-foreground">
            Submitted {formatDate(result.submitted_at)} · Graded {formatDate(result.graded_at)}
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)]">
        <Card className="rounded-3xl border-border/60 bg-card/40">
          <CardContent className="flex h-full flex-col items-center justify-center gap-2.5 px-6 py-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall band</div>
            <ScoreGauge band={overall} />
            <div className={cn("text-sm font-medium", overallTone.text)}>
              Band {overall.toFixed(1)} — {overallTone.label}
            </div>
            <div className="text-xs text-muted-foreground">
              {result.word_count} words · {taskBadgeLabel}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-card/40">
          <CardContent className="grid h-full auto-rows-fr content-center grid-cols-2 gap-3 p-6 sm:grid-cols-3">
            <StatTile
              icon={FileText}
              label="Word count"
              value={`${result.word_count}`}
              hint={`Target ${result.word_minimum}+`}
              tone={result.word_count >= result.word_minimum ? "positive" : "warning"}
            />
            <StatTile
              icon={Clock3}
              label="Time spent"
              value={formatDuration(result.time_spent_seconds)}
            />
            <StatTile
              icon={ClipboardList}
              label="Issues found"
              value={errorCount}
              hint={errorCount === 0 ? "Clean writing" : "See annotations"}
              tone={errorCount === 0 ? "positive" : undefined}
            />
            <StatTile
              icon={ArrowUpRight}
              label="Potential band"
              value={potential?.toFixed(1) ?? "—"}
              hint={potential !== null && delta > 0 ? `+${delta.toFixed(1)} possible` : "Review suggestions"}
              tone={potential !== null && delta > 0 ? "positive" : undefined}
            />
            <StatTile
              icon={AlertTriangle}
              label="Length penalty"
              value={wordPenalty > 0 ? `−${wordPenalty.toFixed(1)}` : "None"}
              tone={wordPenalty > 0 ? "warning" : "positive"}
            />
            <StatTile
              icon={CheckCircle2}
              label="Status"
              value="Completed"
              tone="positive"
            />
          </CardContent>

          {/* XP Ribbon added below the StatTiles */}
          <CardContent className="pt-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-4 shadow-sm">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black tracking-tight text-foreground">
                      +{(result.xp_awarded_total ?? 0).toLocaleString("en-US")}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      XP Earned
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {(() => {
                      const breakdown = result.xp_breakdown ?? {};
                      const items = [
                        { key: "activity_xp", label: "Writing completion" },
                        { key: "score_bonus", label: "Score bonus" },
                        { key: "improvement_bonus", label: "Improvement bonus" },
                        { key: "streak_bonus", label: "Streak bonus" },
                      ]
                        .map((item) => ({ ...item, value: xpNumber(breakdown[item.key]) }))
                        .filter((item) => item.value > 0);

                      if (items.length > 0) {
                        return items.map((item) => (
                          <div key={item.key} className="flex items-center gap-1 rounded-md border border-amber-500/20 bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm">
                            <span>{item.label}</span>
                            <span className="font-bold text-foreground">+{item.value}</span>
                          </div>
                        ));
                      }
                      return (
                        <div className="flex items-center gap-1 rounded-md border border-border/40 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                          No eligible XP
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex w-full items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 shadow-sm sm:w-auto">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Level</span>
                    <span className="text-sm font-bold text-foreground leading-tight mt-0.5">{result.xp_level_after ?? 1}</span>
                  </div>
                </div>
                <div className="flex w-full items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2 shadow-sm sm:w-auto">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">Streak</span>
                    <span className="text-sm font-bold text-foreground leading-tight mt-0.5">{result.xp_current_streak ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/40">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                AI estimate calibration
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                This is an AI IELTS estimate, not an official IELTS result. Criterion bands are whole bands; the overall score is rounded after averaging.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                Confidence: {confidence}
              </Badge>
              <Badge tone="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                Range: {possibleScoreRange}
              </Badge>
            </div>
          </div>
        </CardHeader>
        {selectedBenchmarks.length ? (
          <CardContent className="grid gap-3 pt-0 md:grid-cols-3">
            {selectedBenchmarks.slice(0, 3).map((benchmark) => (
              <div key={benchmark.card_id} className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-foreground">{benchmark.title}</div>
                  <Badge tone="outline" className="text-[10px]">Band {Number(benchmark.band).toFixed(1)}</Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{benchmark.tolerance_lesson || benchmark.use_when}</p>
              </div>
            ))}
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <CriterionCard title="Task Achievement" data={result.task_achievement} accent="text-violet-600 dark:text-violet-400" />
        <CriterionCard title="Coherence & Cohesion" data={result.coherence} accent="text-blue-600 dark:text-blue-400" />
        <CriterionCard title="Lexical Resource" data={result.lexical} accent="text-emerald-600 dark:text-emerald-400" />
        <CriterionCard title="Grammatical Range & Accuracy" data={result.grammar} accent="text-amber-600 dark:text-amber-400" />
      </div>

      <TargetActionPlanPanel
        actionPlan={result.action_plan}
        currentBand={overall}
        desiredScore={effectiveDesiredScore}
        targetActions={targetActions}
      />

      <Card className="rounded-3xl border-border/60 bg-card/40 mt-2">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Your essay with annotations</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click any highlighted span or issue row to lock the detail view. The issue table stays stable while you read.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CATEGORY_STYLE).map(([key, s]) => (
                <span
                  key={key}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    s.chip,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {errorCount === 0 ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <div className="text-sm text-emerald-700 dark:text-emerald-300">
                No inline annotations were generated for this essay.
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <div
              ref={annotatedRef}
              className={cn(
                "rounded-2xl border border-border/40 bg-muted/20 p-5 leading-8 text-[15px] whitespace-pre-wrap",
                errorCount > 0 && "max-h-[560px] overflow-y-auto"
              )}
            >
              {segments.map((seg, i) => {
                if (seg.kind === "text") {
                  return <span key={`t-${i}`}>{seg.text}</span>;
                }
                const style = categoryStyle(seg.category);
                const isActive = focusedAnnotationIndex === seg.index;
                const replacement = annotations[seg.index]?.replacements?.[0];
                return (
                  <span key={`m-${seg.index}`} className="inline-flex items-center gap-1 align-baseline">
                    <mark
                      data-anno-idx={seg.index}
                      title={buildAnnotationTooltip(annotations[seg.index] ?? { offset: 0, length: 0, original: "", replacements: [], category: seg.category })}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveAnnotation((prev) => (prev === seg.index ? null : seg.index));
                      }}
                      className={cn(
                        "rounded-md px-1 mx-px cursor-pointer scroll-mt-24 transition-all duration-200",
                        "underline decoration-wavy decoration-2 underline-offset-[5px]",
                        style.underline,
                        isActive ? style.fillActive : style.fill,
                      )}
                    >
                      {seg.text}
                    </mark>
                    {isActive && replacement ? (
                      <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-emerald-700 dark:text-emerald-300">
                        {replacement}
                      </span>
                    ) : null}
                  </span>
                );
              })}
            </div>

            {errorCount > 0 ? (
              <div className="rounded-2xl border border-border/40 bg-card/60 max-h-[560px] overflow-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/40 bg-card/95 backdrop-blur px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Issue table ({errorCount})</span>
                  {activeAnnotation !== null ? (
                    <button
                      type="button"
                      onClick={() => setActiveAnnotation(null)}
                      className="text-foreground/70 hover:text-foreground normal-case tracking-normal"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <table className="w-full min-w-[700px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-[33px] z-[9] bg-card/95 text-[10px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
                    <tr>
                      <th className="border-b border-border/40 px-3 py-2 font-semibold">#</th>
                      <th className="border-b border-border/40 px-3 py-2 font-semibold">Type</th>
                      <th className="border-b border-border/40 px-3 py-2 font-semibold">Problem</th>
                      <th className="border-b border-border/40 px-3 py-2 font-semibold">Fix</th>
                      <th className="border-b border-border/40 px-3 py-2 font-semibold">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annotations.map((a, i) => {
                      const s = categoryStyle(a.category);
                      const isActive = focusedAnnotationIndex === i;
                      const replacement = a.replacements?.[0] ?? "";
                      return (
                        <tr
                          key={i}
                          role="button"
                          tabIndex={0}
                          title={buildAnnotationTooltip(a)}
                          onClick={() => setActiveAnnotation((prev) => (prev === i ? null : i))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setActiveAnnotation((prev) => (prev === i ? null : i));
                            }
                          }}
                          className={cn(
                            "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive ? "bg-muted/70" : "hover:bg-muted/25",
                          )}
                        >
                          <td className="border-b border-border/30 px-3 py-3 align-top text-xs font-semibold text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="border-b border-border/30 px-3 py-3 align-top">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                s.chip,
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                              {s.label}
                            </span>
                          </td>
                          <td className="border-b border-border/30 px-3 py-3 align-top">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-foreground/90">
                                {a.short_message || "Writing issue"}
                              </div>
                              <div className={cn("text-xs font-semibold line-through", s.text)}>
                                {a.original}
                              </div>
                            </div>
                          </td>
                          <td className="border-b border-border/30 px-3 py-3 align-top">
                            {replacement ? (
                              <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                {replacement}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No direct replacement</span>
                            )}
                          </td>
                          <td className="border-b border-border/30 px-3 py-3 align-top text-xs leading-5 text-muted-foreground">
                            <span className="line-clamp-3">
                              {a.band_impact || a.explanation || "Open this row to view details."}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {activeAnno ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    categoryStyle(activeAnno.category).chip,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", categoryStyle(activeAnno.category).dot)} />
                  {categoryStyle(activeAnno.category).label}
                </span>
                {activeAnno.severity ? (
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {activeAnno.severity}
                  </span>
                ) : null}
                {focusedAnnotationIndex !== null ? (
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Issue #{focusedAnnotationIndex + 1}
                  </span>
                ) : null}
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Original
                  </div>
                  <div className="mt-2 text-sm font-medium text-foreground/90 line-through decoration-rose-500 decoration-2">
                    {activeAnno.original}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Better version
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {activeAnno.replacements?.length
                      ? activeAnno.replacements.map((rep, i) => (
                        <span key={i} className="rounded-md bg-emerald-500/10 px-2 py-0.5">
                          {rep}
                        </span>
                      ))
                      : <span>No direct replacement provided</span>}
                  </div>
                </div>
              </div>
              {activeAnno.explanation ? (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Why this is wrong
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed">{activeAnno.explanation}</p>
                </div>
              ) : null}
              {activeAnnoSentencePreview?.originalSentence ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Your sentence
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-muted/25 p-3 text-sm leading-7 whitespace-pre-wrap">
                      {activeAnnoSentencePreview.originalSentence}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Corrected sentence
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (focusedAnnotationIndex !== null) {
                            void copyText(activeAnnoSentencePreview.improvedSentence, focusedAnnotationIndex);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {focusedAnnotationIndex !== null && copiedAnnotation === focusedAnnotationIndex ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm leading-7 whitespace-pre-wrap text-foreground/90">
                      {activeAnnoSentencePreview.improvedSentence}
                    </div>
                  </div>
                </div>
              ) : null}
              {(activeAnno.band_impact || activeAnno.examiner_tip) ? (
                <div className="space-y-3">
                  {activeAnno.band_impact ? (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Band impact
                      </div>
                      <p className="mt-2 text-sm text-foreground/85 leading-relaxed">
                        {activeAnno.band_impact}
                      </p>
                    </div>
                  ) : null}
                  {activeAnno.examiner_tip ? (
                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        Examiner tip
                      </div>
                      <p className="mt-2 text-sm text-foreground/85 leading-relaxed">
                        {activeAnno.examiner_tip}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result.improved_version && hasImprovedTextChanges ? (
        <Card className="rounded-3xl border-border/60 bg-card/40 mt-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Improved version</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  This is a stronger next draft built from your original ideas and structure, with a controlled improvement target.
                  {potential !== null
                    ? ` It is capped at Band ${potential?.toFixed(1) ?? "—"}${delta > 0 ? ` (↑${delta.toFixed(1)})` : ""}.`
                    : ""}
                </p>
              </div>
              <div className="inline-flex rounded-full border border-border/60 bg-muted/30 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setActiveVersion("original")}
                  className={cn(
                    "px-3 py-1 rounded-full transition-colors",
                    activeVersion === "original" ? "bg-background shadow-sm" : "text-muted-foreground",
                  )}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVersion("improved")}
                  className={cn(
                    "px-3 py-1 rounded-full transition-colors flex items-center gap-1",
                    activeVersion === "improved" ? "bg-background shadow-sm" : "text-muted-foreground",
                  )}
                >
                  Improved
                  {potential !== null && delta > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      ↑{delta.toFixed(1)}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-rose-500/10 px-2 py-1 text-rose-700 line-through decoration-rose-500 dark:text-rose-300">removed</span>
              <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-800 dark:text-emerald-200">added / improved</span>
            </div>
            {activeVersion === "improved" ? (
              <ImprovedDiffView original={result.essay_text} improved={result.improved_version} />
            ) : (
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 leading-7 text-sm whitespace-pre-wrap">
                {result.essay_text}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {(result.overall_summary || result.next_steps?.length) ? (
        <Card className="rounded-3xl border-border/60 bg-gradient-to-br from-violet-500/5 via-card to-card mt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Coach summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.overall_summary ? (
              <p className="text-sm text-foreground/90 leading-relaxed">{result.overall_summary}</p>
            ) : null}
            {(strongestCriterion || weakestCriterion) ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {strongestCriterion ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Strongest area
                      </div>
                      <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        Band {strongestCriterion.band.toFixed(1)}
                      </div>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">
                      {strongestCriterion.title}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                      {strongestCriterion.data.summary || strongestCriterion.data.strengths?.[0] || "This criterion is currently leading your score."}
                    </p>
                  </div>
                ) : null}
                {weakestCriterion ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Main score limiter
                      </div>
                      <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        Band {weakestCriterion.band.toFixed(1)}
                      </div>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">
                      {weakestCriterion.title}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                      {weakestCriterion.data.improvements?.[0] || weakestCriterion.data.summary || "This criterion is currently holding the overall band down."}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {result.next_steps?.length ? (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Next steps
                </div>
                <ul className="space-y-1.5">
                  {result.next_steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-violet-500" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {vocabularySuggestions.length ? (
        <Card className="rounded-3xl border-border/60 bg-card/40 mt-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Natural C1/C2 upgrades ({vocabularySuggestions.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Compact upgrades with one example sentence each.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {vocabularySuggestions.map((suggestion, index) => (
                <VocabularySuggestionCard
                  key={`${suggestion.current_phrase}-${suggestion.improved_phrase}-${index}`}
                  suggestion={suggestion}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result.roast && (result.roast.overall_roast || result.roast.savage_tips?.length) ? (
        <FeedbackPanel
          roast={result.roast}
          taBand={toBandNumber(result.task_achievement.band)}
          ccBand={toBandNumber(result.coherence.band)}
          lrBand={toBandNumber(result.lexical.band)}
          graBand={toBandNumber(result.grammar.band)}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild>
          <Link href="/writing">
            <PenSquare className="h-4 w-4" /> Try another task
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
    );
  }
}
