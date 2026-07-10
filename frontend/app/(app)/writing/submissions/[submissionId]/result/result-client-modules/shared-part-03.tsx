"use client";

import { ArrowRight, Card, CardContent, CardHeader, CardTitle, CheckCircle2, Lightbulb, Quote, TrendingUp, WritingActionPlan, WritingCriterionEvaluation, WritingTargetAction, cn, useMemo } from "./dependencies";

import { bandTone, buildInlineDiff, toBandNumber } from "./shared-part-01";



export function TargetActionPlanPanel({
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

export function ImprovedDiffView({ original, improved }: { original: string; improved: string }) {
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

export function CriterionCard({
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
