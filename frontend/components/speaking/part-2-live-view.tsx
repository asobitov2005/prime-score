"use client";

import type { ReactNode } from "react";
import { Activity, AlertCircle, Clock3, FileText, Loader2, Lock, Mic, Volume2, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/app/(app)/speaking/speaking-page-client";
import type { Part2ViewPhase } from "@/lib/speaking-part-2-phases";
import { PART_2_NOTES_MAX } from "@/lib/speaking-preparation";
import type { Part2CueCard } from "@/lib/speaking-preparation";
import type { Part1LiveSession } from "@/components/speaking/part-1-live-view";

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

type Part2LiveViewProps = {
  live: Part1LiveSession;
  cueCard: Part2CueCard;
  viewPhase: Part2ViewPhase;
  notes: string;
  topicLabel: string;
  connectionOnline: boolean;
  onNotesChange: (value: string) => void;
  onListenAgain: () => void;
  onEndTest: () => void;
  endDisabled?: boolean;
};

export function Part2LiveView({
  live,
  cueCard,
  viewPhase,
  notes,
  topicLabel,
  connectionOnline,
  onNotesChange,
  onListenAgain,
  onEndTest,
  endDisabled = false,
}: Part2LiveViewProps) {
  const showExaminerStage = viewPhase === "examiner" || viewPhase === "speaking";
  const showCueCard = viewPhase === "preparation";
  const showNotes = viewPhase === "preparation" || viewPhase === "speaking";
  const compactExaminerStage = viewPhase === "speaking" && showNotes;

  const isAiSpeaking = live.status === "ai_speaking";
  const isListening = live.status === "listening" && live.inputTurnOpen;
  const isConnecting = !live.isInterviewStarted || live.status === "connecting" || live.status === "ready";
  const audioDetected = isListening && live.inputLevel > 0.012;
  const micOn = live.isRecording && !live.micError;
  const connectionLabel = connectionOnline && live.status !== "error" ? "Stable connection" : "Reconnecting";
  const connectionHealthy = connectionOnline && live.status !== "error";
  const showAiVoice = isAiSpeaking || isConnecting;
  const greenBars = buildDisplayBars(greenWaveformBars, isListening ? live.inputLevel : 0);

  const examinerStatus = viewPhase === "preparation"
    ? "Preparing your response..."
    : isConnecting
      ? "Connecting to examiner..."
      : isAiSpeaking
        ? "AI is speaking"
        : isListening
          ? "Listening to your answer..."
          : "Waiting for your answer";

  const userStatus = viewPhase === "preparation"
    ? "Use this time to plan your answer"
    : isListening
      ? "Listening to your answer..."
      : isAiSpeaking
        ? "Wait while the examiner speaks"
        : isConnecting
          ? "Preparing your microphone..."
          : "Ready for your answer";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white shadow-[0_12px_40px_-32px_rgba(15,23,42,0.16)]">
      {live.error ? (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 lg:mx-5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{live.error}</span>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_256px] lg:gap-4 lg:p-4">
        <article className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2 rounded-[14px] border border-[#E5E7EB] bg-[#FCFCFD] p-3 lg:gap-3 lg:p-4">
          <div className={cn("relative min-h-0", compactExaminerStage ? "min-h-[250px]" : "min-h-[340px]")}>
            <div
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-out",
                showExaminerStage
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-2 opacity-0",
              )}
              aria-hidden={!showExaminerStage}
            >
              <ExaminerStage
                live={live}
                isAiSpeaking={isAiSpeaking}
                isListening={isListening}
                isConnecting={isConnecting}
                showAiVoice={showAiVoice}
                greenBars={greenBars}
                examinerStatus={examinerStatus}
                userStatus={userStatus}
                onEndTest={onEndTest}
                endDisabled={endDisabled}
                compact={compactExaminerStage}
              />
            </div>

            <div
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-out",
                showCueCard
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-2 opacity-0",
              )}
              aria-hidden={!showCueCard}
            >
              <CueCardStage cueCard={cueCard} onListenAgain={onListenAgain} />
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-out",
              showNotes ? "max-h-[200px] translate-y-0 opacity-100" : "max-h-0 translate-y-2 opacity-0",
            )}
            aria-hidden={!showNotes}
          >
            <label htmlFor="part-2-live-notes" className="text-sm font-semibold text-[#0F172A]">
              Your notes (optional)
            </label>
            <div className="relative mt-1.5">
              <textarea
                id="part-2-live-notes"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value.slice(0, PART_2_NOTES_MAX))}
                placeholder="Write your ideas here..."
                className={cn(
                  "w-full resize-y rounded-[12px] border border-[#E5E7EB] bg-white px-3 py-3 text-sm leading-6 text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15",
                  compactExaminerStage ? "min-h-[88px]" : "min-h-[120px]",
                )}
              />
              <p className="pointer-events-none absolute bottom-3 right-3 text-xs font-medium text-[#94A3B8]">
                {notes.length} / {PART_2_NOTES_MAX}
              </p>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2">
            <StatusPill className="w-full justify-center text-[#7C3AED]">
              Part 2 · Individual Long Turn
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

          <SidebarCard title="Stage">
            <p className="text-lg font-bold leading-snug text-[#0F172A]">
              {viewPhase === "examiner" ? "Examiner introduction" : viewPhase === "preparation" ? "Preparation" : "Long turn"}
            </p>
          </SidebarCard>

          <SidebarCard title="Topic">
            <p className="text-lg font-bold leading-snug text-[#0F172A]">{topicLabel || "Selected topic"}</p>
          </SidebarCard>

          <SidebarCard title="System status">
            <div className="space-y-2">
              <StatusRow
                icon={<Mic className="h-4 w-4 text-[#10B981]" />}
                label={viewPhase === "preparation" ? "Mic paused for prep" : micOn ? "Mic on" : live.micError ? "Mic issue" : "Mic starting"}
                healthy={viewPhase === "preparation" ? true : micOn}
              />
              <StatusRow
                icon={<Activity className="h-4 w-4 text-[#10B981]" />}
                label={viewPhase === "preparation" ? "Planning time" : audioDetected ? "Audio detected" : isListening ? "Listening..." : "Waiting for speech"}
                healthy={viewPhase === "preparation" || audioDetected || isListening}
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

