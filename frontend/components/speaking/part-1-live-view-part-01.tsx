"use client";

import { Activity, AlertCircle, Clock3, LiveStatus, Lock, Mic, PART_1_QUESTION_COUNT, Wifi, cn, resolvePart1ProgressPercent, resolvePart1QuestionNumber } from "./part-1-live-view-dependencies";
import { AiExaminerVisual, ExamWaveform, SidebarCard, StatusPill, StatusRow, buildDisplayBars, formatTimer } from "./part-1-live-view-part-02";

export const PART_1_TOTAL_QUESTIONS_FALLBACK = PART_1_QUESTION_COUNT;

export const purpleWaveformBars = [
  8, 14, 22, 12, 28, 36, 18, 10, 26, 40, 24, 14, 30, 44, 32, 16, 34, 48, 28, 12,
  24, 38, 30, 18, 36, 22, 10, 20, 32, 18, 8, 16,
] as const;

export const greenWaveformBars = [
  10, 18, 30, 16, 42, 58, 34, 22, 50, 70, 44, 18, 36, 62, 48, 24, 56, 74, 40, 20,
  46, 66, 52, 28, 60, 38, 16, 34, 54, 30, 12, 24,
] as const;

export const radialBarHeights = [
  14, 22, 28, 16, 32, 24, 18, 30, 22, 16, 34, 26, 18, 22, 28, 16,
  24, 32, 18, 22, 28, 20, 14, 26, 18, 24, 30, 16, 22, 20, 18, 26,
  24, 16, 28, 20, 14, 22, 26, 18,
] as const;

export type Part1LiveSession = {
  status: LiveStatus;
  error: string | null;
  micError: string | null;
  inputLevel: number;
  isRecording: boolean;
  turnCount: number;
  plannedQuestionCount: number;
  elapsedSeconds: number;
  isInterviewStarted: boolean;
  inputTurnOpen: boolean;
  isDeletingSession: boolean;
};

export type Part1LiveViewProps = {
  live: Part1LiveSession;
  topicLabel: string;
  connectionOnline: boolean;
  onEndTest: () => void;
  endDisabled?: boolean;
};

