"use client";

import { WritingActionPlan, WritingChecklistItem, WritingErrorPattern, WritingInlineAnnotation, WritingSubmissionResult, WritingTargetAction, cn } from "./dependencies";

import { bandTone, findSentenceEnd, findSentenceStart, toBandNumber } from "./shared-part-01";



export function buildAnnotationSentencePreview(
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

export type AnnotatedSegment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; index: number; category: string };

export function buildAnnotatedSegments(
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

export function buildCriterionInsights(result: WritingSubmissionResult) {
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

export function getTargetBandActions({
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

export function ScoreGauge({ band }: { band: number }) {
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

export function StatTile({
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

export function xpNumber(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}