function ExaminerStage({
  live,
  isAiSpeaking,
  isListening,
  isConnecting,
  showAiVoice,
  greenBars,
  examinerStatus,
  userStatus,
  onEndTest,
  endDisabled,
  compact = false,
}: {
  live: Part1LiveSession;
  isAiSpeaking: boolean;
  isListening: boolean;
  isConnecting: boolean;
  showAiVoice: boolean;
  greenBars: number[];
  examinerStatus: string;
  userStatus: string;
  onEndTest: () => void;
  endDisabled: boolean;
  compact?: boolean;
}) {
  return (
    <>
      <section className="flex flex-col items-center text-center">
        <span className="inline-flex rounded-full bg-[#F3EFFF] px-3 py-1 text-xs font-semibold text-[#7C3AED] sm:text-sm">
          AI Examiner
        </span>

        <AiExaminerVisual speaking={isAiSpeaking} active={showAiVoice} compact={compact} />

        <ExamWaveform
          bars={purpleWaveformBars}
          color="purple"
          active={showAiVoice}
          className={cn("mt-2 w-full max-w-[460px]", compact && "mt-1 max-w-[380px]")}
          compact
        />

        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-[#F3EFFF] px-3 py-1 text-xs font-semibold text-[#7C3AED] sm:text-sm",
          compact ? "mt-1" : "mt-2",
        )}>
          <Activity className="h-3.5 w-3.5" />
          {examinerStatus}
        </span>
      </section>

      <div className={cn("h-px w-full bg-[#E5E7EB]", compact ? "my-2" : "my-3")} />

      <section className="flex flex-col items-center text-center">
        <div className="relative flex w-full max-w-[460px] items-center justify-center">
          <ExamWaveform bars={greenBars} color="green" active={isListening} className="absolute inset-x-0" compact />
          <div className={cn(
            "relative z-10 flex items-center justify-center rounded-full border border-[#A7F3D0] bg-white shadow-[0_0_0_7px_rgba(16,185,129,0.1),0_12px_24px_-16px_rgba(16,185,129,0.45)]",
            compact ? "h-[60px] w-[60px]" : "h-[72px] w-[72px]",
          )}>
            <span className={cn(
              "flex items-center justify-center rounded-full bg-[#ECFDF5]",
              compact ? "h-[44px] w-[44px]" : "h-[52px] w-[52px]",
            )}>
              <Mic className={cn(compact ? "h-4 w-4" : "h-5 w-5", isListening ? "text-[#10B981]" : "text-[#64748B]")} strokeWidth={2.2} />
            </span>
          </div>
        </div>

        <h2 className={cn("font-semibold text-[#10B981]", compact ? "mt-1.5 text-sm sm:text-base" : "mt-2.5 text-base sm:text-lg")}>
          {userStatus}
        </h2>

        {!compact ? (
          <p className="mt-1 max-w-md text-xs text-[#64748B] sm:text-sm">
            {isListening ? "The examiner moves on automatically when you finish speaking." : "Follow the examiner instructions."}
          </p>
        ) : null}

        {live.micError ? (
          <p className={cn("max-w-md font-medium text-amber-700", compact ? "mt-1 text-xs" : "mt-1.5 text-xs sm:text-sm")}>
            {live.micError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onEndTest}
          disabled={endDisabled}
          className={cn(
            "inline-flex items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-white text-sm font-semibold text-[#0F172A] transition hover:border-[#94A3B8] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60",
            compact ? "mt-1.5 h-8 w-[150px] text-xs" : "mt-2.5 h-9 w-[170px]",
          )}
        >
          {live.status === "finalizing" ? "Ending test..." : "End test"}
        </button>
      </section>
    </>
  );
}

function CueCardStage({
  cueCard,
  onListenAgain,
}: {
  cueCard: Part2CueCard;
  onListenAgain: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3EFFF] text-[#7C3AED]">
          <FileText className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <h2 className="text-lg font-semibold text-[#0F172A]">Cue card</h2>
      </div>

      <div className="relative flex-1 rounded-[14px] border border-[#DDD6FE] bg-[#F3EFFF] px-6 py-6">
        <button
          type="button"
          onClick={onListenAgain}
          className="absolute right-4 top-4 inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#7C3AED] bg-white px-3 text-xs font-semibold text-[#7C3AED] transition hover:bg-[#FAF5FF] sm:text-sm"
        >
          <Volume2 className="h-3.5 w-3.5" />
          Listen again
        </button>

        <p className="max-w-[92%] pr-2 text-base font-semibold leading-7 text-[#0F172A] sm:text-[17px]">
          {cueCard.promptText}
        </p>

        <p className="mt-5 text-sm font-semibold text-[#0F172A]">You should say:</p>
        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#334155]">
          {cueCard.bulletPoints.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7C3AED]" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Part2LiveLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#E5E7EB] bg-white py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      <p className="mt-4 text-sm font-medium text-[#64748B]">Connecting to examiner...</p>
    </div>
  );
}

function AiExaminerVisual({
  speaking,
  active,
  compact = false,
}: {
  speaking: boolean;
  active: boolean;
  compact?: boolean;
}) {
  const cx = 90;
  const cy = 90;
  const innerRadius = 54;

  return (
    <div className={cn(
      "relative flex items-center justify-center overflow-hidden",
      compact ? "mt-1.5 h-[112px] w-[112px]" : "mt-3 h-[140px] w-[140px]",
    )}>
      {speaking ? (
        <>
          <span className="part1-ai-ring part1-ai-ring-active" />
          <span className="part1-ai-ring part1-ai-ring-active part1-ai-ring-delay" />
        </>
      ) : null}

      <svg viewBox="0 0 180 180" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="part2PurpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
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
              stroke="url(#part2PurpleGrad)"
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
          "relative z-10 overflow-hidden rounded-full bg-gradient-to-br from-[#DDD6FE] via-[#7C3AED] to-[#5B21B6] shadow-[0_0_32px_rgba(124,58,237,0.35)] transition-transform duration-500",
          compact ? "h-[62px] w-[62px]" : "h-[78px] w-[78px]",
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
        "inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#0F172A] sm:text-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[#E5E7EB] bg-white p-3.5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.12)]">
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
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", healthy ? "bg-[#ECFDF5]" : "bg-[#F8FAFC]")}>
        {icon}
      </span>
      <span className={cn("text-xs font-semibold sm:text-sm", healthy ? "text-[#0F172A]" : "text-[#64748B]")}>{label}</span>
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
