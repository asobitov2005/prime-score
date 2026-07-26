"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type SVGProps } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Check,
  ClipboardCheck,
  Lightbulb,
  MessageCircle,
  Sparkles,
  Wifi,
} from "lucide-react";

import { ApiError, createApiClient, type SpeakingEntryMode } from "@/lib/api/client";
import { buildSpeakingLiveSessionHref, parseSpeakingTopicLabels } from "@/lib/speaking-navigation";
import { cn } from "@/lib/utils";

type MicState = "checking" | "connected" | "blocked" | "unsupported";
type QualityState = "listening" | "good" | "low" | "clipping";
type ConnectionState = "stable" | "offline";
type MicPermissionState = "prompt" | "granted" | "denied" | "unknown";
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type StatusState = "success" | "pending" | "warning" | "error";
type SpeakingAiMode = "strict_exam" | "free_talk" | "uzbek_roast";

const barCount = 40;
const emptyBars = Array.from({ length: barCount }, () => 0);

const whatWeCheck = ["Microphone access", "Input volume and clarity", "Internet connection"] as const;
const beforeStart = ["Allow microphone permission", "Keep the browser tab open", "Avoid background noise"] as const;

const bottomFeatures = [
  { title: "Real-time", subtitle: "AI conversation", icon: Sparkles },
  { title: "Examiner-style", subtitle: "speaking flow", icon: MessageCircle },
  { title: "Band estimate", subtitle: "after the test", icon: BarChart3 },
] as const;

