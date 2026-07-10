"use client";

import { ArrowLeft, Check, CheckCircle2, Clock3, FileAudio, Link, Loader2, MessageCircle, Mic2, ReactNode, RefreshCcw, Sparkles, SpeakingDiarizedTranscriptItem, SpeakingSessionResult, Wifi, cn } from "./dependencies";

import { LiveStatus, display } from "./shared-part-01";

import { FeedbackLine, buildFallbackDiarizedTranscript, formatDurationMs, formatOffsetMs, getCriteriaFeedback } from "./shared-part-05";

import { formatBand, formatTimer, liveStatusLabel } from "./shared-part-07";



export function getRoastStatusLabel(
  status: LiveStatus,
  inputTurnOpen: boolean,
  isDeletingSession: boolean,
  isInterviewStarted: boolean,
): string {
  if (isDeletingSession || status === "finalizing") {
    return "Ending session";
  }
  if (!isInterviewStarted && (status === "connecting" || status === "idle" || status === "ready")) {
    return "Connecting";
  }
  if (isInterviewStarted && status === "connecting") {
    return "Starting";
  }
  if (status === "listening" && inputTurnOpen) {
    return "Your turn";
  }
  if (status === "ai_speaking") {
    return "AI speaking";
  }
  if (status === "listening") {
    return "Listening";
  }
  return "Roast mode";
}

export function LivePanelStatusBar({
  status,
  elapsedSeconds,
  part,
  topic,
}: {
  status: LiveStatus;
  elapsedSeconds: number;
  part: number;
  topic: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20">
          <Mic2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950 dark:text-slate-50">Live IELTS Speaking</p>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">Part {part} · {topic || "AI-selected topic"}</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        <HeaderPill className="text-slate-950 dark:text-slate-100">
          <Clock3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          {formatTimer(elapsedSeconds)}
        </HeaderPill>
        <HeaderPill className={status === "error" ? "border-red-100 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" : status === "closed" ? "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" : "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"}>
          {status === "connecting" || status === "finalizing" ? <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> : <Wifi className="h-4 w-4 text-emerald-500" />}
          {liveStatusLabel(status)}
        </HeaderPill>
      </div>
    </div>
  );
}

export function HeaderPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold shadow-[0_10px_28px_-24px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-none", className)}>
      {children}
    </span>
  );
}

