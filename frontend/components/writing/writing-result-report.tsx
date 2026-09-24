"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, AlertTriangle, ChevronDown, Copy, Flame, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date-time";
import {
  annotatedSegments, annotationContext, formatBand, hasRoast, revisionFocus, taskFitFeedback, writingCriteria,
} from "@/lib/writing-feedback";
import type {
  WritingErrorPattern, WritingInlineAnnotation, WritingRoastFeedback,
  WritingSubmissionResult, WritingVocabularySuggestion,
} from "@/lib/server-writing";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const bodyCopy = "whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85";

function Disclosure({ title, hint, id, children }: {
  title: string; hint?: ReactNode; id?: string; children: ReactNode;
}) {
  return (
    <details id={id} className="group/disclosure min-w-0 scroll-mt-24 border-b border-border/70 last:border-b-0">
      <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-4 [&::-webkit-details-marker]:hidden sm:px-5", focusRing)}>
        <span className="text-sm font-medium">{title}</span>
        <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {hint}<ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open/disclosure:rotate-180 motion-reduce:transition-none" />
        </span>
      </summary>
      <div className="space-y-4 px-4 pb-5 sm:px-5">{children}</div>
    </details>
  );
}

function Field({ label, children }: { label: string; children?: ReactNode }) {
  if (!children) return null;
  return <div className="space-y-1"><p className={eyebrow}>{label}</p><div className={bodyCopy}>{children}</div></div>;
}

function FeedbackList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return <ul className="list-disc space-y-1.5 pl-4 text-sm leading-6 text-foreground/85">{items.map((item, index) => <li key={index} className="whitespace-pre-wrap break-words">{item}</li>)}</ul>;
}