export function Part1LiveView({
  live,
  topicLabel,
  connectionOnline,
  onEndTest,
  endDisabled = false,
}: Part1LiveViewProps) {
  const isAiSpeaking = live.status === "ai_speaking";
  const isListening = live.status === "listening" && live.inputTurnOpen;
  const isConnecting = !live.isInterviewStarted || live.status === "connecting" || live.status === "ready";
  const totalQuestions = live.plannedQuestionCount || PART_1_TOTAL_QUESTIONS_FALLBACK;
  const currentQuestion = resolvePart1QuestionNumber(live.turnCount, live.status, live.inputTurnOpen, totalQuestions);
  const progressPercent = resolvePart1ProgressPercent(currentQuestion, totalQuestions);
  const audioDetected = isListening && live.inputLevel > 0.012;
  const micOn = live.isRecording && !live.micError;
  const connectionLabel = connectionOnline && live.status !== "error" ? "Stable connection" : "Reconnecting";
  const connectionHealthy = connectionOnline && live.status !== "error";
  const showAiVoice = isAiSpeaking || isConnecting;

  const greenBars = buildDisplayBars(greenWaveformBars, isListening ? live.inputLevel : 0);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white shadow-[0_12px_40px_-32px_rgba(15,23,42,0.16)]">
      {live.error ? (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 lg:mx-5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{live.error}</span>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_256px] lg:gap-4 lg:p-4">
        <article className="rounded-[14px] border border-[#E5E7EB] bg-[#FCFCFD] p-4 lg:p-5">
          <section className="flex flex-col items-center text-center">
            <span className="inline-flex rounded-full bg-[#F3EFFF] px-3 py-1 text-xs font-semibold text-[#7C3AED] sm:text-sm">
              AI Examiner
            </span>

            <AiExaminerVisual speaking={isAiSpeaking} active={showAiVoice} />

            <ExamWaveform
              bars={purpleWaveformBars}
              color="purple"
              active={showAiVoice}
              className="mt-2 w-full max-w-[460px]"
              compact
            />

            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F3EFFF] px-3 py-1 text-xs font-semibold text-[#7C3AED] sm:text-sm">
              <Activity className="h-3.5 w-3.5" />
              {isConnecting ? "Connecting to examiner..." : isAiSpeaking ? "AI is speaking" : "Waiting for your answer"}
            </span>
          </section>

          <div className="my-3 h-px w-full bg-[#E5E7EB]" />

          <section className="flex flex-col items-center text-center">
            <div className="relative flex w-full max-w-[460px] items-center justify-center">
              <ExamWaveform bars={greenBars} color="green" active={isListening} className="absolute inset-x-0" compact />
              <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#A7F3D0] bg-white shadow-[0_0_0_7px_rgba(16,185,129,0.1),0_12px_24px_-16px_rgba(16,185,129,0.45)]">
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#ECFDF5]">
                  <Mic className={cn("h-5 w-5", isListening ? "text-[#10B981]" : "text-[#64748B]")} strokeWidth={2.2} />
                </span>
              </div>
            </div>

            <h2 className="mt-2.5 text-base font-semibold text-[#10B981] sm:text-lg">
              {isListening
                ? "Listening to your answer..."
                : isAiSpeaking
                  ? "Wait while the examiner speaks"
                  : isConnecting
                    ? "Preparing your microphone..."
                    : "Ready for your answer"}
            </h2>

            <p className="mt-1 max-w-md text-xs text-[#64748B] sm:text-sm">
              The next question starts automatically when you finish speaking.
            </p>

            {live.micError ? (
              <p className="mt-1.5 max-w-md text-xs font-medium text-amber-700 sm:text-sm">{live.micError}</p>
            ) : null}

            <button
              type="button"
              onClick={onEndTest}
              disabled={endDisabled}
              className="mt-2.5 inline-flex h-9 w-[170px] items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-white text-sm font-semibold text-[#0F172A] transition hover:border-[#94A3B8] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {live.status === "finalizing" ? "Ending test..." : "End test"}
            </button>
          </section>
        </article>

        <aside className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2">
            <StatusPill className="w-full justify-center text-[#7C3AED]">
              Part 1 · Introduction & Interview
            </StatusPill>
            <div className="grid grid-cols-2 gap-2">
              <StatusPill className="justify-center">
                <Clock3 className="h-3.5 w-3.5 text-[#64748B]" />
                {formatTimer(live.elapsedSeconds)}
              </StatusPill>
              <StatusPill className={cn("justify-center", connectionHealthy ? "text-[#10B981]" : "text-[#64748B]")}>
                <Wifi className={cn("h-3.5 w-3.5", connectionHealthy ? "text-[#10B981]" : "text-[#64748B]")} />
                {connectionHealthy ? "Connected" : "Offline"}
              </StatusPill>
            </div>
          </div>

          <SidebarCard title="Question">
            <p className="text-xl font-bold tracking-tight text-[#0F172A]">
              {currentQuestion > 0 ? `${currentQuestion} of ${totalQuestions}` : `Intro · ${totalQuestions} planned`}
            </p>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
              <div
                className="h-full rounded-full bg-[#7C3AED] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </SidebarCard>

          <SidebarCard title="Topic">
            <p className="text-lg font-bold leading-snug text-[#0F172A]">{topicLabel || "Work & Study"}</p>
          </SidebarCard>

          <SidebarCard title="System status">
            <div className="space-y-2">
              <StatusRow
                icon={<Mic className="h-4 w-4 text-[#10B981]" />}
                label={micOn ? "Mic on" : live.micError ? "Mic issue" : "Mic starting"}
                healthy={micOn}
              />
              <StatusRow
                icon={<Activity className="h-4 w-4 text-[#10B981]" />}
                label={audioDetected ? "Audio detected" : isListening ? "Listening..." : "Waiting for speech"}
                healthy={audioDetected || isListening}
              />
              <StatusRow
                icon={<Wifi className="h-4 w-4 text-[#10B981]" />}
                label={connectionLabel}
                healthy={connectionHealthy}
              />
            </div>
          </SidebarCard>

          <p className="flex items-start justify-center gap-2 px-1 text-center text-xs leading-5 text-[#64748B]">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your answers are analyzed after the test.
          </p>
        </aside>
      </div>
    </section>
  );
}
