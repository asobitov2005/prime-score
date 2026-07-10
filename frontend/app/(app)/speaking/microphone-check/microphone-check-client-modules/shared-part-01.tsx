"use client";

import { Activity, BarChart3, ComponentType, MessageCircle, SVGProps, Sparkles, Wifi, cn } from "./dependencies";

import { StandingMicIcon, getConnectionLabel, getMicStatusLabel, getMicStatusState, getQualityLabel, pulseRingStyle, statusDotClass, statusTextClass } from "./shared-part-02";



export type MicState = "checking" | "connected" | "blocked" | "unsupported";

export type QualityState = "listening" | "good" | "low" | "clipping";

export type ConnectionState = "stable" | "offline";

export type MicPermissionState = "prompt" | "granted" | "denied" | "unknown";

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type StatusState = "success" | "pending" | "warning" | "error";

export type SpeakingAiMode = "strict_exam" | "free_talk" | "uzbek_roast";

export const barCount = 40;

export const emptyBars = Array.from({ length: barCount }, () => 0);

export const whatWeCheck = ["Microphone access", "Input volume and clarity", "Internet connection"] as const;

export const beforeStart = ["Allow microphone permission", "Keep the browser tab open", "Avoid background noise"] as const;

export const bottomFeatures = [
  { title: "Real-time", subtitle: "AI conversation", icon: Sparkles },
  { title: "Examiner-style", subtitle: "speaking flow", icon: MessageCircle },
  { title: "Band estimate", subtitle: "after the test", icon: BarChart3 },
] as const;

export function MicrophoneTestCard({
  micState,
  permissionState,
  quality,
  connection,
  inputLevel,
  bars,
  onTestAgain,
  onStart,
  canCreateSession,
  isStarting,
  startError,
}: {
  micState: MicState;
  permissionState: MicPermissionState;
  quality: QualityState;
  connection: ConnectionState;
  inputLevel: number;
  bars: number[];
  onTestAgain: () => void;
  onStart: () => void;
  canCreateSession: boolean;
  isStarting: boolean;
  startError: string | null;
}) {
  const statuses = [
    {
      label: "Microphone",
      status: getMicStatusLabel(micState, permissionState),
      state: getMicStatusState(micState, permissionState),
      icon: StandingMicIcon,
      iconWrap: "bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-500/10 dark:text-blue-400",
    },
    {
      label: "Audio quality",
      status: getQualityLabel(quality),
      state: quality === "good" ? "success" : quality === "listening" ? "pending" : "warning",
      icon: Activity,
      iconWrap: "bg-[#EEF2FF] text-[#2563EB] dark:bg-indigo-500/10 dark:text-indigo-400",
    },
    {
      label: "Connection",
      status: getConnectionLabel(connection),
      state: connection === "stable" ? "success" : "error",
      icon: Wifi,
      iconWrap: "bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-500/10 dark:text-blue-400",
    },
  ] as const;

  const canStart = micState === "connected" && connection === "stable" && canCreateSession && !isStarting;

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:px-8 lg:min-h-[404px]">
      <div className="flex flex-col items-center">
        <div className="relative flex h-[132px] w-[132px] items-center justify-center overflow-visible rounded-full bg-transparent">
          <MicPulseRings level={inputLevel} />
          <div
            className="relative z-10 flex h-[90px] w-[90px] items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-400"
          >
            <StandingMicIcon className="h-14 w-14" />
          </div>
        </div>

        <MicInputWaveform bars={bars} inputLevel={inputLevel} />

        <div className="mt-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-800">
            {statuses.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="flex min-h-[60px] items-center gap-3 px-4 py-2">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", item.iconWrap)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-slate-950 dark:text-slate-50">{item.label}</p>
                    <p className={cn("mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold leading-5", statusTextClass(item.state))}>
                      <span className={cn("h-2 w-2 rounded-full", statusDotClass(item.state))} />
                      {item.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 text-center">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Say something to test your microphone.</p>
          <p className="mt-0.5 text-sm leading-5 text-slate-500 dark:text-slate-400">We recommend using headphones and a quiet environment.</p>
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className={cn(
            "mt-3 inline-flex h-11 w-full max-w-[320px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4CFF] to-[#2563EB] px-5 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(109,76,255,0.95)] transition hover:shadow-[0_20px_42px_-24px_rgba(109,76,255,1)]",
            !canStart && "cursor-not-allowed opacity-60",
          )}
        >
          <StandingMicIcon className="h-5 w-5" />
          {isStarting ? "Starting..." : "Start Mock"}
        </button>

        {startError ? (
          <p className="mt-3 max-w-[360px] text-sm font-semibold text-red-600 dark:text-red-400">{startError}</p>
        ) : !canCreateSession ? (
          <p className="mt-3 max-w-[360px] text-sm font-semibold text-amber-600 dark:text-amber-400">No published speaking test is available yet.</p>
        ) : null}

        <button type="button" onClick={onTestAgain} className="mt-2 text-sm font-semibold text-[#6D4CFF] transition hover:text-[#2563EB] dark:text-[#A78BFA] dark:hover:text-[#C4B5FD]">
          Test again
        </button>
      </div>
    </section>
  );
}

export function MicPulseRings({ level }: { level: number }) {
  return (
    <>
      <span className="absolute z-0 rounded-full border border-[#60A5FA]/80" style={pulseRingStyle(level, 104, 0.12, 0.18)} />
      <span className="absolute z-0 rounded-full border border-[#3B82F6]/74" style={pulseRingStyle(level, 112, 0.22, 0.24)} />
      <span className="absolute z-0 rounded-full border border-[#2563EB]/68" style={pulseRingStyle(level, 120, 0.34, 0.3)} />
      <span className="absolute z-0 rounded-full border border-[#1D4ED8]/58" style={pulseRingStyle(level, 128, 0.48, 0.38)} />
      <span className="absolute z-0 rounded-full border border-[#2563EB]/48" style={pulseRingStyle(level, 136, 0.64, 0.46)} />
      <span className="absolute z-0 rounded-full border border-[#1E40AF]/40" style={pulseRingStyle(level, 144, 0.82, 0.56)} />
    </>
  );
}

export function MicInputWaveform({ bars, inputLevel }: { bars: number[]; inputLevel: number }) {
  return (
    <div className="mt-4 flex h-[60px] w-full max-w-[480px] items-center justify-center px-5">
      <div className="relative flex w-full items-center justify-between gap-1">
        {bars.map((height, index) => (
          <span
            key={index}
            className="relative w-[3px] rounded-full bg-blue-600 transition-[height,opacity] duration-75 dark:bg-blue-400"
            style={{
              height: Math.max(2, height),
              opacity: inputLevel > 0.045 ? 0.92 : index < 4 || index > bars.length - 5 ? 0.28 : 0.44,
            }}
          />
        ))}
      </div>
    </div>
  );
}