function Evidence({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <blockquote className="whitespace-pre-wrap break-words border-l-2 border-primary/40 bg-muted/35 px-3 py-2 font-serif text-[15px] leading-6 text-foreground/85">{children}</blockquote>;
}

function BeforeAfter({ original, revised }: { original: string; revised?: string }) {
  return <div className="grid gap-3 sm:grid-cols-2"><Field label="Original"><Evidence>{original}</Evidence></Field>{revised ? <Field label="Suggested revision"><Evidence>{revised}</Evidence></Field> : null}</div>;
}

function formatDate(value: string | null) {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? formatDateTime(value) : "Not provided";
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "Time not recorded";
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function ReportWarnings({ result }: { result: WritingSubmissionResult }) {
  const warnings = [
    result.flags?.under_length || result.word_count < result.word_minimum
      ? `${result.word_count} words submitted; this task requires at least ${result.word_minimum}.` : null,
    result.flags?.non_english ? "The review flagged non-English content in this response." : null,
    result.flags?.injection_attempt_detected ? "The review flagged instructions unrelated to the writing task." : null,
    result.pipeline_status?.toLowerCase() === "partial" ? "This report is partial. Some feedback is unavailable." : null,
  ].filter(Boolean);
  if (!warnings.length) return null;
  return <div role="status" className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" /><ul className="space-y-1 text-sm leading-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>;
}

function TaskFitNotice({ result }: { result: WritingSubmissionResult }) {
  const fit = taskFitFeedback(result);
  if (!fit) return null;
  const labels = {
    on_task: "Task relevance review",
    partial: "Your response only partly addresses the task",
    off_topic: "Your response appears off topic",
    wrong_task: "Your response appears to answer a different task",
    uncertain: "The review could not determine task fit clearly",
  };
  const evidence = <div className="space-y-4">
    {fit.essay_evidence.length ? <Field label="Evidence from your response"><div className="space-y-2">{fit.essay_evidence.map((quote, index) => <Evidence key={index}>{quote}</Evidence>)}</div></Field> : null}
    {fit.task_evidence.length ? <Field label="Evidence from the assigned task"><div className="space-y-2">{fit.task_evidence.map((quote, index) => <Evidence key={index}>{quote}</Evidence>)}</div></Field> : null}
  </div>;
  if (fit.task_relation === "on_task") return <div className="rounded-xl border border-border bg-card"><Disclosure title={labels.on_task}><p className={bodyCopy}>{fit.explanation}</p>{evidence}</Disclosure></div>;
  return (
    <section aria-labelledby="writing-task-fit-title" role="note" className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
      <div className="flex items-start gap-2"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" /><h2 id="writing-task-fit-title" className="text-base font-semibold">{labels[fit.task_relation]}</h2></div>
      <p className={bodyCopy}>{fit.explanation}</p>
      <p className="text-xs leading-5 text-muted-foreground">This is a task-fit finding, not a rejected submission. Read it alongside the {result.task_type === "task_1" ? "Task Achievement" : "Task Response"} feedback; the assessed result remains available below.</p>
      {fit.essay_evidence.length || fit.task_evidence.length ? <Disclosure title="Task-fit evidence">{evidence}</Disclosure> : null}
    </section>
  );
}

function VocabularySuggestionCard({ suggestion }: { suggestion: WritingVocabularySuggestion }) {
  return (
    <article className="space-y-3 rounded-xl border border-border/70 p-4">
      <div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words text-sm"><span className="text-muted-foreground">{suggestion.current_phrase}</span><ArrowRight aria-hidden className="mx-2 inline h-3.5 w-3.5" /><strong className="font-medium">{suggestion.improved_phrase}</strong></p>{suggestion.level ? <span className="shrink-0 text-xs text-muted-foreground">{suggestion.level}</span> : null}</div>
      <Field label="Why it works">{suggestion.why_it_works}</Field>
      <Field label="Example">{suggestion.example_sentence}</Field>
    </article>
  );
}

function PatternList({ patterns }: { patterns: WritingErrorPattern[] }) {
  return <div className="space-y-4">{patterns.map((pattern, index) => (
    <article key={index} className="space-y-2 border-l-2 border-border pl-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-sm font-medium">{pattern.label}</h4><span className="text-xs text-muted-foreground">{pattern.count} reported occurrences{Number.isFinite(pattern.percentage) ? ` / ${pattern.percentage}%` : ""}</span></div>
      <p className="text-xs text-muted-foreground">{pattern.category}{pattern.subcategory ? ` / ${pattern.subcategory}` : ""}</p>
      {pattern.examples?.length ? <Field label="Examples"><FeedbackList items={pattern.examples} /></Field> : null}
      <Field label="Suggested fix">{pattern.fix}</Field>
    </article>
  ))}</div>;
}

function AnnotationDetail({ essay, annotation }: { essay: string; annotation: WritingInlineAnnotation }) {
  const context = annotationContext(essay, annotation);
  const [copyStatus, setCopyStatus] = useState("");
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{annotation.category}{annotation.severity ? ` / ${annotation.severity}` : ""}</p>
      <Field label="Feedback">{annotation.short_message}</Field>
      <Field label="Original phrase"><Evidence>{annotation.original}</Evidence></Field>
      {context && context !== annotation.original ? <Field label="In your essay"><Evidence>{context}</Evidence></Field> : null}
      {annotation.replacements?.length ? <Field label="Suggested replacements"><FeedbackList items={annotation.replacements} /></Field> : null}
      <Field label="Why change it?">{annotation.explanation}</Field>
      {annotation.improved_sentence ? (
        <div className="space-y-2">
          <Field label="Suggested sentence"><Evidence>{annotation.improved_sentence}</Evidence></Field>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted", focusRing)} onClick={async () => {
              try { await navigator.clipboard.writeText(annotation.improved_sentence!); setCopyStatus("Copied"); }
              catch { setCopyStatus("Could not copy. Select the sentence to copy it manually."); }
            }}><Copy aria-hidden className="h-3.5 w-3.5" />Copy sentence</button>
            <span role="status" className="text-xs text-muted-foreground">{copyStatus}</span>
          </div>
        </div>
      ) : null}
      <Field label="Feedback on impact">{annotation.band_impact}</Field>
      <Field label="Review tip">{annotation.examiner_tip}</Field>
    </div>
  );
}

