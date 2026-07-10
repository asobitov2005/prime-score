"use client";

import { AlertCircle, CheckCircle2, Flame, Loader2, ReactNode, SpeakingAiMode, SpeakingAiSphere, SpeakingEntryMode, cn, speakingSphereStateFromLiveStatus, useCallback, useEffect, useRouter } from "./dependencies";

import { LiveStatus, display } from "./shared-part-01";

import { LivePanelStatusBar, SpeakingResultPanel } from "./shared-part-04";

import { AiQuestionSection, UserAnswerSection } from "./shared-part-05";

import { buildRepeatSpeakingHref } from "./shared-part-07";



export function LiveSpeakingSessionView({
  sessionId,
  entryMode,
  aiMode,
  part,
  topics,
  topicLabel,
  randomTopic,
  isRoastMode,
  prepComplete,
}: {
  sessionId: string;
  entryMode: SpeakingEntryMode;
  aiMode: SpeakingAiMode;
  part: number;
  topics: string[];
  topicLabel: string | null;
  randomTopic: boolean;
  isRoastMode: boolean;
  prepComplete: boolean;
}) {
  const router = useRouter();
  const live = useSpeakingLiveSession({
    sessionId,
    entryMode,
    aiMode,
    part,
    topics,
    randomTopic,
    prepComplete,
  });

  const handleDiscard = useCallback(async () => {
    const discarded = await live.discard();
    if (discarded) {
      router.replace("/speaking");
    }
  }, [live, router]);
  const repeatHref = live.result
    ? buildRepeatSpeakingHref(live.result.speakingTestId, live.result.entryMode, aiMode, part, topics, randomTopic)
    : "/speaking";
  const handleEndRoast = useCallback(async () => {
    if (live.isDeletingSession || live.status === "finalizing") {
      return;
    }
    await live.discard();
    router.replace("/speaking");
  }, [live, router]);

  useEffect(() => {
    if (!isRoastMode || live.status !== "closed" || live.isDeletingSession) {
      return;
    }
    router.replace("/speaking");
  }, [isRoastMode, live.isDeletingSession, live.status, router]);

  if (isRoastMode) {
    return (
      <RoastSpeakingShell>
        {live.error ? (
          <section className="mb-6 flex max-w-lg items-start gap-3 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{live.error}</span>
          </section>
        ) : null}

        <RoastSpeakingLiveView live={live} onEnd={handleEndRoast} />
      </RoastSpeakingShell>
    );
  }

  return (
    <main className="speaking-night animate-in fade-in duration-500 text-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-6xl pb-4">
        <section className="relative isolate overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_34px_100px_-68px_rgba(15,23,42,0.62)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-32 -top-36 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.16),transparent_66%)] dark:bg-[radial-gradient(circle,rgba(249,115,22,0.10),transparent_66%)]" />
            <div className="absolute right-[-9rem] top-16 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.10),transparent_68%)] dark:bg-[radial-gradient(circle,rgba(37,99,235,0.08),transparent_68%)]" />
            <div className="absolute bottom-[-9rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.12),transparent_68%)] dark:bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_68%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.045)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_78%)] dark:bg-[radial-gradient(rgba(148,163,184,0.08)_1px,transparent_1px)]" />
          </div>

          {live.isInterviewStarted ? (
            <div className="border-b border-slate-200/80 bg-white/72 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-7">
              <LivePanelStatusBar
                status={live.status}
                elapsedSeconds={live.elapsedSeconds}
                part={part}
                topic={topicLabel}
              />
            </div>
          ) : null}

          <div className="p-5 sm:p-7 lg:p-8">
            {live.error ? (
              <section className="mb-4 flex items-start gap-3 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{live.error}</span>
              </section>
            ) : null}

            {live.result ? (
              <SpeakingResultPanel result={live.result} repeatHref={repeatHref} />
            ) : !live.isInterviewStarted ? (
              <section className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[26px] border border-slate-200/80 bg-white/78 px-6 py-12 dark:border-slate-800 dark:bg-slate-900/70">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Examiner ulanmoqda...</p>
              </section>
            ) : (
              <>
                <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_24px_70px_-58px_rgba(15,23,42,0.52)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none sm:p-6">
                  <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/80 to-transparent" />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AiQuestionSection
                      status={live.status}
                      transcript={live.examinerTranscript}
                      onRepeat={() => live.sendText("Please repeat the last question.")}
                    />
                    <UserAnswerSection
                      status={live.status}
                      inputTurnOpen={live.inputTurnOpen}
                      inputLevel={live.inputLevel}
                      transcript={live.userTranscript}
                      isRecording={live.isRecording}
                      isStartingMic={live.isStartingMic}
                      micError={live.micError}
                      onStartMic={live.startMic}
                      onFinishAnswer={live.finishAnswer}
                    />
                  </div>
                </section>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={live.isDeletingSession || live.status === "finalizing"}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                  >
                    {live.isDeletingSession ? "Discarding..." : "Discard session"}
                  </button>
                  <button
                    type="button"
                    onClick={live.stop}
                    disabled={live.status === "closed" || live.status === "finalizing" || live.status === "error" || live.isDeletingSession}
                    className="animate-sheen relative inline-flex h-12 min-h-[48px] flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-orange-500 px-6 text-sm font-bold text-white shadow-[0_24px_48px_-24px_rgba(249,115,22,0.86)] transition hover:-translate-y-0.5 hover:bg-orange-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                  >
                    {live.status === "finalizing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    {live.status === "finalizing" ? "Preparing result..." : "End exam"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export function RoastSpeakingShell({ children }: { children: ReactNode }) {
  return (
    <main className="speaking-night animate-in fade-in duration-500 text-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-3xl pb-4">
        <section className="relative isolate overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_34px_100px_-68px_rgba(15,23,42,0.62)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14),transparent_66%)] dark:bg-[radial-gradient(circle,rgba(249,115,22,0.08),transparent_66%)]" />
            <div className="absolute right-[-6rem] top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.08),transparent_68%)] dark:bg-[radial-gradient(circle,rgba(37,99,235,0.06),transparent_68%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_78%)] dark:bg-[radial-gradient(rgba(148,163,184,0.07)_1px,transparent_1px)]" />
          </div>

          <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20">
                <Flame className="h-4 w-4" />
              </span>
              <div>
                <p className={cn(display.className, "text-sm font-extrabold tracking-[-0.02em] text-slate-950 dark:text-slate-50")}>
                  Uzbek Roast
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Casual voice chat — no exam scoring
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-h-[min(72dvh,560px)] flex-col items-center justify-center px-5 py-10 sm:px-8 sm:py-12">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function RoastSpeakingLiveView({
  live,
  onEnd,
}: {
  live: {
    status: LiveStatus;
    inputTurnOpen: boolean;
    inputLevel: number;
    micError: string | null;
    isInterviewStarted: boolean;
    isDeletingSession: boolean;
  };
  onEnd: () => void;
}) {
  const sphereState = speakingSphereStateFromLiveStatus(live.status, live.inputTurnOpen);
  const statusLabel = getRoastStatusLabel(
    live.status,
    live.inputTurnOpen,
    live.isDeletingSession,
    live.isInterviewStarted,
  );

  return (
    <section className="flex w-full max-w-md flex-col items-center">
      <div className="relative flex w-full items-center justify-center rounded-[28px] border border-slate-200/80 bg-white/80 px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_24px_70px_-58px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none sm:px-8 sm:py-12">
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/70 to-transparent dark:via-orange-500/30" />
        <SpeakingAiSphere
          state={sphereState}
          inputLevel={live.inputLevel}
          onDoubleActivate={live.isInterviewStarted && !live.isDeletingSession ? onEnd : undefined}
        />
      </div>
      <p className={cn(display.className, "mt-6 text-center text-sm font-bold tracking-[0.08em] text-slate-600 uppercase dark:text-slate-300")}>
        {statusLabel}
      </p>
      {live.micError ? (
        <p className="mt-4 max-w-md text-center text-xs font-semibold text-amber-700 dark:text-amber-300">{live.micError}</p>
      ) : null}
      {live.isInterviewStarted && !live.isDeletingSession ? (
        <p className="mt-6 text-center text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
          Double-tap the sphere to end the session
        </p>
      ) : null}
    </section>
  );
}

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