export function MicrophoneCheckClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useMemo(() => createApiClient(), []);
  const [micState, setMicState] = useState<MicState>("checking");
  const [permissionState, setPermissionState] = useState<MicPermissionState>("unknown");
  const [quality, setQuality] = useState<QualityState>("listening");
  const [connection, setConnection] = useState<ConnectionState>("stable");
  const [inputLevel, setInputLevel] = useState(0);
  const [bars, setBars] = useState<number[]>(() => [...emptyBars]);
  const [speakingTestId, setSpeakingTestId] = useState<string | null>(() => searchParams.get("testId"));
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedLevelRef = useRef(0);
  const qualityRef = useRef<QualityState>("listening");
  const pendingQualityRef = useRef<{ value: QualityState; since: number } | null>(null);
  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));
  const aiMode = normalizeAiMode(searchParams.get("aiMode"));
  const requestedPart = entryMode === "full" ? 1 : Number(entryMode.replace("part_", ""));

  useEffect(() => {
    const previousBodyOverflowY = document.body.style.overflowY;
    const previousHtmlOverflowY = document.documentElement.style.overflowY;

    document.body.style.overflowY = "hidden";
    document.documentElement.style.overflowY = "hidden";

    return () => {
      document.body.style.overflowY = previousBodyOverflowY;
      document.documentElement.style.overflowY = previousHtmlOverflowY;
    };
  }, []);

  const stopMic = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  const updateStableQuality = useCallback((nextQuality: QualityState) => {
    const currentQuality = qualityRef.current;
    const now = performance.now();
    const settleMs = nextQuality === "clipping" ? 450 : 750;

    if (nextQuality === currentQuality) {
      pendingQualityRef.current = null;
      return;
    }

    const pending = pendingQualityRef.current;
    if (!pending || pending.value !== nextQuality) {
      pendingQualityRef.current = { value: nextQuality, since: now };
      return;
    }

    if (now - pending.since >= settleMs) {
      qualityRef.current = nextQuality;
      pendingQualityRef.current = null;
      setQuality(nextQuality);
    }
  }, []);

  const startMic = useCallback(async () => {
    stopMic();

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState("unsupported");
      setQuality("low");
      qualityRef.current = "low";
      pendingQualityRef.current = null;
      smoothedLevelRef.current = 0;
      setInputLevel(0);
      setBars([...emptyBars]);
      return;
    }

    setMicState("checking");
    setQuality("listening");
    qualityRef.current = "listening";
    pendingQualityRef.current = null;
    smoothedLevelRef.current = 0;
    setInputLevel(0);
    setBars([...emptyBars]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("AudioContext is not available.");
      }

      const audioContext = new AudioContextCtor();
      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(() => undefined);
      }
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.48;
      audioContext.createMediaStreamSource(stream).connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      setPermissionState("granted");
      setMicState("connected");

      const track = stream.getAudioTracks()[0];
      if (track) {
        track.onended = () => {
          setMicState("blocked");
          setQuality("low");
          qualityRef.current = "low";
          pendingQualityRef.current = null;
          smoothedLevelRef.current = 0;
          setInputLevel(0);
          setBars([...emptyBars]);
        };
      }

      const samples = new Uint8Array(analyser.fftSize);
      const animate = () => {
        analyser.getByteTimeDomainData(samples);
        let totalSquares = 0;
        let peak = 0;
        for (let index = 0; index < samples.length; index += 1) {
          const value = Math.abs((samples[index] - 128) / 128);
          totalSquares += value * value;
          peak = Math.max(peak, value);
        }

        const rms = Math.sqrt(totalSquares / samples.length);
        const rawLevel = Math.min(1, Math.max(0, rms * 7.8 + peak * 0.48));
        const previousLevel = smoothedLevelRef.current;
        const smoothingFactor = rawLevel > previousLevel ? 0.36 : 0.16;
        const level = previousLevel + (rawLevel - previousLevel) * smoothingFactor;
        smoothedLevelRef.current = level;
        setInputLevel(level);
        updateStableQuality(peak > 0.98 ? "clipping" : level > 0.22 ? "good" : level > 0.035 ? "listening" : "low");
        setBars(buildWaveformBars(samples, level));

        rafRef.current = requestAnimationFrame(animate);
      };

      animate();
    } catch (error) {
      setMicState("blocked");
      setPermissionState(permissionStateFromMediaError(error));
      setQuality("low");
      qualityRef.current = "low";
      pendingQualityRef.current = null;
      smoothedLevelRef.current = 0;
      setInputLevel(0);
      setBars([...emptyBars]);
    }
	  }, [stopMic, updateStableQuality]);

  useEffect(() => {
    if (speakingTestId) {
      return;
    }

    let cancelled = false;
    api.listSpeakingTests()
      .then((payload) => {
        if (!cancelled) {
          setSpeakingTestId(payload.items[0]?.id ?? null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStartError(error instanceof Error ? error.message : "Could not load speaking tests.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, speakingTestId]);

  const handleStart = useCallback(async () => {
    if (!speakingTestId || micState !== "connected" || connection !== "stable" || isStarting) {
      return;
    }

    setIsStarting(true);
    setStartError(null);
    try {
      const session = await api.createSpeakingSession(speakingTestId, entryMode);
      stopMic();
      router.push(buildSpeakingLiveSessionHref(session, aiMode, requestedPart, searchParams));
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error
        ? error.message
        : "Could not start Speaking session.";
      setStartError(message);
      setIsStarting(false);
    }
  }, [aiMode, api, connection, entryMode, isStarting, micState, requestedPart, router, searchParams, speakingTestId, stopMic]);

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;
    let isMounted = true;

    const syncPermission = async () => {
      if (!navigator.permissions?.query) {
        setPermissionState("unknown");
        return;
      }
      try {
        permissionStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (!isMounted) return;
        setPermissionState(normalizePermissionState(permissionStatus.state));
        permissionStatus.onchange = () => {
          if (permissionStatus) {
            setPermissionState(normalizePermissionState(permissionStatus.state));
          }
        };
      } catch {
        setPermissionState("unknown");
      }
    };

    void syncPermission();
    void startMic();

    return () => {
      isMounted = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
      stopMic();
    };
  }, [startMic, stopMic]);

  useEffect(() => {
    setConnection(navigator.onLine ? "stable" : "offline");

    const handleOnline = () => setConnection("stable");
    const handleOffline = () => setConnection("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <main className="speaking-night animate-in fade-in duration-500 text-slate-950 dark:text-slate-50 lg:h-[calc(100svh-1rem)] lg:overflow-hidden">
      <div className="space-y-3 pb-2 lg:pb-0">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-2xl">
              Check your microphone before you start
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500 dark:text-slate-400">
              Make sure your voice is clear so the AI examiner can hear you accurately.
            </p>
          </div>

          <Link
            href="/speaking"
            className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Back to Speaking
          </Link>
        </header>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1.62fr)_minmax(320px,1fr)]">
          <MicrophoneTestCard
            micState={micState}
            permissionState={permissionState}
            quality={quality}
            connection={connection}
            inputLevel={inputLevel}
            bars={bars}
            onTestAgain={startMic}
            onStart={handleStart}
            canCreateSession={Boolean(speakingTestId)}
            isStarting={isStarting}
            startError={startError}
          />

          <aside className="grid gap-3">
            <ChecklistCard title="What we check" icon={ClipboardCheck} items={whatWeCheck} className="lg:min-h-[188px]" />
            <ChecklistCard title="Before you start" icon={Lightbulb} items={beforeStart} className="lg:min-h-[204px]" />
          </aside>
        </section>

        <BottomFeatureStrip />
      </div>
    </main>
  );
}

function MicrophoneTestCard({
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

function MicPulseRings({ level }: { level: number }) {
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

function MicInputWaveform({ bars, inputLevel }: { bars: number[]; inputLevel: number }) {
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

function ChecklistCard({
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

function BottomFeatureStrip() {
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

function StandingMicIcon({ className }: { className?: string }) {
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

function pulseRingStyle(level: number, size: number, lift: number, scaleBoost: number): CSSProperties {
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

function buildWaveformBars(samples: Uint8Array, inputLevel: number): number[] {
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

function normalizePermissionState(state: PermissionState): MicPermissionState {
  if (state === "granted" || state === "denied" || state === "prompt") return state;
  return "unknown";
}

function permissionStateFromMediaError(error: unknown): MicPermissionState {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return "denied";
  }
  return "unknown";
}

function getMicStatusLabel(state: MicState, permissionState: MicPermissionState): string {
  if (state === "connected") return "Connected";
  if (state === "checking") return permissionState === "prompt" ? "Allow access" : "Checking...";
  if (state === "unsupported") return "Unsupported";
  return "Permission needed";
}

function getMicStatusState(state: MicState, permissionState: MicPermissionState): StatusState {
  if (state === "connected") return "success";
  if (state === "checking" || permissionState === "prompt") return "pending";
  return "error";
}

function getQualityLabel(state: QualityState): string {
  if (state === "good") return "Good";
  if (state === "listening") return "Listening...";
  if (state === "clipping") return "Too loud";
  return "Speak louder";
}

function getConnectionLabel(state: ConnectionState): string {
  return state === "stable" ? "Stable" : "Offline";
}

function statusTextClass(state: StatusState): string {
  if (state === "success") return "text-emerald-600 dark:text-emerald-400";
  if (state === "error") return "text-red-600 dark:text-red-400";
  if (state === "warning") return "text-amber-600 dark:text-amber-400";
  return "text-blue-600 dark:text-blue-400";
}

function statusDotClass(state: StatusState): string {
  if (state === "success") return "bg-emerald-500 dark:bg-emerald-400";
  if (state === "error") return "bg-red-500 dark:bg-red-400";
  if (state === "warning") return "bg-amber-500 dark:bg-amber-400";
  return "bg-blue-600 dark:bg-blue-400";
}

function normalizeSpeakingEntryMode(value: string | null): SpeakingEntryMode {
  if (value === "part_1" || value === "part-1") return "part_1";
  if (value === "part_2" || value === "part-2") return "part_2";
  if (value === "part_3" || value === "part-3") return "part_3";
  return "full";
}

function normalizeAiMode(value: string | null): SpeakingAiMode {
  if (value === "free_talk" || value === "uzbek_roast") {
    return value;
  }
  if (value === "practice") return "free_talk";
  if (value === "strict_roast") return "uzbek_roast";
  return "strict_exam";
}
