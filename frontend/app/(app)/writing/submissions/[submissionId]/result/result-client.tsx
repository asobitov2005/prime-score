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
import { cn } from "@/lib/utils";
import type {
  WritingCriterionEvaluation,
  WritingInlineAnnotation,
  WritingSubmissionResult,
  WritingSubmissionStatus,
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

const CATEGORY_STYLE: Record<
  string,
  { label: string; underline: string; chip: string; dot: string }
> = {
  spelling: {
    label: "Spelling",
    underline: "decoration-red-500",
    chip: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
    dot: "bg-red-500",
  },
  grammar: {
    label: "Grammar",
    underline: "decoration-amber-500",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
  },
  lexical: {
    label: "Lexical",
    underline: "decoration-blue-500",
    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dot: "bg-blue-500",
  },
  cohesion: {
    label: "Cohesion",
    underline: "decoration-purple-500",
    chip: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    dot: "bg-purple-500",
  },
  style: {
    label: "Style",
    underline: "decoration-zinc-500",
    chip: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
    dot: "bg-zinc-500",
  },
  punctuation: {
    label: "Punctuation",
    underline: "decoration-teal-500",
    chip: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30",
    dot: "bg-teal-500",
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

function buildAnnotatedHtml(
  essay: string,
  annotations: WritingInlineAnnotation[],
): string {
  if (!annotations.length) return escapeHtml(essay);
  const sorted = [...annotations]
    .filter((a) => a.offset >= 0 && a.length > 0 && a.offset + a.length <= essay.length)
    .sort((a, b) => b.offset - a.offset);
  let result = essay;
  sorted.forEach((anno, idx) => {
    const reverseIndex = sorted.length - 1 - idx;
    const slice = result.slice(anno.offset, anno.offset + anno.length);
    const style = categoryStyle(anno.category);
    const replaced = `<mark data-anno-idx="${reverseIndex}" class="wr-anno bg-transparent underline decoration-wavy decoration-2 underline-offset-4 cursor-pointer ${style.underline} hover:bg-foreground/5 rounded px-0.5 transition-colors">${escapeHtml(slice)}</mark>`;
    result = result.slice(0, anno.offset) + replaced + result.slice(anno.offset + anno.length);
  });
  return escapeHtml(result.split("<mark").join("\u0001MARK_OPEN\u0001").split("</mark>").join("\u0001MARK_CLOSE\u0001"))
    .split("\u0001MARK_OPEN\u0001")
    .join("<mark")
    .split("\u0001MARK_CLOSE\u0001")
    .join("</mark>");
}

function ScoreGauge({ band }: { band: number }) {
  const tone = bandTone(band);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, band / 9));
  const offset = circumference * (1 - pct);
  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg viewBox="0 0 200 200" className="h-44 w-44 -rotate-90">
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
        <div className={cn("text-5xl font-semibold tabular-nums", tone.text)}>
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

function GradingScreen({ stage }: { stage: LoadingStage }) {
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    if (stage !== "polling" && stage !== "loading_result") return;
    const id = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % GRADING_STEPS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [stage]);

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

function FailedScreen({ message }: { message: string | null }) {
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
        <Button asChild>
          <Link href="/writing">Try again</Link>
        </Button>
      </CardContent>
    </Card>
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
  const annotatedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (stage === "ready" || stage === "failed") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`/api/writing/submissions/${submissionId}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { status: string; error_message?: string | null };
        const status = String(data.status ?? "").toLowerCase();
        if (cancelled) return;
        if (status === "completed") {
          setStage("loading_result");
          const r = await fetch(`/api/writing/submissions/${submissionId}/result`, {
            credentials: "include",
            cache: "no-store",
          });
          if (!r.ok) throw new Error(String(r.status));
          const payload = (await r.json()) as WritingSubmissionResult;
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
  }, [stage, submissionId]);

  const annotations = result?.inline_annotations ?? [];
  const annotatedHtml = useMemo(
    () => (result ? buildAnnotatedHtml(result.essay_text, annotations) : ""),
    [result, annotations],
  );

  useEffect(() => {
    const root = annotatedRef.current;
    if (!root) return;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const mark = target.closest("mark[data-anno-idx]") as HTMLElement | null;
      if (mark) {
        const idx = Number(mark.dataset.annoIdx);
        if (Number.isFinite(idx)) {
          setActiveAnnotation((prev) => (prev === idx ? null : idx));
        }
      } else {
        setActiveAnnotation(null);
      }
    };
    root.addEventListener("click", handler);
    return () => root.removeEventListener("click", handler);
  }, [annotatedHtml]);

  if (stage === "failed") {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <FailedScreen message={errorMessage} />
      </div>
    );
  }

  if (stage !== "ready" || !result) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <GradingScreen stage={stage} />
      </div>
    );
  }

  const overall = toBandNumber(result.overall_band);
  const potential = result.potential_band !== null && result.potential_band !== undefined
    ? toBandNumber(result.potential_band)
    : null;
  const overallTone = bandTone(overall);

  const wordPenalty = toBandNumber(result.word_count_penalty);
  const errorCount = annotations.length;
  const activeAnno = activeAnnotation !== null ? annotations[activeAnnotation] ?? null : null;
  const taskBadgeLabel = result.task_type === "task_1" ? "Task 1" : "Task 2";
  const delta = potential !== null ? potential - overall : 0;

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
          <CardContent className="p-8 flex flex-col items-center gap-3">
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
          <CardContent className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              hint={potential !== null && delta > 0 ? `+${delta.toFixed(1)} possible` : "Apply suggestions"}
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

      <div className="grid gap-4 xl:grid-cols-2 mt-2">
        <CriterionCard title="Task Achievement" data={result.task_achievement} accent="text-violet-600 dark:text-violet-400" />
        <CriterionCard title="Coherence & Cohesion" data={result.coherence} accent="text-blue-600 dark:text-blue-400" />
        <CriterionCard title="Lexical Resource" data={result.lexical} accent="text-emerald-600 dark:text-emerald-400" />
        <CriterionCard title="Grammatical Range & Accuracy" data={result.grammar} accent="text-amber-600 dark:text-amber-400" />
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/40 mt-2">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Your essay with annotations</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click any underlined span to see suggested fixes and explanation.
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
                No issues detected — well done!
              </div>
            </div>
          ) : null}
          <div
            ref={annotatedRef}
            className="rounded-2xl border border-border/40 bg-muted/20 p-5 leading-7 text-sm whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: annotatedHtml }}
          />
          {activeAnno ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="line-through text-rose-600 dark:text-rose-400">{activeAnno.original}</span>
                {activeAnno.replacements?.length ? (
                  <>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1.5">
                      {activeAnno.replacements.map((rep, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300 font-medium"
                        >
                          {rep}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
              {activeAnno.explanation ? (
                <p className="text-sm text-muted-foreground">{activeAnno.explanation}</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result.improved_version ? (
        <Card className="rounded-3xl border-border/60 bg-card/40 mt-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Improved version</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your essay was not rewritten — only error spans were corrected.
                  {potential !== null
                    ? ` With these fixes you'd score Band ${potential.toFixed(1)}${delta > 0 ? ` (↑${delta.toFixed(1)})` : ""}.`
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
          <CardContent>
            <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 leading-7 text-sm whitespace-pre-wrap">
              {activeVersion === "improved" ? result.improved_version : result.essay_text}
            </div>
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
