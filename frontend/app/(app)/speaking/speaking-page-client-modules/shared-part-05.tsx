"use client";

import { Loader2, Mic2, RefreshCcw, SpeakingSessionResult, cn } from "./dependencies";

import { LiveStatus, aiWaveformBars, userWaveformBars } from "./shared-part-01";

import { compactLiveTranscript } from "./shared-part-06";

import { buildDisplayBars } from "./shared-part-07";



export function buildFallbackDiarizedTranscript(result: SpeakingSessionResult) {
  const items = [];
  if (result.examinerTranscript.trim()) {
    items.push({ role: "examiner", text: result.examinerTranscript.trim(), at: null, offsetMs: null });
  }
  if (result.candidateTranscript.trim()) {
    items.push({ role: "candidate", text: result.candidateTranscript.trim(), at: null, offsetMs: null });
  }
  return items;
}

export function AiQuestionSection({
  status,
  transcript,
  onRepeat,
}: {
  status: LiveStatus;
  transcript: string;
  onRepeat: () => void;
}) {
  const isSpeaking = status === "ai_speaking";
  const displayText = compactLiveTranscript(transcript)
    || (status === "connecting" ? "Connecting to the AI examiner..." : "The examiner will ask the first question shortly.");

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-54px_rgba(15,23,42,0.58)] dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className={cn("absolute h-12 w-12 rounded-2xl border border-orange-200/70 dark:border-orange-500/30", isSpeaking && "speaking-ring-pulse")} />
            <div className={cn("speaking-agent-orb relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-slate-950 text-white shadow-[0_20px_44px_-26px_rgba(249,115,22,0.86)]", !isSpeaking && "speaking-orb-idle")}>
              <Mic2 className="relative h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-sm font-black text-slate-950 dark:text-slate-50">Examiner</p>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500">{isSpeaking ? "Speaking" : "Waiting"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRepeat}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
          aria-label="Repeat question"
          title="Repeat question"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <LiveWaveform bars={aiWaveformBars} color="orange" className="mt-4" active={isSpeaking} />

      <div className="mt-4 rounded-[22px] rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/70">
        <p className="text-[15px] font-black leading-7 text-slate-950 dark:text-slate-50">
          {displayText}
        </p>
      </div>
    </div>
  );
}

export function UserAnswerSection({
  status,
  inputTurnOpen,
  inputLevel,
  transcript,
  isRecording,
  isStartingMic,
  micError,
  onStartMic,
  onFinishAnswer,
}: {
  status: LiveStatus;
  inputTurnOpen: boolean;
  inputLevel: number;
  transcript: string;
  isRecording: boolean;
  isStartingMic: boolean;
  micError: string | null;
  onStartMic: () => void;
  onFinishAnswer: () => void;
}) {
  const canSpeak = inputTurnOpen && status === "listening";
  const activeBars = buildDisplayBars(userWaveformBars, canSpeak ? inputLevel : 0);
  const visibleTranscript = compactLiveTranscript(transcript);
  const statusLabel = canSpeak
    ? "Your turn — speak now"
    : status === "ai_speaking"
      ? "Wait — examiner is speaking"
      : status === "connecting"
        ? "Connecting to examiner..."
        : isStartingMic
          ? "Starting microphone..."
          : isRecording
            ? "Microphone ready — wait for your turn"
            : "Mic off";
  return (
    <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/50 p-4 shadow-[0_24px_60px_-54px_rgba(15,23,42,0.58)] dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:shadow-none sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-slate-50">Candidate</p>
          <p className={cn(
            "text-xs font-bold",
            canSpeak ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500",
          )}>
            {statusLabel}
          </p>
        </div>
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className={cn("absolute h-12 w-12 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10", canSpeak && "speaking-user-pulse")} />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 shadow-[0_16px_34px_-24px_rgba(16,185,129,0.7)] dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-400">
            <Mic2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      <LiveWaveform bars={activeBars} color="green" className="mt-4" active={canSpeak} />

      {visibleTranscript ? (
        <p className="ml-auto mt-4 max-w-[92%] rounded-[22px] rounded-br-md bg-emerald-600 px-4 py-4 text-sm font-semibold leading-6 text-white shadow-[0_18px_44px_-38px_rgba(15,23,42,0.5)]">
          {visibleTranscript}
        </p>
      ) : null}

      {canSpeak ? (
        <div className="mt-4 flex flex-col items-end gap-2">
          <p className="w-full rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-slate-900/70 dark:text-emerald-300">
            The examiner finished. Speak clearly, then tap Done when you finish your answer.
          </p>
          <button
            type="button"
            onClick={onFinishAnswer}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-emerald-300 bg-emerald-600 px-4 text-sm font-bold text-white shadow-[0_12px_28px_-24px_rgba(16,185,129,0.7)] transition hover:bg-emerald-700"
          >
            Done speaking
          </button>
        </div>
      ) : null}
      {!isRecording ? (
        <div className="mt-4 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onStartMic}
            disabled={isStartingMic}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-600 shadow-[0_12px_28px_-24px_rgba(16,185,129,0.7)] transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-500/10"
          >
            {isStartingMic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />}
            Mic on
          </button>
          {micError ? <p className="max-w-[520px] text-right text-xs font-semibold leading-5 text-red-600">{micError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function LiveWaveform({
  bars,
  color,
  className,
  compact = false,
  active = true,
}: {
  bars: readonly number[];
  color: "orange" | "green";
  className?: string;
  compact?: boolean;
  active?: boolean;
}) {
  const barClassName =
    color === "orange"
      ? "bg-gradient-to-t from-orange-500 via-amber-400 to-slate-950 shadow-[0_0_12px_rgba(249,115,22,0.18)]"
      : "bg-gradient-to-t from-emerald-600 via-emerald-400 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.18)]";

  return (
    <div className={cn("flex h-10 w-full items-center justify-center px-3", compact && "h-8 px-0", className)}>
      <div className="relative flex w-full items-center justify-between gap-1">
        <span className={cn("absolute left-0 right-0 top-1/2 h-px -translate-y-1/2", color === "orange" ? "bg-orange-200 dark:bg-orange-500/25" : "bg-emerald-200 dark:bg-emerald-500/25")} />
        {bars.map((height, index) => (
          <span
            key={`${height}-${index}`}
            className={cn("relative w-[3px] rounded-full transition-[height,opacity] duration-150", compact && "w-[2.5px]", barClassName)}
            style={{
              height: active ? height : Math.max(4, Math.round(height * 0.28)),
              opacity: active ? (index < 2 || index > bars.length - 3 ? 0.45 : 0.92) : 0.32,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export type LiveAudioRuntime = {
  inputContext: AudioContext;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  silentGain: GainNode;
};

export type LiveOutputRuntime = {
  outputContext: AudioContext;
  nextPlaybackAt: number;
};

export function getAudioContextConstructor(): typeof AudioContext {
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error("Audio playback is not available in this browser.");
  }
  return AudioContextCtor;
}

export function startOutputRuntime(): LiveOutputRuntime {
  const AudioContextCtor = getAudioContextConstructor();
  // Gemini Live streams 24kHz PCM. Pin the context rate to match so playback math
  // and buffering stay correct instead of depending on the device's native rate.
  let outputContext: AudioContext;
  try {
    outputContext = new AudioContextCtor({ sampleRate: 24000 });
  } catch {
    outputContext = new AudioContextCtor();
  }
  void outputContext.resume().catch(() => undefined);
  return {
    outputContext,
    nextPlaybackAt: 0,
  };
}
