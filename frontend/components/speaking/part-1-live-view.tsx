"use client";

import type { ReactNode } from "react";
import { Activity, AlertCircle, Clock3, Loader2, Lock, Mic, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/app/(app)/speaking/speaking-page-client";
import { PART_1_QUESTION_COUNT, resolvePart1ProgressPercent, resolvePart1QuestionNumber } from "@/lib/speaking-live-utils";

const PART_1_TOTAL_QUESTIONS_FALLBACK = PART_1_QUESTION_COUNT;

const purpleWaveformBars = [
  8, 14, 22, 12, 28, 36, 18, 10, 26, 40, 24, 14, 30, 44, 32, 16, 34, 48, 28, 12,
  24, 38, 30, 18, 36, 22, 10, 20, 32, 18, 8, 16,
] as const;

const greenWaveformBars = [
  10, 18, 30, 16, 42, 58, 34, 22, 50, 70, 44, 18, 36, 62, 48, 24, 56, 74, 40, 20,
  46, 66, 52, 28, 60, 38, 16, 34, 54, 30, 12, 24,
] as const;

const radialBarHeights = [
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

type Part1LiveViewProps = {
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
    <section className="speaking-night flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white shadow-[0_12px_40px_-32px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      {live.error ? (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 lg:mx-5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{live.error}</span>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_256px] lg:gap-4 lg:p-4">
        <article className="rounded-[14px] border border-[#E5E7EB] bg-[#FCFCFD] p-4 dark:border-slate-800 dark:bg-slate-900/70 lg:p-5">
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

          <div className="my-3 h-px w-full bg-[#E5E7EB] dark:bg-slate-800" />

          <section className="flex flex-col items-center text-center">
            <div className="relative flex w-full max-w-[460px] items-center justify-center">
              <ExamWaveform bars={greenBars} color="green" active={isListening} className="absolute inset-x-0" compact />
              <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#A7F3D0] bg-white shadow-[0_0_0_7px_rgba(16,185,129,0.1),0_12px_24px_-16px_rgba(16,185,129,0.45)] dark:border-emerald-500/30 dark:bg-slate-900 dark:shadow-none">
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#ECFDF5] dark:bg-emerald-500/10">
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

            <p className="mt-1 max-w-md text-xs text-[#64748B] dark:text-slate-400 sm:text-sm">
              The next question starts automatically when you finish speaking.
            </p>

            {live.micError ? (
              <p className="mt-1.5 max-w-md text-xs font-medium text-amber-700 sm:text-sm">{live.micError}</p>
            ) : null}

            <button
              type="button"
              onClick={onEndTest}
              disabled={endDisabled}
              className="mt-2.5 inline-flex h-9 w-[170px] items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-white text-sm font-semibold text-[#0F172A] transition hover:border-[#94A3B8] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
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
                <Clock3 className="h-3.5 w-3.5 text-[#64748B] dark:text-slate-400" />
                {formatTimer(live.elapsedSeconds)}
              </StatusPill>
              <StatusPill className={cn("justify-center", connectionHealthy ? "text-[#10B981] dark:text-emerald-400" : "text-[#64748B] dark:text-slate-400")}>
                <Wifi className={cn("h-3.5 w-3.5", connectionHealthy ? "text-[#10B981] dark:text-emerald-400" : "text-[#64748B] dark:text-slate-400")} />
                {connectionHealthy ? "Connected" : "Offline"}
              </StatusPill>
            </div>
          </div>

          <SidebarCard title="Question">
            <p className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-slate-50">
              {currentQuestion > 0 ? `${currentQuestion} of ${totalQuestions}` : `Intro · ${totalQuestions} planned`}
            </p>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-[#7C3AED] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </SidebarCard>

          <SidebarCard title="Topic">
            <p className="text-lg font-bold leading-snug text-[#0F172A] dark:text-slate-50">{topicLabel || "Work & Study"}</p>
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

          <p className="flex items-start justify-center gap-2 px-1 text-center text-xs leading-5 text-[#64748B] dark:text-slate-400">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your answers are analyzed after the test.
          </p>
        </aside>
      </div>
    </section>
  );
}

export function Part1LiveLoadingState() {
  return (
    <div className="speaking-night flex flex-col items-center justify-center rounded-[20px] border border-[#E5E7EB] bg-white py-20 dark:border-slate-800 dark:bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      <p className="mt-4 text-sm font-medium text-[#64748B]">Connecting to examiner...</p>
    </div>
  );
}

function AiExaminerVisual({ speaking, active }: { speaking: boolean; active: boolean }) {
  const cx = 90;
  const cy = 90;
  const innerRadius = 54;

  return (
    <div className="relative mt-3 flex h-[140px] w-[140px] items-center justify-center overflow-hidden">
      {speaking ? (
        <>
          <span className="part1-ai-ring part1-ai-ring-active" />
          <span className="part1-ai-ring part1-ai-ring-active part1-ai-ring-delay" />
        </>
      ) : null}

      <svg viewBox="0 0 180 180" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="part1PurpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        {radialBarHeights.map((baseHeight, index) => {
          const angle = (index / radialBarHeights.length) * 360 - 90;
          const radians = (angle * Math.PI) / 180;
          const length = speaking ? baseHeight : active ? baseHeight * 0.55 : baseHeight * 0.28;
          const x1 = cx + Math.cos(radians) * innerRadius;
          const y1 = cy + Math.sin(radians) * innerRadius;
          const x2 = cx + Math.cos(radians) * (innerRadius + length);
          const y2 = cy + Math.sin(radians) * (innerRadius + length);

          return (
            <line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="url(#part1PurpleGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity={speaking ? 0.9 : active ? 0.45 : 0.2}
              className={speaking ? "part1-radial-bar" : undefined}
              style={speaking ? { animationDelay: `${index * 45}ms` } : undefined}
            />
          );
        })}
      </svg>

      <div
        className={cn(
          "relative z-10 h-[78px] w-[78px] overflow-hidden rounded-full bg-gradient-to-br from-[#DDD6FE] via-[#7C3AED] to-[#5B21B6] shadow-[0_0_32px_rgba(124,58,237,0.35)] transition-transform duration-500",
          speaking && "scale-[1.03]",
        )}
      >
        <div className="absolute inset-[18%] rounded-full bg-gradient-to-br from-white/45 to-transparent" />
        <div className="absolute inset-[38%] rounded-full bg-white/20 blur-[1px]" />
      </div>
    </div>
  );
}

function StatusPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#0F172A] sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SidebarCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[#E5E7EB] bg-white p-3.5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none",
        className,
      )}
    >
      <p className="text-xs font-semibold text-[#64748B] sm:text-sm">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  healthy,
}: {
  icon: ReactNode;
  label: string;
  healthy: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", healthy ? "bg-[#ECFDF5] dark:bg-emerald-500/10" : "bg-[#F8FAFC] dark:bg-slate-800")}>
        {icon}
      </span>
      <span className={cn("text-xs font-semibold sm:text-sm", healthy ? "text-[#0F172A] dark:text-slate-100" : "text-[#64748B] dark:text-slate-400")}>{label}</span>
    </div>
  );
}

function ExamWaveform({
  bars,
  color,
  active,
  className,
  compact = false,
}: {
  bars: readonly number[];
  color: "purple" | "green";
  active: boolean;
  className?: string;
  compact?: boolean;
}) {
  const barClassName =
    color === "purple"
      ? "bg-gradient-to-t from-[#6D28D9] via-[#8B5CF6] to-[#DDD6FE]"
      : "bg-gradient-to-t from-[#059669] via-[#10B981] to-[#6EE7B7]";
  const lineClassName = color === "purple" ? "bg-[#DDD6FE]" : "bg-[#A7F3D0]";

  return (
    <div className={cn("relative flex w-full items-center justify-center px-2", compact ? "h-9" : "h-11", className)}>
      <span className={cn("absolute inset-x-0 top-1/2 h-px -translate-y-1/2", lineClassName)} />
      <div className="relative flex w-full items-center justify-between gap-[3px]">
        {bars.map((height, index) => (
          <span
            key={`${height}-${index}`}
            className={cn("w-[3px] rounded-full transition-[height,opacity] duration-200", barClassName)}
            style={{
              height: active ? height : Math.max(5, Math.round(height * 0.28)),
              opacity: active ? (index < 2 || index > bars.length - 3 ? 0.5 : 0.95) : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function buildDisplayBars(source: readonly number[], inputLevel: number): number[] {
  const level = Math.max(0, Math.min(1, inputLevel * 18));
  return source.map((height, index) => {
    const wave = Math.sin((index / source.length) * Math.PI * 2 + level * 4) * 0.18;
    return Math.max(6, Math.round(height * (0.34 + level * 0.66 + wave)));
  });
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