export function SpeakingResultPanel({ result, repeatHref }: { result: SpeakingSessionResult; repeatHref: string }) {
  const evaluation = result.evaluation;
  const primaryAudio = result.audioAssets[0] ?? null;
  const criteria = [
    ["fluency", "Fluency", evaluation?.fluencyBand],
    ["lexical", "Lexical", evaluation?.lexicalBand],
    ["grammar", "Grammar", evaluation?.grammarBand],
    ["pronunciation", "Pronunciation", evaluation?.pronunciationBand],
  ] as const;
  const actions = evaluation?.improvementActions?.length
    ? evaluation.improvementActions
    : evaluation?.criticalIssues?.length
      ? evaluation.criticalIssues
      : [];
  const errorFeedback = result.structuredFeedback.errorFeedback.slice(0, 6);
  const diarizedTranscript = result.diarizedTranscript.length
    ? result.diarizedTranscript
    : buildFallbackDiarizedTranscript(result);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#F8FAFC] shadow-[0_28px_80px_-60px_rgba(15,23,42,0.58)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <div className="border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Result ready
            </span>
            <h2 className={cn(display.className, "mt-4 text-2xl font-extrabold tracking-[-0.03em] text-slate-950 dark:text-slate-50 md:text-3xl")}>{result.title}</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
              {evaluation?.summaryFeedback || "Your live Speaking session was saved. Feedback will appear here when the grader finishes."}
            </p>
          </div>
          <div className="flex min-w-[132px] flex-col items-center rounded-[24px] border border-emerald-100 bg-emerald-50 px-6 py-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Overall</span>
            <span className={cn(display.className, "mt-1 text-5xl font-extrabold tracking-[-0.05em] text-emerald-950 dark:text-emerald-100")}>{formatBand(evaluation?.overallBand)}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {criteria.map(([key, label, value]) => {
            const detail = getCriteriaFeedback(result, key);
            return (
              <div key={key} className="min-h-[118px] rounded-[18px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">{formatBand(value ?? null)}</p>
                {detail ? <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{detail}</p> : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/speaking"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Link
            href={repeatHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white shadow-[0_18px_38px_-22px_rgba(249,115,22,0.82)] transition hover:bg-orange-600"
          >
            <RefreshCcw className="h-4 w-4" />
            Repeat
          </Link>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_58px_-52px_rgba(15,23,42,0.58)] dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">Exam transcript</h3>
              <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">Examiner left, candidate right</p>
            </div>
            <MessageCircle className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-4 max-h-[560px] space-y-4 overflow-y-auto pr-1">
            {diarizedTranscript.length ? diarizedTranscript.map((item, index) => (
              <ExamChatBubble key={`${item.role}-${index}`} item={item} />
            )) : (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">No diarized transcript was saved for this session.</p>
            )}
          </div>
        </section>

        <div className="space-y-4">
          {primaryAudio ? (
            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_58px_-52px_rgba(15,23,42,0.58)] dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20">
                    <FileAudio className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">Session audio</h3>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">{formatDurationMs(primaryAudio.durationMs)}</p>
                  </div>
                </div>
              </div>
              <audio controls preload="metadata" src={primaryAudio.storagePath} className="w-full" />
            </section>
          ) : null}

          <section className="rounded-[24px] border border-orange-100 bg-orange-50/70 p-4 dark:border-orange-500/25 dark:bg-orange-500/10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">Mistakes & fixes</h3>
            </div>
            {errorFeedback.length ? (
              <div className="mt-3 space-y-3">
                {errorFeedback.map((item, index) => (
                  <article key={`${getFeedbackText(item, "issue")}-${index}`} className="rounded-[18px] border border-orange-100 bg-white p-4 dark:border-orange-500/20 dark:bg-slate-900/80">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black leading-6 text-slate-950 dark:text-slate-50">{getFeedbackText(item, "issue") || "Speaking issue"}</p>
                      <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                        {getFeedbackText(item, "category") || "Feedback"}
                      </span>
                    </div>
                    <FeedbackLine label="Example" value={getFeedbackText(item, "example") || getFeedbackText(item, "example_from_transcript")} />
                    <FeedbackLine label="Fix" value={getFeedbackText(item, "fix") || getFeedbackText(item, "suggested_fix")} />
                    <FeedbackLine label="Drill" value={getFeedbackText(item, "practice") || getFeedbackText(item, "practice_drill")} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:border-orange-500/20 dark:bg-slate-900/80 dark:text-slate-300">
                Specific fixes will appear after grading. Use the transcript to review pauses, short answers, and grammar slips.
              </p>
            )}
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
            <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">Next actions</h3>
            {actions.length ? (
              <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                {actions.slice(0, 5).map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">Feedback actions will appear here after grading.</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export function ExamChatBubble({ item }: { item: SpeakingDiarizedTranscriptItem }) {
  const isCandidate = item.role.toLowerCase() === "candidate" || item.role.toLowerCase() === "user";
  return (
    <div className={cn("flex w-full", isCandidate ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[82%] rounded-[22px] px-4 py-3 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.5)]", isCandidate ? "rounded-br-md bg-emerald-600 text-white" : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100")}>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className={cn("text-[11px] font-black uppercase tracking-[0.14em]", isCandidate ? "text-emerald-50/85" : "text-slate-400")}>
            {isCandidate ? "Candidate" : "Examiner"}
          </span>
          <span className={cn("text-[11px] font-bold", isCandidate ? "text-emerald-50/70" : "text-slate-400")}>{formatOffsetMs(item.offsetMs)}</span>
        </div>
        <p className="text-sm font-semibold leading-6">{item.text}</p>
      </div>
    </div>
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getFeedbackText(item: Record<string, unknown>, key: string): string {
  const value = item[key];
  return typeof value === "string" ? value.trim() : "";
}
