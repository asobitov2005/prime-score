"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
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
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchWritingSubmissionResult,
  pollWritingSubmission,
  retryWritingSubmission,
} from "@/lib/client-writing";
import { cn } from "@/lib/utils";
import type {
  WritingActionPlan,
  WritingBandBoundary,
  WritingChecklistItem,
  WritingCriterionEvaluation,
  WritingErrorPattern,
  WritingInlineAnnotation,
  WritingSentenceFix,
  WritingRoastFeedback,
  WritingScoreBooster,
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
const STEP_ADVANCE_MS = 5000;

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

function checklistTone(status: string) {
  if (status === "met") {
    return {
      icon: CheckCircle2,
      label: "Done",
      className: "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (status === "missing") {
    return {
      icon: AlertTriangle,
      label: "Missing",
      className: "border-rose-500/25 bg-rose-500/5 text-rose-700 dark:text-rose-300",
    };
  }
  return {
    icon: Target,
    label: "Improve",
    className: "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  };
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
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Why</th>
                <th className="px-3 py-2 font-semibold">Do this</th>
                <th className="px-3 py-2 font-semibold">Impact</th>
              </tr>
            </thead>
            <tbody>
              {targetActions.map((action, index) => (
                <tr key={`${action.title}-${index}`} className="border-t border-border/40">
                  <td className="px-3 py-3 align-top text-xs font-semibold text-muted-foreground">{action.priority || index + 1}</td>
                  <td className="px-3 py-3 align-top font-semibold text-foreground">{action.title}</td>
                  <td className="px-3 py-3 align-top text-muted-foreground">{action.why}</td>
                  <td className="px-3 py-3 align-top text-foreground/90">{action.how}</td>
                  <td className="px-3 py-3 align-top text-sky-700 dark:text-sky-300">{action.band_impact || `${currentBand.toFixed(1)} -> ${nextTarget.toFixed(1)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistPanel({ items }: { items: WritingChecklistItem[] }) {
  if (!items.length) return null;
  return (
    <Card className="rounded-3xl border-border/60 bg-card/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">IELTS task checklist</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Task-specific requirements that usually decide whether the essay can move to the next band.
        </p>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => {
          const tone = checklistTone(item.status);
          const Icon = tone.icon;
          return (
            <div key={item.label} className={cn("rounded-2xl border p-3", tone.className)}>
              <div className="flex items-center justify-between gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{tone.label}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">{item.label}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              {item.how_to_fix ? (
                <p className="mt-1 text-xs leading-5 text-foreground/80">{item.how_to_fix}</p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ErrorPatternPanel({
  current,
  history,
}: {
  current: WritingErrorPattern[];
  history: WritingErrorPattern[];
}) {
  if (!current.length && !history.length) return null;
  return (
    <Card className="rounded-3xl border-border/60 bg-card/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Error patterns</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Current essay issues plus your recent writing trend.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <PatternList title="This essay" patterns={current} empty="No repeated issue pattern found in this essay." />
        <PatternList title="Recent trend" patterns={history} empty="Submit more essays to build a reliable trend." />
      </CardContent>
    </Card>
  );
}

function BandBoundaryPanel({ items }: { items: WritingBandBoundary[] }) {
  if (!items.length) return null;
  return (
    <Card className="rounded-2xl border-border/60 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Band boundary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Criterion</th>
                <th className="px-3 py-2 font-semibold">Now</th>
                <th className="px-3 py-2 font-semibold">Next</th>
                <th className="px-3 py-2 font-semibold">Why now</th>
                <th className="px-3 py-2 font-semibold">Needed</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.criterion} className="border-t border-border/40">
                  <td className="px-3 py-3 align-top font-semibold">{item.criterion}</td>
                  <td className="px-3 py-3 align-top tabular-nums">{toBandNumber(item.current_band).toFixed(1)}</td>
                  <td className="px-3 py-3 align-top tabular-nums text-emerald-700 dark:text-emerald-300">{toBandNumber(item.next_band).toFixed(1)}</td>
                  <td className="px-3 py-3 align-top text-muted-foreground">{item.why_current}</td>
                  <td className="px-3 py-3 align-top text-foreground/90">{item.required_for_next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBoostersPanel({ items }: { items: WritingScoreBooster[] }) {
  if (!items.length) return null;
  return (
    <Card className="rounded-2xl border-border/60 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">What already scores well</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep these original patterns. They are helping your band.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Original</th>
                <th className="px-3 py-2 font-semibold">Why it scores</th>
                <th className="px-3 py-2 font-semibold">Keep doing</th>
                <th className="px-3 py-2 font-semibold">Score effect</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 6).map((item, index) => (
                <tr key={`${item.original}-${index}`} className="border-t border-border/40">
                  <td className="px-3 py-3 align-top">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{item.criterion}</div>
                    <div className="mt-1 rounded-md bg-emerald-500/10 px-2 py-1 text-foreground/90">{item.original}</div>
                  </td>
                  <td className="px-3 py-3 align-top text-muted-foreground">{item.why_it_scores}</td>
                  <td className="px-3 py-3 align-top text-foreground/90">{item.keep_doing}</td>
                  <td className="px-3 py-3 align-top text-emerald-700 dark:text-emerald-300">{item.band_value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SentenceFixPanel({
  fixes,
}: {
  fixes: WritingSentenceFix[];
}) {
  if (!fixes.length) return null;
  return (
    <Card className="rounded-2xl border-border/60 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Sentence fixes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Original</th>
                <th className="px-3 py-2 font-semibold">Improved</th>
                <th className="px-3 py-2 font-semibold">Why</th>
              </tr>
            </thead>
            <tbody>
              {fixes.slice(0, 8).map((fix, index) => (
                <tr key={`${fix.original}-${index}`} className="border-t border-border/40">
                  <td className="px-3 py-3 align-top text-xs font-semibold text-muted-foreground">{fix.priority || index + 1}</td>
                  <td className="px-3 py-3 align-top text-rose-700 line-through decoration-rose-500 dark:text-rose-300">{fix.original}</td>
                  <td className="px-3 py-3 align-top text-emerald-700 dark:text-emerald-300">{fix.corrected_sentence || fix.replacement}</td>
                  <td className="px-3 py-3 align-top text-muted-foreground">{fix.why || fix.band_impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function PatternList({ title, patterns, empty }: { title: string; patterns: WritingErrorPattern[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/15 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {patterns.length ? (
        <div className="mt-3 space-y-2">
          {patterns.map((pattern) => (
            <div key={`${title}-${pattern.category}-${pattern.subcategory || pattern.label}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-foreground">{pattern.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{pattern.count} · {pattern.percentage.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${Math.max(6, Math.min(100, pattern.percentage))}%` }}
                />
              </div>
              {pattern.examples?.[0] ? (
                <p className="text-xs leading-5 text-muted-foreground">{pattern.examples[0]}</p>
              ) : null}
              {pattern.fix ? (
                <p className="text-xs leading-5 text-foreground/80">{pattern.fix}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
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
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="rounded-3xl border-border/60 bg-gradient-to-br from-violet-500/5 via-card to-card overflow-hidden">
        <CardContent className="p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-violet-600 dark:text-violet-400 animate-spin" />
            </div>
            <Badge tone="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300">
              AI grader
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Grading your essay…</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            The same essay always receives the same score. Independent rubric-by-rubric evaluation usually finishes in 20–40 seconds.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3">
            {GRADING_STEPS.map((step, idx) => {
              const isActive = idx === activeStep;
              const isDone = idx < activeStep;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
                    isDone && "border-emerald-500/30 bg-emerald-500/5",
                    isActive && "border-violet-500/40 bg-violet-500/10 shadow-sm",
                    !isActive && !isDone && "border-border/40 bg-muted/20",
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
                      isDone && "bg-emerald-500 text-white",
                      isActive && "bg-violet-500 text-white",
                      !isActive && !isDone && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      isDone && "text-emerald-700 dark:text-emerald-300",
                      isActive && "text-violet-700 dark:text-violet-200",
                      !isActive && !isDone && "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/60 bg-card/40">
        <CardContent className="p-6 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold">Did you know?</div>
            <p className="text-sm text-muted-foreground mt-1">
              IELTS Writing scores combine four equally weighted criteria: Task Achievement, Coherence &amp; Cohesion,
              Lexical Resource, and Grammatical Range &amp; Accuracy.
            </p>
          </div>
        </CardContent>
      </Card>
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
          <CardTitle className="text-lg">Feedback</CardTitle>
          <Badge tone="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            Honest take
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Straight talk, no sugar-coating. Bands are not affected by this section.
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
  const [activeStep, setActiveStep] = useState(0);
  const [sseAvailable, setSseAvailable] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [desiredScore, setDesiredScore] = useState(7.5);
  const [copiedAnnotation, setCopiedAnnotation] = useState<number | null>(null);
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

    const timer = setTimeout(() => {
      setActiveStep((prev) => Math.min(GRADING_STEPS.length - 1, prev + 1));
    }, STEP_ADVANCE_MS);

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
  const historyErrorTrends = result.history_error_trends ?? [];
  const bandBoundaries = result.band_boundaries ?? [];
  const scoreBoosters = result.score_boosters ?? [];
  const sentenceFixes = result.sentence_fixes ?? [];
  const targetActions = getTargetBandActions({
    actionPlan: result.action_plan,
    annotations,
    checklist,
    currentBand: overall,
    desiredScore: effectiveDesiredScore,
    errorPatterns,
    result,
  });

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
                  Try Another <ArrowRight className="h-4 w-4" />
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
              value={potential !== null ? potential.toFixed(1) : "—"}
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
        </Card>
      </div>

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

      <ScoreBoostersPanel items={scoreBoosters} />

      <BandBoundaryPanel items={bandBoundaries} />

      <ChecklistPanel items={checklist} />

      <ErrorPatternPanel current={errorPatterns} history={historyErrorTrends} />

      <SentenceFixPanel fixes={sentenceFixes} />

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
                    ? ` It is capped at Band ${potential.toFixed(1)}${delta > 0 ? ` (↑${delta.toFixed(1)})` : ""}.`
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
