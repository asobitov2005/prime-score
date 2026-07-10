"use client";

import { CSSProperties, Check, SpeakingEntryMode, cn } from "./dependencies";

import { ConnectionState, IconComponent, MicPermissionState, MicState, QualityState, SpeakingAiMode, StatusState, barCount, bottomFeatures } from "./shared-part-01";



export function ChecklistCard({
  title,
  icon: HeaderIcon,
  items,
  className,
}: {
  title: string;
  icon: IconComponent;
  items: readonly string[];
  className?: string;
}) {
  return (
    <section className={cn("rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3EFFF] text-[#6D4CFF] dark:bg-[#6D4CFF]/15 dark:text-[#A78BFA]">
          <HeaderIcon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#6D4CFF] dark:bg-[#6D4CFF]/15 dark:text-[#A78BFA]">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BottomFeatureStrip() {
  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-800">
        {bottomFeatures.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title} className="flex min-h-[74px] items-center justify-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3EFFF] text-[#6D4CFF] dark:bg-[#6D4CFF]/15 dark:text-[#A78BFA]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold leading-5 text-slate-950 dark:text-slate-50">{item.title}</p>
                <p className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">{item.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StandingMicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <rect x="11" y="3.5" width="10" height="16" rx="5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M13.5 8.5h5M13.5 12h5M13.5 15.5h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" opacity="0.72" />
      <path d="M7.5 14.5v1.8a8.5 8.5 0 0 0 17 0v-1.8" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M16 24.8V28" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M10.5 28h11" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}

export function pulseRingStyle(level: number, size: number, lift: number, scaleBoost: number): CSSProperties {
  const activeLevel = level > 0.045 ? Math.min(1, level) : 0;
  const visualLevel = Math.pow(activeLevel, 0.68);
  const ringSize = size + visualLevel * lift * 22;
  const opacity = activeLevel === 0 ? 0 : 0.42 + visualLevel * (0.5 + lift * 0.18);

  return {
    borderWidth: 1.5,
    height: ringSize,
    width: ringSize,
    opacity: Math.min(0.95, opacity),
    transform: `scale(${1 + visualLevel * scaleBoost * 0.08})`,
  };
}

export function buildWaveformBars(samples: Uint8Array, inputLevel: number): number[] {
  const samplesPerBar = Math.max(1, Math.floor(samples.length / barCount));
  const globalLift = Math.pow(Math.min(1, inputLevel * 2.2), 0.68) * 58;
  return Array.from({ length: barCount }, (_, barIndex) => {
    const start = barIndex * samplesPerBar;
    const end = Math.min(samples.length, start + samplesPerBar);
    let totalSquares = 0;
    let peak = 0;
    let count = 0;

    for (let index = start; index < end; index += 1) {
      const value = Math.abs((samples[index] - 128) / 128);
      totalSquares += value * value;
      peak = Math.max(peak, value);
      count += 1;
    }

    const rms = Math.sqrt(totalSquares / Math.max(1, count));
    const voiceEnergy = peak * 0.72 + rms * 0.28;
    const segmentHeight = Math.pow(Math.min(1, voiceEnergy * 5.8), 0.62) * 70;
    const liftRatio = 0.5 + Math.min(0.5, segmentHeight / 140);
    return Math.round(Math.min(70, Math.max(2, segmentHeight * 0.82 + globalLift * liftRatio * 0.34)));
  });
}

export function normalizePermissionState(state: PermissionState): MicPermissionState {
  if (state === "granted" || state === "denied" || state === "prompt") return state;
  return "unknown";
}

export function permissionStateFromMediaError(error: unknown): MicPermissionState {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return "denied";
  }
  return "unknown";
}

export function getMicStatusLabel(state: MicState, permissionState: MicPermissionState): string {
  if (state === "connected") return "Connected";
  if (state === "checking") return permissionState === "prompt" ? "Allow access" : "Checking...";
  if (state === "unsupported") return "Unsupported";
  return "Permission needed";
}

export function getMicStatusState(state: MicState, permissionState: MicPermissionState): StatusState {
  if (state === "connected") return "success";
  if (state === "checking" || permissionState === "prompt") return "pending";
  return "error";
}

export function getQualityLabel(state: QualityState): string {
  if (state === "good") return "Good";
  if (state === "listening") return "Listening...";
  if (state === "clipping") return "Too loud";
  return "Speak louder";
}

export function getConnectionLabel(state: ConnectionState): string {
  return state === "stable" ? "Stable" : "Offline";
}

export function statusTextClass(state: StatusState): string {
  if (state === "success") return "text-emerald-600 dark:text-emerald-400";
  if (state === "error") return "text-red-600 dark:text-red-400";
  if (state === "warning") return "text-amber-600 dark:text-amber-400";
  return "text-blue-600 dark:text-blue-400";
}

export function statusDotClass(state: StatusState): string {
  if (state === "success") return "bg-emerald-500 dark:bg-emerald-400";
  if (state === "error") return "bg-red-500 dark:bg-red-400";
  if (state === "warning") return "bg-amber-500 dark:bg-amber-400";
  return "bg-blue-600 dark:bg-blue-400";
}

export function normalizeSpeakingEntryMode(value: string | null): SpeakingEntryMode {
  if (value === "part_1" || value === "part-1") return "part_1";
  if (value === "part_2" || value === "part-2") return "part_2";
  if (value === "part_3" || value === "part-3") return "part_3";
  return "full";
}

export function normalizeAiMode(value: string | null): SpeakingAiMode {
  if (value === "free_talk" || value === "uzbek_roast") {
    return value;
  }
  if (value === "practice") return "free_talk";
  if (value === "strict_roast") return "uzbek_roast";
  return "strict_exam";
}