function EssayReview({ result }: { result: WritingSubmissionResult }) {
  const [active, setActive] = useState<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const annotations = result.inline_annotations ?? [];
  const segments = annotatedSegments(result.essay_text, annotations);

  useEffect(() => {
    if (active === null) return;
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [active]);

  return (
    <section ref={root} aria-labelledby="writing-essay-title" className="min-w-0 rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5"><div><h2 id="writing-essay-title" className="text-base font-semibold">Your essay</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Select a marked phrase for the evidence and suggested correction.</p></div><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{annotations.length} notes</span></div>
      <div className="whitespace-pre-wrap break-words px-4 py-5 font-serif text-[17px] leading-8 sm:px-5">
        {segments.map((segment, index) => segment.annotationIndex === undefined ? <span key={index}>{segment.text}</span> : (
          <button key={index} type="button" data-annotation={segment.annotationIndex} aria-label={`Review note ${segment.annotationIndex + 1}: ${segment.text}`} aria-expanded={active === segment.annotationIndex} aria-controls="writing-selected-note"
            className={cn("inline rounded-sm bg-primary/10 text-left underline decoration-primary/60 decoration-2 underline-offset-4 hover:bg-primary/20", focusRing, active === segment.annotationIndex && "bg-primary/20 ring-1 ring-primary/50")}
            onClick={() => setActive(segment.annotationIndex!)}>{segment.text}</button>
        ))}
      </div>
      <div id="writing-selected-note" ref={panel} tabIndex={-1} className={cn("scroll-mt-24 rounded-b-xl", focusRing)}>
        {active !== null && annotations[active] ? <div className="space-y-4 border-t border-primary/20 bg-primary/5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Correction note {active + 1}</h3><button type="button" aria-label="Close correction note" className={cn("rounded-md p-2 hover:bg-muted", focusRing)} onClick={() => {
            const previous = active;
            setActive(null);
            root.current?.querySelector<HTMLButtonElement>(`[data-annotation="${previous}"]`)?.focus();
          }}><X aria-hidden className="h-4 w-4" /></button></div>
          <AnnotationDetail key={active} essay={result.essay_text} annotation={annotations[active]} />
        </div> : null}
      </div>
      {annotations.length ? <Disclosure title="All correction notes" hint={annotations.length} id="writing-all-notes">
        <p className="text-xs leading-5 text-muted-foreground">Includes notes that overlap or could not be located exactly in the essay.</p>
        {annotations.map((annotation, index) => <Disclosure key={index} title={`Note ${index + 1}: ${annotation.short_message || annotation.category}`}><AnnotationDetail essay={result.essay_text} annotation={annotation} /></Disclosure>)}
      </Disclosure> : <p className="border-t border-border px-5 py-4 text-xs text-muted-foreground">No inline feedback was provided. This does not mean the essay is error-free.</p>}
    </section>
  );
}

function FeedbackPanel({ roast, taskLabel }: { roast: WritingRoastFeedback; taskLabel: string }) {
  const zingers = [
    { label: taskLabel, text: roast.task_achievement_zinger },
    { label: "Coherence and Cohesion", text: roast.coherence_zinger },
    { label: "Lexical Resource", text: roast.lexical_zinger },
    { label: "Grammatical Range and Accuracy", text: roast.grammar_zinger },
  ].filter((item) => item.text);
  return (
    <section aria-labelledby="writing-roast-title" className="space-y-4 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 to-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2"><Flame aria-hidden className="h-4 w-4 text-amber-600 dark:text-amber-300" /><h2 id="writing-roast-title" className="text-base font-semibold">Roast feedback</h2><span className="ml-auto text-xs text-muted-foreground">Savage mode</span></div>
      <p className="text-xs text-muted-foreground">Blunt, plain-English feedback. This section does not change your score.</p>
      {roast.overall_roast ? <p className={bodyCopy}>{roast.overall_roast}</p> : null}
      <Evidence>{roast.one_liner}</Evidence>
      {zingers.length || roast.savage_tips?.length || roast.pep_talk ? <Disclosure title="Criterion roasts and takeaways">
        {zingers.length ? <div className="grid gap-4 sm:grid-cols-2">{zingers.map((item) => <Field key={item.label} label={item.label}>{item.text}</Field>)}</div> : null}
        {roast.savage_tips?.length ? <Field label="What to actually fix"><FeedbackList items={roast.savage_tips} /></Field> : null}
        <Field label="Parting words">{roast.pep_talk}</Field>
      </Disclosure> : null}
    </section>
  );
}

