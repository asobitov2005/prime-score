"use client";

import { AlertTriangle, ArrowRight, Badge, Button, Card, CardContent, CardHeader, CardTitle, CheckCircle2, Flame, Link, Loader2, Sparkles, WritingRoastFeedback, WritingVocabularySuggestion, cn } from "./dependencies";

import { GRADING_STEPS, LoadingStage } from "./shared-part-01";



export function GradingScreen({ stage, activeStep }: { stage: LoadingStage; activeStep: number }) {
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

export function FailedScreen({
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

export function FeedbackPanel({
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

export function VocabularySuggestionCard({
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
