"use client";

import { Activity, FileText, Loader2, Mic, Part1LiveSession, Part2CueCard, Volume2, cn } from "./part-2-live-view-dependencies";
import { purpleWaveformBars } from "./part-2-live-view-part-01";
import { AiExaminerVisual, ExamWaveform } from "./part-2-live-view-part-04";

export function ExaminerStage({
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

export function CueCardStage({
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