function RevisionExample({ result }: { result: WritingSubmissionResult }) {
  const [showOriginal, setShowOriginal] = useState(false);
  return <div className="space-y-3">
    <p className="text-xs leading-5 text-muted-foreground">A suggested revision from this review, not a separately graded response.</p>
    <button type="button" aria-pressed={showOriginal} className={cn("min-h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted", focusRing)} onClick={() => setShowOriginal(!showOriginal)}>{showOriginal ? "Read suggested revision" : "Compare with original"}</button>
    <div className={cn("grid gap-4", showOriginal && "lg:grid-cols-2")}>
      {showOriginal ? <Field label="Original"><div className="font-serif text-base leading-8">{result.essay_text}</div></Field> : null}
      <Field label="Suggested revision"><div className="font-serif text-base leading-8">{result.improved_version}</div></Field>
    </div>
  </div>;
}

export function WritingResultReport({ result }: { result: WritingSubmissionResult }) {
  const report = useRef<HTMLDivElement>(null);
  const criteria = writingCriteria(result);
  const focus = revisionFocus(result);
  const target = formatBand(result.desired_score);
  const actionPlan = result.action_plan;

  function revealSource(id: string) {
    const target = report.current?.querySelector<HTMLElement>(`#${id}`);
    if (!target) return;
    let node: HTMLElement | null = target;
    while (node && node !== report.current) {
      if (node instanceof HTMLDetailsElement) node.open = true;
      node = node.parentElement;
    }
    const destination = target instanceof HTMLDetailsElement ? target.querySelector("summary") : target;
    destination?.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "instant", block: "start" });
  }

  return (
    <div ref={report} className="mx-auto w-full max-w-6xl space-y-5 pb-8 [overflow-wrap:anywhere]">
      <nav aria-label="Writing navigation" className="flex items-center justify-between gap-3 text-sm">
        <Link href="/writing" className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground", focusRing)}><ArrowLeft aria-hidden className="h-4 w-4" />Writing</Link>
        <Link href="/writing/history" className={cn("rounded-md py-2 text-muted-foreground hover:text-foreground", focusRing)}>View history</Link>
      </nav>

      <TaskFitNotice result={result} />

      <header className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card">
        <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[auto_minmax(0,1fr)] md:gap-7">
          <div className="flex items-center gap-4 md:block md:border-r md:border-border md:pr-7">
            <div><p className={eyebrow}>Estimated band</p><p className="mt-1 text-5xl font-semibold tabular-nums tracking-tight">{formatBand(result.overall_band)}</p></div>
            <p className="max-w-40 text-xs leading-5 text-muted-foreground md:mt-2">AI feedback, not an official IELTS score.</p>
          </div>
          <div className="min-w-0">
            <p className={eyebrow}>Writing review / {result.task_type === "task_1" ? "Task 1" : "Task 2"}</p>
            <h1 className="mt-1.5 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{result.task_title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{result.word_count} words / {result.word_minimum} minimum</span><span>{formatDuration(result.time_spent_seconds)}</span>{target !== "Not provided" ? <span>Your target: {target}</span> : null}</div>
            {result.overall_summary ? <p className={cn("mt-3", bodyCopy)}>{result.overall_summary}</p> : null}
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border/70 md:grid-cols-4">
          {criteria.map(({ key, label, data }) => <button key={key} type="button" onClick={() => revealSource(`writing-${key}`)} className={cn("flex min-w-0 items-center justify-between gap-3 border-r border-border/60 px-4 py-3 text-left last:border-r-0 hover:bg-primary/5 sm:px-5", focusRing)} aria-label={`Read ${label} feedback, band ${formatBand(data.band)}`}><span className="text-xs leading-5 text-muted-foreground">{label}</span><span className="shrink-0 whitespace-nowrap text-lg font-semibold tabular-nums">{formatBand(data.band)}</span></button>)}
        </div>
      </header>

      <ReportWarnings result={result} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.4fr)]">
        <section aria-labelledby="writing-focus-title" className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className={eyebrow}>From your feedback</p><h2 id="writing-focus-title" className="mt-1 text-lg font-semibold">Next revision focus</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{focus.length ? "Use these supplied actions for revision or your next practice." : "No specific revision actions were provided in this report."}</p>
          <ol className="mt-4 divide-y divide-border/70">
            {focus.slice(0, 3).map((item, index) => <li key={index} className="space-y-2 py-4 first:pt-0 last:pb-0">
              <div className="flex items-baseline gap-2"><span className="text-xs font-medium tabular-nums text-primary">0{index + 1}</span>{item.title ? <h3 className="text-sm font-semibold">{item.title}</h3> : null}</div>
              {item.instruction ? <p className={bodyCopy}>{item.instruction}</p> : null}
              {item.reason || item.examples.length ? <details className="group/focus"><summary className={cn("flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-md text-xs text-muted-foreground [&::-webkit-details-marker]:hidden", focusRing)}>Why this action?<ChevronDown aria-hidden className="h-3 w-3 group-open/focus:rotate-180" /></summary><div className="space-y-2 pb-2"><Field label="Why">{item.reason}</Field>{item.examples.map((example, exampleIndex) => <Evidence key={exampleIndex}>{example}</Evidence>)}</div></details> : null}
              <button type="button" className={cn("inline-flex min-h-9 items-center gap-1 rounded-md text-xs font-medium text-primary underline-offset-4 hover:underline", focusRing)} onClick={() => revealSource(item.sourceId)}>Source: {item.source}<ArrowRight aria-hidden className="h-3 w-3" /></button>
            </li>)}
          </ol>
          {focus.length > 3 ? <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Showing 3 of {focus.length} actions. All remain available in the analysis below.</p> : null}
        </section>
        <EssayReview result={result} />
      </div>

      <section aria-labelledby="writing-analysis-title" className="min-w-0 rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 p-4 sm:px-5"><div><h2 id="writing-analysis-title" className="text-base font-semibold">Full analysis</h2><p className="mt-1 text-xs text-muted-foreground">All supplied feedback, organized for a closer look.</p></div><a href="https://ielts.org/cdn/ielts-guides/ielts-writing-key-assessment-criteria.pdf" target="_blank" rel="noreferrer" className={cn("rounded-md py-2 text-xs text-primary underline underline-offset-4", focusRing)}>Official IELTS criteria<span className="sr-only"> (opens in a new tab)</span></a></div>

        {criteria.map(({ key, label, data }) => <Disclosure key={key} id={`writing-${key}`} title={label} hint={formatBand(data.band)}>
          {data.summary ? <p className={bodyCopy}>{data.summary}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">{data.strengths?.length ? <Field label="Strengths"><FeedbackList items={data.strengths} /></Field> : null}{data.improvements?.length ? <Field label="How to improve"><FeedbackList items={data.improvements} /></Field> : null}</div>
          {data.evidence_quotes?.length ? <Field label="Evidence cited in the review"><div className="space-y-2">{data.evidence_quotes.map((quote, index) => <Evidence key={index}>{quote}</Evidence>)}</div></Field> : null}
          <Field label="Why this band?">{data.reasoning}</Field>
          {!data.summary && !data.strengths?.length && !data.improvements?.length && !data.evidence_quotes?.length && !data.reasoning ? <p className="text-sm text-muted-foreground">No detailed feedback was provided for this criterion.</p> : null}
        </Disclosure>)}

        {result.target_action_plan?.length || actionPlan || result.next_steps?.length ? <Disclosure title="Revision and practice plan" id="writing-plan">
          {result.target_action_plan?.map((action, index) => <article id={`writing-action-${index}`} tabIndex={-1} key={index} className={cn("scroll-mt-24 space-y-3 rounded-xl border border-border p-4", focusRing)}>
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">{action.title || "Revision action"}</h3>{action.priority > 0 ? <span className="text-xs text-muted-foreground">Supplied priority {action.priority}</span> : null}</div>
            <Field label="What to do">{action.how}</Field><Field label="Why">{action.why}</Field><Field label="Example"><Evidence>{action.example}</Evidence></Field><Field label="Feedback on impact">{action.band_impact}</Field>
          </article>)}
          {actionPlan ? <div id="writing-action-plan" tabIndex={-1} className={cn("scroll-mt-24 space-y-4 rounded-lg", focusRing)}>
            <Field label="Main score limiter">{actionPlan.main_limiter ? `${actionPlan.main_limiter}${formatBand(actionPlan.main_limiter_band) !== "Not provided" ? ` / Band ${formatBand(actionPlan.main_limiter_band)}` : ""}` : null}</Field>
            <Field label="Strongest area">{actionPlan.strongest_area ? `${actionPlan.strongest_area}${formatBand(actionPlan.strongest_area_band) !== "Not provided" ? ` / Band ${formatBand(actionPlan.strongest_area_band)}` : ""}` : null}</Field>
            {actionPlan.fixes?.length ? <Field label="Suggested fixes"><FeedbackList items={actionPlan.fixes} /></Field> : null}
          </div> : null}
          {result.next_steps?.length ? <div id="writing-next-steps" tabIndex={-1} className={cn("scroll-mt-24 rounded-lg", focusRing)}><Field label="Next steps"><FeedbackList items={result.next_steps} /></Field></div> : null}
        </Disclosure> : null}

        {result.score_boosters?.length ? <Disclosure title="Keep doing this" hint={result.score_boosters.length}>
          {result.score_boosters.map((item, index) => <article key={index} className="space-y-3 border-l-2 border-emerald-500/40 pl-3"><p className="text-sm font-medium">{item.criterion}</p><Evidence>{item.original}</Evidence><Field label="Why it works">{item.why_it_scores}</Field><Field label="Keep doing">{item.keep_doing}</Field><Field label="Feedback on value">{item.band_value}</Field></article>)}
        </Disclosure> : null}

        {result.band_boundaries?.length ? <Disclosure title="Criterion band explanations" hint={result.band_boundaries.length}>
          <p className="text-xs leading-5 text-muted-foreground">The review's explanation for each supplied boundary, not a prediction of your next score.</p>
          {result.band_boundaries.map((item, index) => <article key={index} className="space-y-3 rounded-xl border border-border p-4"><h3 className="text-sm font-semibold">{item.criterion}</h3><Field label={`Current band: ${formatBand(item.current_band)}`}>{item.why_current}</Field><Field label={`Requirements described for band ${formatBand(item.next_band)}`}>{item.required_for_next}</Field></article>)}
        </Disclosure> : null}

        {result.checklist?.length ? <Disclosure title="Task checklist" hint={`${result.checklist.length} checks`}>
          {result.checklist.map((item, index) => <article key={index} id={`writing-check-${index}`} tabIndex={-1} className={cn("scroll-mt-24 space-y-2 rounded-xl border border-border p-3", focusRing)}><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-medium">{item.label}</h3><span className={cn("text-xs", item.status === "met" ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>{item.status}</span></div><Field label="Finding">{item.detail}</Field><Field label="Suggested fix">{item.how_to_fix}</Field></article>)}
        </Disclosure> : null}

        {result.error_patterns?.length ? <Disclosure title="Error patterns in this essay" hint={result.error_patterns.length}><PatternList patterns={result.error_patterns} /></Disclosure> : null}
        {result.history_error_trends?.length ? <Disclosure title="Patterns reported across submissions" hint={result.history_error_trends.length}><PatternList patterns={result.history_error_trends} /></Disclosure> : null}

        {result.sentence_fixes?.length ? <Disclosure title="Sentence revisions" hint={result.sentence_fixes.length}>
          {result.sentence_fixes.map((item, index) => <article key={index} className="space-y-3 rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">{item.category}{item.priority > 0 ? ` / Supplied priority ${item.priority}` : ""}</p><BeforeAfter original={item.original} revised={item.replacement} /><Field label="Suggested sentence"><Evidence>{item.corrected_sentence}</Evidence></Field><Field label="Why">{item.why}</Field><Field label="Feedback on impact">{item.band_impact}</Field></article>)}
        </Disclosure> : null}

        {result.revision_diff?.length ? <Disclosure title="Revision explanations" hint={result.revision_diff.length}>
          {result.revision_diff.map((item, index) => <article key={index} className="space-y-3 rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">{item.criterion}</p><BeforeAfter original={item.original} revised={item.revised} /><Field label="Reason for the change">{item.reason}</Field></article>)}
        </Disclosure> : null}
        {result.improved_version?.trim() ? <Disclosure title="Suggested full revision"><RevisionExample result={result} /></Disclosure> : null}
        {result.vocabulary_suggestions?.length ? <Disclosure title="Vocabulary suggestions" hint={result.vocabulary_suggestions.length}><div className="grid gap-3 md:grid-cols-2">{result.vocabulary_suggestions.map((suggestion, index) => <VocabularySuggestionCard key={index} suggestion={suggestion} />)}</div></Disclosure> : null}

        {result.selected_benchmarks?.length ? <Disclosure title="Reference notes supplied with the review" hint={result.selected_benchmarks.length}>
          <p className="text-xs leading-5 text-muted-foreground">These reference notes do not establish calibration or confidence in this score.</p>
          {result.selected_benchmarks.map((item, index) => <article key={index} className="space-y-3 rounded-xl border border-border p-4"><h3 className="text-sm font-medium">{item.title}</h3><p className="text-xs text-muted-foreground">Reference band {formatBand(item.band)} / {item.card_id}</p><Field label="When to use">{item.use_when}</Field><Field label="Tolerance lesson">{item.tolerance_lesson}</Field>{item.band_limiting_signs?.length ? <Field label="Band-limiting signs"><FeedbackList items={item.band_limiting_signs} /></Field> : null}</article>)}
        </Disclosure> : null}
        {result.meta_learning_note ? <Disclosure title="Additional review note"><p className={bodyCopy}>{result.meta_learning_note}</p></Disclosure> : null}

        <Disclosure title="Submission details">
          <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className={eyebrow}>Submitted</dt><dd className="mt-1">{formatDate(result.submitted_at)}</dd></div><div><dt className={eyebrow}>Reviewed</dt><dd className="mt-1">{formatDate(result.graded_at)}</dd></div>{result.xp_awarded_total != null ? <div><dt className={eyebrow}>XP earned</dt><dd className="mt-1">{result.xp_awarded_total}</dd></div> : null}{result.xp_level_after != null ? <div><dt className={eyebrow}>Level after submission</dt><dd className="mt-1">{result.xp_level_after}</dd></div> : null}{result.xp_current_streak != null ? <div><dt className={eyebrow}>Current streak</dt><dd className="mt-1">{result.xp_current_streak}</dd></div> : null}</dl>
          {result.xp_breakdown ? <Field label="XP breakdown"><dl className="grid gap-2 sm:grid-cols-2">{Object.entries(result.xp_breakdown).filter(([, value]) => typeof value === "number").map(([key, value]) => <div key={key} className="flex justify-between gap-3"><dt>{key.replaceAll("_", " ")}</dt><dd className="tabular-nums">{String(value)}</dd></div>)}</dl></Field> : null}
          {result.score_limiting_criterion ? <Field label="Score limiter reported by the review">{result.score_limiting_criterion}</Field> : null}
        </Disclosure>
      </section>

      {hasRoast(result.roast) ? <FeedbackPanel roast={result.roast} taskLabel={criteria[0].label} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild><Link href="/writing">Start another practice<ArrowRight aria-hidden className="h-4 w-4" /></Link></Button><Link href="/dashboard" className={cn("rounded-md py-2 text-sm text-muted-foreground hover:text-foreground", focusRing)}>Back to dashboard</Link></div>
    </div>
  );
}
