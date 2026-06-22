"use client";

import Link from "next/link";
import { Sora } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileAudio,
  Flame,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Mic2,
  RefreshCcw,
  Sparkles,
  Star,
  StickyNote,
  User,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import {
  createApiClient,
  type SpeakingDiarizedTranscriptItem,
  type SpeakingEntryMode,
  type SpeakingSessionResult,
  type SpeakingTestListItem,
  type SpeakingTopicItem,
} from "@/lib/api/client";
import { getFrontendClientWebSocketApiBaseUrl } from "@/lib/api-base";
import { isSpeakingSessionClosingMessage, PART_1_QUESTION_COUNT } from "@/lib/speaking-live-utils";
import {
  buildMicrophoneCheckHref,
  buildRoastSpeakingHref,
  buildSpeakingTopicPickerHref,
  clampSpeakingPart,
  isPartPracticeEntryMode,
  normalizeSpeakingEntryMode,
  parseSpeakingTopicLabels,
  type SpeakingAiMode,
} from "@/lib/speaking-navigation";
import { cn } from "@/lib/utils";
import { SpeakingAiSphere, speakingSphereStateFromLiveStatus } from "@/components/speaking-ai-sphere";
import { useAuthStore } from "@/store/auth-store";

const display = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export type LiveStatus = "idle" | "connecting" | "ready" | "listening" | "ai_speaking" | "finalizing" | "closed" | "error";

type SpeakingModeAccent = "purple" | "green" | "orange" | "blue";

type SpeakingModeCardConfig = {
  id: string;
  title: string;
  icon: LucideIcon;
  entryMode: SpeakingEntryMode;
  aiMode: SpeakingAiMode;
  part: number;
  action: string;
  bullets: readonly string[];
  accent: SpeakingModeAccent;
  featured?: boolean;
  badge?: {
    label: string;
    icon: LucideIcon;
    tone: "purple" | "orange";
  };
};

const accentStyles: Record<
  SpeakingModeAccent,
  {
    icon: string;
    check: string;
    border: string;
    card: string;
    button: string;
  }
> = {
  purple: {
    icon: "bg-[#F3EFFF] text-[#6D4CFF] dark:bg-[#6D4CFF]/15 dark:text-[#A78BFA]",
    check: "bg-[#F3EFFF] text-[#6D4CFF] dark:bg-[#6D4CFF]/15 dark:text-[#A78BFA]",
    border: "border-[#C4B5FD] dark:border-[#6D4CFF]/30",
    card: "bg-[#FBFAFF] shadow-[0_24px_70px_-48px_rgba(109,76,255,0.72)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-none",
    button:
      "border-transparent bg-gradient-to-r from-[#6D4CFF] to-[#2563EB] text-white shadow-[0_18px_34px_-24px_rgba(109,76,255,0.95)] hover:shadow-[0_20px_42px_-24px_rgba(109,76,255,1)]",
  },
  green: {
    icon: "bg-[#ECFDF5] text-[#10B981] dark:bg-emerald-500/10 dark:text-emerald-400",
    check: "bg-[#ECFDF5] text-[#10B981] dark:bg-emerald-500/10 dark:text-emerald-400",
    border: "border-[#E5E7EB] dark:border-slate-800",
    card: "bg-white shadow-[0_18px_50px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-none",
    button:
      "border-[#A7F3D0] bg-white text-[#059669] hover:border-[#10B981] hover:bg-[#ECFDF5] dark:border-emerald-500/30 dark:bg-slate-950 dark:text-emerald-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-500/10",
  },
  orange: {
    icon: "bg-[#FFF7ED] text-[#F97316] dark:bg-orange-500/10 dark:text-orange-400",
    check: "bg-[#FFF7ED] text-[#F97316] dark:bg-orange-500/10 dark:text-orange-400",
    border: "border-[#E5E7EB] dark:border-slate-800",
    card: "bg-white shadow-[0_18px_50px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-none",
    button:
      "border-[#FED7AA] bg-white text-[#EA580C] hover:border-[#F97316] hover:bg-[#FFF7ED] dark:border-orange-500/30 dark:bg-slate-950 dark:text-orange-400 dark:hover:border-orange-500 dark:hover:bg-orange-500/10",
  },
  blue: {
    icon: "bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-500/10 dark:text-blue-400",
    check: "bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-500/10 dark:text-blue-400",
    border: "border-[#E5E7EB] dark:border-slate-800",
    card: "bg-white shadow-[0_18px_50px_-44px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-none",
    button:
      "border-[#BFDBFE] bg-white text-[#2563EB] hover:border-[#3B82F6] hover:bg-[#EFF6FF] dark:border-blue-500/30 dark:bg-slate-950 dark:text-blue-400 dark:hover:border-blue-500 dark:hover:bg-blue-500/10",
  },
};

const modeCards: readonly SpeakingModeCardConfig[] = [
  {
    id: "ielts_exam",
    title: "IELTS Speaking Exam",
    icon: ClipboardCheck,
    entryMode: "full",
    aiMode: "strict_exam",
    part: 1,
    action: "Start Exam Mode",
    bullets: ["Real IELTS examiner flow", "No coaching during the test", "Band estimate after the test"],
    accent: "purple",
    featured: true,
    badge: { label: "Best for IELTS", icon: Star, tone: "purple" },
  },
  {
    id: "part_1",
    title: "Part 1 Practice",
    icon: User,
    entryMode: "part_1",
    aiMode: "strict_exam",
    part: 1,
    action: "Start Part 1",
    bullets: ["Quick fluency warm-up", "Everyday personal questions", "Focused Part 1 practice"],
    accent: "green",
  },
  {
    id: "part_2",
    title: "Part 2 Cue Card",
    icon: StickyNote,
    entryMode: "part_2",
    aiMode: "strict_exam",
    part: 2,
    action: "Start Part 2",
    bullets: ["Topic-based speaking", "Cue card simulation", "Independent long answer practice"],
    accent: "orange",
  },
  {
    id: "part_3",
    title: "Part 3 Discussion",
    icon: MessagesSquare,
    entryMode: "part_3",
    aiMode: "strict_exam",
    part: 3,
    action: "Start Part 3",
    bullets: ["Opinion questions", "Deeper reasoning practice", "Follow-up discussion flow"],
    accent: "blue",
  },
  {
    id: "free_talk",
    title: "Free Talk",
    icon: MessageCircle,
    entryMode: "full",
    aiMode: "free_talk",
    part: 1,
    action: "Start Free Talk",
    bullets: ["Any topic you choose", "Natural back-and-forth chat", "Great for fluency practice"],
    accent: "green",
  },
  {
    id: "uzbek_roast",
    title: "Uzbek Roast",
    icon: Mic2,
    entryMode: "full",
    aiMode: "uzbek_roast",
    part: 2,
    action: "Start Roast Mode",
    bullets: ["Direct Uzbek-style feedback", "Focused on effort and answers", "Improve confidence under pressure"],
    accent: "orange",
    badge: { label: "Fun & Challenge", icon: Flame, tone: "orange" },
  },
];

const aiWaveformBars = [
  8, 14, 10, 22, 32, 18, 42, 56, 30, 16, 44, 64, 38, 22, 54, 34, 14, 28, 46, 20,
  12, 36, 58, 42, 18, 50, 66, 32, 16, 40, 26, 10, 20, 34, 14, 8,
] as const;

const userWaveformBars = [
  10, 18, 30, 16, 42, 58, 34, 22, 50, 70, 44, 18, 36, 62, 48, 24, 56, 74, 40, 20,
  46, 66, 52, 28, 60, 38, 16, 34, 54, 30, 12, 24,
] as const;

const SPEECH_LEVEL_THRESHOLD = 0.018;
const SPEECH_SILENCE_LEVEL = 0.014;
const SPEECH_END_SILENCE_MS = 2800;
const MIN_SPEECH_MS_BEFORE_SILENCE_END = 700;
const ROAST_SPEECH_END_SILENCE_MS = 4500;
const NORMAL_NO_ANSWER_MS = 12000;
const PART_TWO_PREP_NO_ANSWER_MS = 65000;
const PART_TWO_PREP_COMPLETE_NO_ANSWER_MS = 3000;

export function SpeakingPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("start") !== "mock") {
      return;
    }
    const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));
    if (entryMode !== "part_1" && entryMode !== "part_2") {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("start");
    params.delete("prepComplete");
    const livePath = entryMode === "part_1" ? "/speaking/part-1/live" : "/speaking/part-2/live";
    router.replace(`${livePath}?${params.toString()}`);
  }, [router, searchParams]);

  if (searchParams.get("start") === "mock") {
    const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));
    if (entryMode === "part_1" || entryMode === "part_2") {
      return (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
        </div>
      );
    }
    return <LiveSpeakingMockPage />;
  }

  return <SpeakingHomePage />;
}

function SpeakingHomePage() {
  const api = useMemo(() => createApiClient(), []);
  const [tests, setTests] = useState<SpeakingTestListItem[]>([]);
  const [topics, setTopics] = useState<SpeakingTopicItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.listSpeakingTests(),
      api.listSpeakingTopics(),
    ])
      .then(([testPayload, topicPayload]) => {
        if (cancelled) {
          return;
        }
        setTests(testPayload.items);
        setTopics(topicPayload.items);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [api]);

  const selectedTest = tests[0] ?? null;

  return (
    <div className="speaking-night animate-in fade-in duration-500">
      <div className="space-y-6 pb-10">
        <SpeakingLaunchPanel test={selectedTest} topics={topics} />
      </div>
    </div>
  );
}

function SpeakingLaunchPanel({
  test,
  topics,
}: {
  test: SpeakingTestListItem | null;
  topics: SpeakingTopicItem[];
}) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.85rem]">
          Speaking
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 md:text-base">
          Choose a speaking mode and simulate a real IELTS-style conversation with instant feedback.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {modeCards.map((card) => {
          const topic = topics.find((item) => item.partNumber === card.part) ?? null;
          const href = card.aiMode === "uzbek_roast"
            ? buildRoastSpeakingHref(test?.id ?? null)
            : isPartPracticeEntryMode(card.entryMode)
              ? buildSpeakingTopicPickerHref(card.part, test?.id ?? null)
              : buildMicrophoneCheckHref(card.entryMode, card.aiMode, card.part, test?.id ?? null, topic);

          return (
            <SpeakingModeCard
              key={card.id}
              card={card}
              href={href}
            />
          );
        })}
      </div>
    </section>
  );
}

function SpeakingModeCard({
  card,
  href,
}: {
  card: SpeakingModeCardConfig;
  href: string;
}) {
  const Icon = card.icon;
  const visual = accentStyles[card.accent];
  const BadgeIcon = card.badge?.icon;

  return (
    <article
      className={cn(
        "relative flex min-h-[300px] flex-col rounded-[20px] border p-6 transition duration-200 hover:-translate-y-0.5 sm:min-h-[310px] sm:p-7",
        visual.border,
        visual.card,
        card.featured && "ring-1 ring-[#C4B5FD]/80 dark:ring-[#6D4CFF]/35",
      )}
    >
      {card.badge && BadgeIcon ? (
        <span
          className={cn(
            "pointer-events-none absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
            card.badge.tone === "purple"
              ? "bg-[#6D4CFF] text-white shadow-[0_10px_24px_-16px_rgba(109,76,255,0.95)]"
              : "border border-[#FED7AA] bg-[#FFF7ED] text-[#EA580C] dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
          )}
        >
          <BadgeIcon className={cn("h-3.5 w-3.5", card.badge.tone === "purple" && "fill-current")} strokeWidth={2.25} />
          {card.badge.label}
        </span>
      ) : null}

      <div className="flex flex-col items-center text-center">
        <span
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full shadow-[0_16px_34px_-24px_rgba(15,23,42,0.45)] sm:h-[84px] sm:w-[84px]",
            visual.icon,
          )}
        >
          <Icon className="h-8 w-8" strokeWidth={2} />
        </span>

        <h2 className="mt-5 text-[22px] font-bold leading-tight text-slate-950 dark:text-slate-50 sm:text-[24px]">
          {card.title}
        </h2>
      </div>

      <div className="my-5 h-px bg-slate-200 dark:bg-slate-800" />

      <ul className="flex-1 space-y-3 text-left">
        {card.bullets.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[14px] font-semibold leading-5 text-slate-700 dark:text-slate-300 sm:text-[15px]">
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", visual.check)}>
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        onPointerDown={card.aiMode === "uzbek_roast" ? prefetchMicrophonePermission : undefined}
        className={cn(
          "mt-6 inline-flex h-11 w-full shrink-0 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition active:scale-[0.99]",
          visual.button,
        )}
      >
        {card.action}
      </Link>
    </article>
  );
}

function LiveSpeakingMockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get("sessionId");
  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));
  const part = clampSpeakingPart(Number(searchParams.get("part") ?? (entryMode === "full" ? "1" : entryMode.replace("part_", ""))));
  const topic = searchParams.get("topic");
  const topics = useMemo(() => parseSpeakingTopicLabels(searchParams), [searchParams]);
  const topicLabel = topics.length > 0 ? topics.join(", ") : topic;
  const randomTopic = searchParams.get("randomTopic") !== "0";
  const aiMode = normalizeAiMode(searchParams.get("aiMode"));
  const prepComplete = searchParams.get("prepComplete") === "1";
  const isRoastMode = aiMode === "uzbek_roast";
  const api = useMemo(() => createApiClient(), []);
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(sessionIdFromUrl);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(isRoastMode && !sessionIdFromUrl);
  const roastBootstrapStartedRef = useRef(false);

  useEffect(() => {
    setResolvedSessionId(sessionIdFromUrl);
  }, [sessionIdFromUrl]);

  useEffect(() => {
    if (!isRoastMode || sessionIdFromUrl) {
      roastBootstrapStartedRef.current = false;
      return;
    }
    if (roastBootstrapStartedRef.current) {
      return;
    }
    roastBootstrapStartedRef.current = true;

    let cancelled = false;
    setIsBootstrapping(true);
    setBootstrapError(null);

    void (async () => {
      try {
        const requestedTestId = searchParams.get("testId");
        const speakingTestId = requestedTestId ?? (await api.listSpeakingTests()).items[0]?.id ?? null;
        if (!speakingTestId) {
          throw new Error("Could not find a speaking test.");
        }
        const session = await api.createSpeakingSession(speakingTestId, entryMode);
        if (cancelled) {
          return;
        }
        const params = new URLSearchParams(searchParams.toString());
        params.set("sessionId", session.sessionId);
        params.set("testId", session.speakingTestId);
        router.replace(`/speaking?${params.toString()}`);
        setResolvedSessionId(session.sessionId);
      } catch (bootstrapFailure) {
        if (!cancelled) {
          setBootstrapError(
            bootstrapFailure instanceof Error
              ? bootstrapFailure.message
              : "Could not start the roast session.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, entryMode, isRoastMode, router, searchParams, sessionIdFromUrl]);

  if (isRoastMode && (isBootstrapping || !resolvedSessionId)) {
    return (
      <RoastSpeakingShell>
        {bootstrapError ? (
          <section className="mx-auto max-w-md rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-center text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {bootstrapError}
          </section>
        ) : (
          <>
            <SpeakingAiSphere state="connecting" />
            <p className="mt-8 text-sm font-semibold text-slate-600 dark:text-slate-300">Preparing session...</p>
          </>
        )}
      </RoastSpeakingShell>
    );
  }

  if (!resolvedSessionId) {
    return (
      <main className="speaking-night animate-in fade-in duration-500 text-slate-950 dark:text-slate-50">
        <section className="rounded-[18px] border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
          <h1 className="text-xl font-semibold text-amber-950 dark:text-amber-100">Speaking session is not ready</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-amber-800 dark:text-amber-200/90">
            Start from the microphone check page so PrimeScore can create a backend AI session first.
          </p>
          <Link href="/speaking" className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white">
            Back to Speaking
          </Link>
        </section>
      </main>
    );
  }

  return (
    <LiveSpeakingSessionView
      sessionId={resolvedSessionId}
      entryMode={entryMode}
      aiMode={aiMode}
      part={part}
      topics={topics}
      topicLabel={topicLabel}
      randomTopic={randomTopic}
      isRoastMode={isRoastMode}
      prepComplete={prepComplete}
    />
  );
}

function LiveSpeakingSessionView({
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

function RoastSpeakingShell({ children }: { children: ReactNode }) {
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

function RoastSpeakingLiveView({
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

function getRoastStatusLabel(
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

export function useSpeakingLiveSession({
  sessionId,
  entryMode,
  aiMode,
  part,
  topics,
  randomTopic,
  prepComplete = false,
}: {
  sessionId: string | null;
  entryMode: SpeakingEntryMode;
  aiMode: SpeakingAiMode;
  part: number;
  topics: string[];
  randomTopic: boolean;
  prepComplete?: boolean;
}) {
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeakingSessionResult | null>(null);
  const [examinerTranscript, setExaminerTranscript] = useState("");
  const [userTranscript, setUserTranscript] = useState("");
  const [inputLevel, setInputLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isStartingMic, setIsStartingMic] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [inputTurnOpen, setInputTurnOpen] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [plannedQuestionCount, setPlannedQuestionCount] = useState(PART_1_QUESTION_COUNT);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<LiveAudioRuntime | null>(null);
  const outputAudioRef = useRef<LiveOutputRuntime | null>(null);
  const stoppedRef = useRef(false);
  const deletingSessionRef = useRef(false);
  const statusRef = useRef<LiveStatus>("idle");
  const hasStartedInterviewRef = useRef(false);
  const isStartingAudioRef = useRef(false);
  const audioStartGenerationRef = useRef(0);
  const isInputTurnOpenRef = useRef(false);
  const noAnswerTimerRef = useRef<number | null>(null);
  const yourTurnTimerRef = useRef<number | null>(null);
  const examinerSpeechWatchRef = useRef<number | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const ensureBrowserAudioRef = useRef<(() => void) | null>(null);
  const examinerTranscriptRef = useRef("");
  const liveConfigRef = useRef({ entryMode, aiMode, part, topics, randomTopic });
  liveConfigRef.current = { entryMode, aiMode, part, topics, randomTopic };
  const prepCompleteRef = useRef(prepComplete);
  prepCompleteRef.current = prepComplete;
  const aiModeRef = useRef(aiMode);
  aiModeRef.current = aiMode;

  const canStreamInput = useCallback(() => isInputTurnOpenRef.current, []);

  const setLiveStatus = useCallback((next: LiveStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const openInputTurn = useCallback(() => {
    isInputTurnOpenRef.current = true;
    setInputTurnOpen(true);
    setLiveStatus("listening");
    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "begin_audio" }));
    }
  }, [setLiveStatus]);

  const closeInputTurnState = useCallback(() => {
    isInputTurnOpenRef.current = false;
    setInputTurnOpen(false);
  }, []);

  const clearNoAnswerTimer = useCallback(() => {
    if (noAnswerTimerRef.current !== null) {
      window.clearTimeout(noAnswerTimerRef.current);
      noAnswerTimerRef.current = null;
    }
  }, []);

  const clearYourTurnTimer = useCallback(() => {
    if (yourTurnTimerRef.current !== null) {
      window.clearTimeout(yourTurnTimerRef.current);
      yourTurnTimerRef.current = null;
    }
  }, []);

  const clearExaminerSpeechWatch = useCallback(() => {
    if (examinerSpeechWatchRef.current !== null) {
      window.clearTimeout(examinerSpeechWatchRef.current);
      examinerSpeechWatchRef.current = null;
    }
  }, []);

  const interruptUserTurnForExaminer = useCallback(() => {
    if (!isInputTurnOpenRef.current) {
      return;
    }
    const socket = wsRef.current;
    closeInputTurnState();
    if (socket?.readyState === WebSocket.OPEN && hasStartedInterviewRef.current) {
      socket.send(JSON.stringify({ type: "end_audio" }));
    }
  }, [closeInputTurnState]);

  const releaseAudioRuntime = useCallback(() => {
    clearNoAnswerTimer();
    clearYourTurnTimer();
    clearExaminerSpeechWatch();
    audioStartGenerationRef.current += 1;
    stopAudioRuntime(audioRef.current);
    audioRef.current = null;
    stopOutputRuntime(outputAudioRef.current);
    outputAudioRef.current = null;
    isStartingAudioRef.current = false;
    isInputTurnOpenRef.current = false;
    setInputTurnOpen(false);
    setIsRecording(false);
    setIsStartingMic(false);
    setInputLevel(0);
  }, [clearNoAnswerTimer, clearYourTurnTimer, clearExaminerSpeechWatch]);

  const closeInputTurn = useCallback((nudgeText?: string) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !hasStartedInterviewRef.current || !isInputTurnOpenRef.current) {
      return;
    }
    clearNoAnswerTimer();
    closeInputTurnState();
    setLiveStatus("ai_speaking");
    socket.send(JSON.stringify({ type: "end_audio" }));
    if (nudgeText) {
      socket.send(JSON.stringify({ type: "text", text: nudgeText }));
    }
  }, [clearNoAnswerTimer, closeInputTurnState, setLiveStatus]);

  const scheduleNoAnswerPrompt = useCallback(() => {
    clearNoAnswerTimer();
    const examinerText = examinerTranscriptRef.current;
    const delay = prepCompleteRef.current && isPartTwoPreparationPrompt(examinerText)
      ? PART_TWO_PREP_COMPLETE_NO_ANSWER_MS
      : getNoAnswerDelayMs(examinerText);
    noAnswerTimerRef.current = window.setTimeout(() => {
      if (statusRef.current !== "listening" || !hasStartedInterviewRef.current || !isInputTurnOpenRef.current) {
        return;
      }
      closeInputTurn(buildNoAnswerExaminerPrompt(examinerText));
    }, delay);
  }, [clearNoAnswerTimer, closeInputTurn]);

  const finishAnswer = useCallback(() => {
    closeInputTurn();
  }, [closeInputTurn]);

  const resumeBrowserAudioContexts = useCallback(() => {
    void audioRef.current?.inputContext.resume().catch(() => undefined);
    void outputAudioRef.current?.outputContext.resume().catch(() => undefined);
  }, []);

  const scheduleExaminerSpeechWatch = useCallback(() => {
    clearExaminerSpeechWatch();

    const checkPlayback = () => {
      examinerSpeechWatchRef.current = null;
      if (stoppedRef.current || !hasStartedInterviewRef.current) {
        return;
      }
      if (statusRef.current !== "ai_speaking") {
        return;
      }

      const runtime = outputAudioRef.current;
      const stillPlaying = Boolean(
        runtime && runtime.nextPlaybackAt > runtime.outputContext.currentTime + 0.12,
      );
      if (stillPlaying && runtime) {
        const delayMs = Math.max(
          120,
          (runtime.nextPlaybackAt - runtime.outputContext.currentTime) * 1000 + 120,
        );
        examinerSpeechWatchRef.current = window.setTimeout(checkPlayback, delayMs);
        return;
      }

      const { entryMode, part } = liveConfigRef.current;
      if (isSpeakingSessionClosingMessage(examinerTranscriptRef.current, entryMode, part)) {
        stopRef.current?.();
        return;
      }

      examinerSpeechWatchRef.current = window.setTimeout(() => {
        examinerSpeechWatchRef.current = null;
        if (stoppedRef.current || !hasStartedInterviewRef.current || isInputTurnOpenRef.current) {
          return;
        }
        if (statusRef.current !== "ai_speaking") {
          return;
        }
        const config = liveConfigRef.current;
        if (isSpeakingSessionClosingMessage(examinerTranscriptRef.current, config.entryMode, config.part)) {
          stopRef.current?.();
        }
      }, 4500);
    };

    examinerSpeechWatchRef.current = window.setTimeout(checkPlayback, 350);
  }, [clearExaminerSpeechWatch]);

  const scheduleOpenInputTurn = useCallback((turn: number | null) => {
    const { entryMode, part } = liveConfigRef.current;
    if (isSpeakingSessionClosingMessage(examinerTranscriptRef.current, entryMode, part)) {
      stopRef.current?.();
      return;
    }
    clearYourTurnTimer();
    clearNoAnswerTimer();

    const activateInputTurn = () => {
      yourTurnTimerRef.current = null;
      if (stoppedRef.current || !hasStartedInterviewRef.current) {
        return;
      }
      const { entryMode, part } = liveConfigRef.current;
      if (isSpeakingSessionClosingMessage(examinerTranscriptRef.current, entryMode, part)) {
        stopRef.current?.();
        return;
      }
      setTurnCount((current) => (turn !== null ? turn : current + 1));
      openInputTurn();
      ensureBrowserAudioRef.current?.();
      resumeBrowserAudioContexts();
      scheduleNoAnswerPrompt();
    };

    const runtime = outputAudioRef.current;
    if (runtime) {
      const delayMs = Math.max(0, (runtime.nextPlaybackAt - runtime.outputContext.currentTime) * 1000 + 120);
      if (delayMs > 120) {
        yourTurnTimerRef.current = window.setTimeout(activateInputTurn, delayMs);
        return;
      }
    }
    activateInputTurn();
  }, [clearNoAnswerTimer, clearYourTurnTimer, openInputTurn, resumeBrowserAudioContexts, scheduleNoAnswerPrompt]);

  const getMicTurnHandlers = useCallback(() => {
    const isRoast = aiModeRef.current === "uzbek_roast";
    return {
      onSpeechStart: clearNoAnswerTimer,
      onSilenceTurnEnd: () => closeInputTurn(),
      silenceEndMs: isRoast ? ROAST_SPEECH_END_SILENCE_MS : SPEECH_END_SILENCE_MS,
      minSpeechMsBeforeSilenceEnd: MIN_SPEECH_MS_BEFORE_SILENCE_END,
    };
  }, [clearNoAnswerTimer, closeInputTurn]);

  const fetchResult = useCallback(async (attempt = 0) => {
    if (!sessionId) {
      return;
    }
    try {
      const payload = await api.getSpeakingSessionResult(sessionId);
      if (payload.status === "live" && attempt < 8) {
        window.setTimeout(() => void fetchResult(attempt + 1), 900);
        return;
      }
      releaseAudioRuntime();
      setResult(payload);
      setStatus(payload.status === "graded" || payload.status === "completed" ? "closed" : statusRef.current);
    } catch (resultError) {
      if (attempt < 8) {
        window.setTimeout(() => void fetchResult(attempt + 1), 900);
        return;
      }
      setError(resultError instanceof Error ? resultError.message : "Could not load Speaking feedback.");
      setStatus("error");
    }
  }, [api, releaseAudioRuntime, sessionId]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    releaseAudioRuntime();
    hasStartedInterviewRef.current = false;
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "stop" }));
      setStatus("finalizing");
      window.setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, "user_finished");
        }
      }, 1400);
    } else {
      socket?.close();
      setStatus("finalizing");
    }
    if (aiMode !== "uzbek_roast") {
      void fetchResult();
    }
  }, [aiMode, fetchResult, releaseAudioRuntime]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const discard = useCallback(async (): Promise<boolean> => {
    if (!sessionId || isDeletingSession) {
      return false;
    }
    deletingSessionRef.current = true;
    stoppedRef.current = true;
    setIsDeletingSession(true);
    releaseAudioRuntime();
    hasStartedInterviewRef.current = false;
    const socket = wsRef.current;
    wsRef.current = null;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close(1000, "user_discarded");
    }

    try {
      await api.deleteSpeakingSession(sessionId);
      setResult(null);
      setExaminerTranscript("");
      setUserTranscript("");
      examinerTranscriptRef.current = "";
      setIsInterviewStarted(false);
      setError(null);
      setMicError(null);
      setStatus("closed");
      return true;
    } catch (deleteError) {
      deletingSessionRef.current = false;
      setError(deleteError instanceof Error ? deleteError.message : "Could not discard Speaking session.");
      setStatus("error");
      return false;
    } finally {
      setIsDeletingSession(false);
    }
  }, [api, isDeletingSession, releaseAudioRuntime, sessionId]);

  const sendText = useCallback((text: string) => {
    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "text", text }));
    }
  }, []);

  const startMicRuntime = useCallback(async () => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || audioRef.current || isStartingMic || isStartingAudioRef.current) {
      return;
    }
    isStartingAudioRef.current = true;
    const startGeneration = audioStartGenerationRef.current;
    setIsStartingMic(true);
    setMicError(null);
    try {
      const runtime = await startAudioRuntime(
        () => wsRef.current,
        setInputLevel,
        canStreamInput,
        getMicTurnHandlers(),
        () => (
          audioStartGenerationRef.current === startGeneration
          && !stoppedRef.current
          && hasStartedInterviewRef.current
        ),
      );
      if (
        audioStartGenerationRef.current !== startGeneration
        || stoppedRef.current
        || !hasStartedInterviewRef.current
        || wsRef.current !== socket
        || socket.readyState !== WebSocket.OPEN
      ) {
        stopAudioRuntime(runtime);
        return;
      }
      audioRef.current = runtime;
      setIsRecording(true);
    } catch (runtimeError) {
      if (stoppedRef.current || !hasStartedInterviewRef.current) {
        return;
      }
      setMicError(runtimeError instanceof Error ? runtimeError.message : "Microphone could not be started.");
      setIsRecording(false);
    } finally {
      isStartingAudioRef.current = false;
      setIsStartingMic(false);
    }
  }, [canStreamInput, getMicTurnHandlers, isStartingMic]);

  const beginInterview = useCallback(async () => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || hasStartedInterviewRef.current || isDeletingSession) {
      return;
    }
    hasStartedInterviewRef.current = true;
    isInputTurnOpenRef.current = false;
    setInputTurnOpen(false);
    try {
      outputAudioRef.current ??= startOutputRuntime();
      void outputAudioRef.current.outputContext.resume().catch(() => undefined);
    } catch (outputError) {
      hasStartedInterviewRef.current = false;
      setError(outputError instanceof Error ? outputError.message : "Audio playback is not available in this browser.");
      return;
    }
    setElapsedSeconds(0);
    setIsInterviewStarted(true);
    setLiveStatus("connecting");
    if (!hasStartedInterviewRef.current || wsRef.current !== socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const { entryMode, aiMode, part, topics, randomTopic } = liveConfigRef.current;
    socket.send(JSON.stringify({ type: "start", entryMode, mode: aiMode, part, topics, randomTopic }));
  }, [isDeletingSession, setLiveStatus]);

  const startMic = useCallback(async () => {
    if (!hasStartedInterviewRef.current) {
      await beginInterview();
      return;
    }
    await startMicRuntime();
  }, [beginInterview, startMicRuntime]);

  const liveSessionHandlersRef = useRef({
    beginInterview,
    fetchResult,
    releaseAudioRuntime,
    setLiveStatus,
    clearNoAnswerTimer,
    clearYourTurnTimer,
    closeInputTurn,
    closeInputTurnState,
    openInputTurn,
    scheduleOpenInputTurn,
    interruptUserTurnForExaminer,
    scheduleExaminerSpeechWatch,
    scheduleNoAnswerPrompt,
    canStreamInput,
    getMicTurnHandlers,
    resumeBrowserAudioContexts,
  });
  liveSessionHandlersRef.current = {
    beginInterview,
    fetchResult,
    releaseAudioRuntime,
    setLiveStatus,
    clearNoAnswerTimer,
    clearYourTurnTimer,
    closeInputTurn,
    closeInputTurnState,
    openInputTurn,
    scheduleOpenInputTurn,
    interruptUserTurnForExaminer,
    scheduleExaminerSpeechWatch,
    scheduleNoAnswerPrompt,
    canStreamInput,
    getMicTurnHandlers,
    resumeBrowserAudioContexts,
  };

  useEffect(() => {
    const resume = () => {
      liveSessionHandlersRef.current.resumeBrowserAudioContexts();
    };
    window.addEventListener("pointerdown", resume, { capture: true });
    return () => window.removeEventListener("pointerdown", resume, { capture: true });
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      setLiveStatus("error");
      setError("Authentication is required to start Speaking AI.");
      return;
    }

    let cancelled = false;
    stoppedRef.current = false;
    deletingSessionRef.current = false;
    hasStartedInterviewRef.current = false;
    isStartingAudioRef.current = false;
    audioStartGenerationRef.current += 1;
    isInputTurnOpenRef.current = false;
    setInputTurnOpen(false);
    clearNoAnswerTimer();
    setInputTurnOpen(false);
    setLiveStatus("connecting");
    setError(null);
    setExaminerTranscript("");
    setUserTranscript("");
    examinerTranscriptRef.current = "";
    setResult(null);
    setInputLevel(0);
    setMicError(null);
    setIsStartingMic(false);
    setIsInterviewStarted(false);
    setTurnCount(0);
    setPlannedQuestionCount(PART_1_QUESTION_COUNT);
    setElapsedSeconds(0);

    const previousSocket = wsRef.current;
    if (previousSocket) {
      previousSocket.onopen = null;
      previousSocket.onmessage = null;
      previousSocket.onerror = null;
      previousSocket.onclose = null;
      previousSocket.close();
    }

    const websocketUrl = new URL(`${getFrontendClientWebSocketApiBaseUrl()}/speaking/sessions/${sessionId}/live`);
    websocketUrl.searchParams.set("token", accessToken);
    const socket = new WebSocket(websocketUrl.toString());
    wsRef.current = socket;
    const isCurrentSocket = () => !cancelled && wsRef.current === socket;

    const elapsedTimer = window.setInterval(() => {
      if (
        isCurrentSocket()
        && hasStartedInterviewRef.current
        && statusRef.current !== "finalizing"
        && statusRef.current !== "closed"
        && statusRef.current !== "error"
      ) {
        setElapsedSeconds((current) => current + 1);
      }
    }, 1000);

    const handlers = () => liveSessionHandlersRef.current;

    const startBrowserAudio = () => {
      if (!isCurrentSocket() || isStartingAudioRef.current) {
        return;
      }
      if (audioRef.current) {
        return;
      }
      isStartingAudioRef.current = true;
      const startGeneration = audioStartGenerationRef.current;
      setIsStartingMic(true);
      setMicError(null);
      startAudioRuntime(
        () => wsRef.current,
        (level) => {
          if (isCurrentSocket()) {
            setInputLevel(level);
          }
        },
        () => handlers().canStreamInput(),
        handlers().getMicTurnHandlers(),
        () => (
          audioStartGenerationRef.current === startGeneration
          && !stoppedRef.current
          && hasStartedInterviewRef.current
          && isCurrentSocket()
        ),
      )
        .then((runtime) => {
          if (
            audioStartGenerationRef.current !== startGeneration
            || stoppedRef.current
            || !hasStartedInterviewRef.current
            || !isCurrentSocket()
          ) {
            stopAudioRuntime(runtime);
            return;
          }
          audioRef.current = runtime;
          setIsRecording(true);
        })
        .catch((runtimeError: unknown) => {
          if (!isCurrentSocket() || stoppedRef.current || !hasStartedInterviewRef.current) {
            return;
          }
          setMicError(runtimeError instanceof Error ? runtimeError.message : "Microphone could not be started.");
          setIsRecording(false);
        })
        .finally(() => {
          isStartingAudioRef.current = false;
          if (isCurrentSocket()) {
            setIsStartingMic(false);
          }
        });
    };

    const ensureBrowserAudio = () => {
      if (!isCurrentSocket()) {
        return;
      }
      if (audioRef.current) {
        void audioRef.current.inputContext.resume().catch(() => undefined);
        return;
      }
      startBrowserAudio();
    };
    ensureBrowserAudioRef.current = ensureBrowserAudio;

    socket.onopen = () => {
      if (!isCurrentSocket()) {
        return;
      }
      handlers().setLiveStatus("ready");
      window.setTimeout(() => {
        if (!isCurrentSocket() || hasStartedInterviewRef.current || stoppedRef.current) {
          return;
        }
        void handlers().beginInterview();
      }, 0);
    };

    socket.onmessage = (event) => {
      if (!isCurrentSocket()) {
        return;
      }
      const message = parseLiveMessage(event.data);
      if (!message) {
        return;
      }

      if (message.type === "ready") {
        const plannedQuestions = typeof message.planned_questions === "number" ? message.planned_questions : null;
        if (plannedQuestions && plannedQuestions > 0) {
          setPlannedQuestionCount(plannedQuestions);
        }
        handlers().setLiveStatus(hasStartedInterviewRef.current ? "ai_speaking" : "ready");
        if (hasStartedInterviewRef.current) {
          ensureBrowserAudio();
        }
        return;
      }
      if (message.type === "error") {
        setError(getLiveMessageString(message, "message") || "Speaking AI returned an error.");
        handlers().setLiveStatus("error");
        return;
      }
      if (message.type === "input_transcript") {
        setUserTranscript((current) => mergeTranscript(current, getLiveMessageString(message, "text")));
        return;
      }
      if (message.type === "transcript") {
        handlers().clearNoAnswerTimer();
        setExaminerTranscript((current) => {
          const next = mergeTranscript(current, getLiveMessageString(message, "text"));
          examinerTranscriptRef.current = next;
          return next;
        });
        handlers().interruptUserTurnForExaminer();
        handlers().setLiveStatus("ai_speaking");
        handlers().scheduleExaminerSpeechWatch();
        return;
      }
      if (message.type === "audio") {
        handlers().clearNoAnswerTimer();
        handlers().interruptUserTurnForExaminer();
        handlers().setLiveStatus("ai_speaking");
        try {
          outputAudioRef.current ??= startOutputRuntime();
          void outputAudioRef.current.outputContext.resume().catch(() => undefined);
        } catch (outputError) {
          setError(outputError instanceof Error ? outputError.message : "Audio playback is not available in this browser.");
          setLiveStatus("error");
          return;
        }
        void playPcmAudio(
          getLiveMessageString(message, "data"),
          getLiveMessageString(message, "mimeType") || "audio/pcm;rate=24000",
          outputAudioRef,
        ).finally(() => {
          if (isCurrentSocket()) {
            handlers().scheduleExaminerSpeechWatch();
          }
        });
        handlers().scheduleExaminerSpeechWatch();
        return;
      }
      if (message.type === "your_turn") {
        const serverTurn = typeof message.turn === "number" ? message.turn : null;
        handlers().scheduleOpenInputTurn(serverTurn);
        return;
      }
      if (message.type === "turn_complete") {
        return;
      }
    };

    socket.onerror = () => {
      if (!isCurrentSocket()) {
        return;
      }
      setError("Could not connect to the Speaking AI. Please try again.");
      handlers().setLiveStatus("error");
    };

    socket.onclose = (event) => {
      if (deletingSessionRef.current) {
        return;
      }
      if (isCurrentSocket() && !stoppedRef.current) {
        const currentStatus = statusRef.current;
        if (currentStatus === "connecting") {
          setError(event.reason || "Speaking AI connection closed before the session became ready.");
          handlers().setLiveStatus("error");
        } else if (currentStatus !== "error") {
          handlers().setLiveStatus("closed");
        }
      }
      if (isCurrentSocket()) {
        handlers().releaseAudioRuntime();
        if (stoppedRef.current && aiModeRef.current !== "uzbek_roast") {
          void handlers().fetchResult();
        }
      }
    };

    return () => {
      cancelled = true;
      ensureBrowserAudioRef.current = null;
      window.clearInterval(elapsedTimer);
      handlers().releaseAudioRuntime();
      if (!deletingSessionRef.current && hasStartedInterviewRef.current && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "stop" }));
      }
      socket.close();
    };
  }, [sessionId]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (result && result.status !== "live") {
      releaseAudioRuntime();
    }
  }, [releaseAudioRuntime, result]);

  return {
    status,
    error,
    micError,
    examinerTranscript,
    userTranscript,
    inputLevel,
    isRecording,
    isStartingMic,
    turnCount,
    plannedQuestionCount,
    elapsedSeconds,
    result,
    isDeletingSession,
    isInterviewStarted,
    inputTurnOpen,
    beginInterview,
    startMic,
    finishAnswer,
    sendText,
    stop,
    discard,
  };
}

function LivePanelStatusBar({
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

function HeaderPill({ children, className }: { children: ReactNode; className?: string }) {
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

function ExamChatBubble({ item }: { item: SpeakingDiarizedTranscriptItem }) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getFeedbackText(item: Record<string, unknown>, key: string): string {
  const value = item[key];
  return typeof value === "string" ? value.trim() : "";
}

function getCriteriaFeedback(result: SpeakingSessionResult, key: string): string {
  const raw = result.structuredFeedback.criteriaFeedback[key];
  if (!isRecord(raw)) {
    return "";
  }
  const feedback = raw.feedback;
  const nextStep = raw.next_step ?? raw.nextStep;
  return typeof feedback === "string" && feedback.trim()
    ? feedback.trim()
    : typeof nextStep === "string"
      ? nextStep.trim()
      : "";
}

function FeedbackLine({ label, value }: { label: string; value: string }) {
  if (!value) {
    return null;
  }
  return (
    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
      <span className="font-black text-slate-950 dark:text-slate-50">{label}: </span>
      {value}
    </p>
  );
}

function formatDurationMs(value: number | null): string {
  if (!value || value <= 0) {
    return "Audio";
  }
  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatOffsetMs(value: number | null): string {
  if (value === null || value < 0) {
    return "";
  }
  return formatDurationMs(value);
}

function buildFallbackDiarizedTranscript(result: SpeakingSessionResult) {
  const items = [];
  if (result.examinerTranscript.trim()) {
    items.push({ role: "examiner", text: result.examinerTranscript.trim(), at: null, offsetMs: null });
  }
  if (result.candidateTranscript.trim()) {
    items.push({ role: "candidate", text: result.candidateTranscript.trim(), at: null, offsetMs: null });
  }
  return items;
}

function AiQuestionSection({
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

function UserAnswerSection({
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

function LiveWaveform({
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

type LiveAudioRuntime = {
  inputContext: AudioContext;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  silentGain: GainNode;
};

type LiveOutputRuntime = {
  outputContext: AudioContext;
  nextPlaybackAt: number;
};

function getAudioContextConstructor(): typeof AudioContext {
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error("Audio playback is not available in this browser.");
  }
  return AudioContextCtor;
}

function startOutputRuntime(): LiveOutputRuntime {
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

async function startAudioRuntime(
  getSocket: () => WebSocket | null,
  onInputLevel: (value: number) => void,
  shouldStreamInput: () => boolean,
  turnHandlers: {
    onSpeechStart?: () => void;
    onSilenceTurnEnd?: () => void;
    silenceEndMs?: number;
    minSpeechMsBeforeSilenceEnd?: number;
  } = {},
  shouldKeepRuntime: () => boolean = () => true,
): Promise<LiveAudioRuntime> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported by this browser.");
  }
  const AudioContextCtor = getAudioContextConstructor();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      // Auto gain control dynamically normalizes loudness, which keeps the input
      // level above SPEECH_SILENCE_LEVEL during pauses and prevents the client-side
      // end-of-turn detection from firing. Keep it off so the fixed VAD thresholds
      // stay meaningful (the server now relies on the client to mark turn ends).
      autoGainControl: false,
      channelCount: 1,
    },
  });
  if (!shouldKeepRuntime()) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Microphone start was cancelled.");
  }
  const inputContext = new AudioContextCtor();
  await inputContext.resume().catch(() => undefined);
  if (!shouldKeepRuntime()) {
    stream.getTracks().forEach((track) => track.stop());
    void inputContext.close().catch(() => undefined);
    throw new Error("Microphone start was cancelled.");
  }

  const source = inputContext.createMediaStreamSource(stream);
  const processor = inputContext.createScriptProcessor(4096, 1, 1);
  const silentGain = inputContext.createGain();
  silentGain.gain.value = 0;
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(inputContext.destination);

  let wasStreaming = false;
  let hasSpeechInTurn = false;
  let lastSpeechAt = 0;
  let speechStartedAt = 0;
  const silenceEndMs = turnHandlers.silenceEndMs ?? SPEECH_END_SILENCE_MS;
  const minSpeechMsBeforeSilenceEnd = turnHandlers.minSpeechMsBeforeSilenceEnd ?? 0;

  processor.onaudioprocess = (event) => {
    const socket = getSocket();
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const input = event.inputBuffer.getChannelData(0);
    const level = calculateInputLevel(input);
    onInputLevel(level);
    const canStream = shouldStreamInput();
    if (!canStream) {
      wasStreaming = false;
      hasSpeechInTurn = false;
      lastSpeechAt = 0;
      return;
    }
    if (!wasStreaming) {
      wasStreaming = true;
      hasSpeechInTurn = false;
      lastSpeechAt = 0;
    }
    const now = performance.now();
    if (level >= SPEECH_LEVEL_THRESHOLD) {
      if (!hasSpeechInTurn) {
        speechStartedAt = now;
        turnHandlers.onSpeechStart?.();
      }
      hasSpeechInTurn = true;
      lastSpeechAt = now;
    }
    if (
      hasSpeechInTurn
      && turnHandlers.onSilenceTurnEnd
      && level <= SPEECH_SILENCE_LEVEL
      && now - lastSpeechAt >= silenceEndMs
      && now - speechStartedAt >= minSpeechMsBeforeSilenceEnd
    ) {
      hasSpeechInTurn = false;
      wasStreaming = false;
      speechStartedAt = 0;
      turnHandlers.onSilenceTurnEnd();
      return;
    }
    const resampled = resampleFloat32(input, inputContext.sampleRate, 16000);
    if (resampled.length === 0) {
      return;
    }
    socket.send(JSON.stringify({
      type: "audio",
      data: bytesToBase64(floatToPcm16Bytes(resampled)),
    }));
  };

  return {
    inputContext,
    stream,
    source,
    processor,
    silentGain,
  };
}

function stopAudioRuntime(runtime: LiveAudioRuntime | null) {
  if (!runtime) {
    return;
  }
  runtime.processor.onaudioprocess = null;
  runtime.source.disconnect();
  runtime.processor.disconnect();
  runtime.silentGain.disconnect();
  runtime.stream.getTracks().forEach((track) => track.stop());
  void runtime.inputContext.close().catch(() => undefined);
}

function stopOutputRuntime(runtime: LiveOutputRuntime | null) {
  if (!runtime) {
    return;
  }
  void runtime.outputContext.close().catch(() => undefined);
}

function getNoAnswerDelayMs(examinerText: string): number {
  return isPartTwoPreparationPrompt(examinerText) ? PART_TWO_PREP_NO_ANSWER_MS : NORMAL_NO_ANSWER_MS;
}

function buildNoAnswerExaminerPrompt(examinerText: string): string {
  if (isPartTwoPreparationPrompt(examinerText)) {
    return "The candidate's preparation time is over. Please ask the candidate to begin their long turn now.";
  }
  return "The candidate has not answered. In a realistic IELTS examiner style, briefly prompt them once or repeat the question, then continue the test if they still do not answer.";
}

function isPartTwoPreparationPrompt(value: string): boolean {
  return /part\s*2|cue card|one minute|prepare|preparation|pencil|paper|notes/i.test(value);
}

async function playPcmAudio(base64Audio: string, mimeType: string, runtimeRef: React.MutableRefObject<LiveOutputRuntime | null>) {
  const runtime = runtimeRef.current;
  if (!runtime || !base64Audio) {
    return;
  }
  const bytes = base64ToUint8Array(base64Audio);
  if (bytes.length < 2) {
    return;
  }
  if (runtime.outputContext.state === "suspended") {
    await runtime.outputContext.resume().catch(() => undefined);
  }
  const sampleRate = parseAudioSampleRate(mimeType);
  const sampleCount = Math.floor(bytes.length / 2);
  const audioBuffer = runtime.outputContext.createBuffer(1, sampleCount, sampleRate);
  const channel = audioBuffer.getChannelData(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < sampleCount; index += 1) {
    channel[index] = Math.max(-1, Math.min(1, view.getInt16(index * 2, true) / 32768));
  }
  const source = runtime.outputContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(runtime.outputContext.destination);
  const startAt = Math.max(runtime.outputContext.currentTime + 0.02, runtime.nextPlaybackAt);
  source.start(startAt);
  runtime.nextPlaybackAt = startAt + audioBuffer.duration;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(fallbackTimer);
      resolve();
    };
    source.onended = finish;
    // Fallback measured from when this chunk actually *ends* (it may be queued behind
    // earlier audio), not from now. A timeout fired from "now" could resolve while the
    // examiner is still speaking and prematurely open the candidate's turn.
    const remainingMs = Math.max(0, (startAt + audioBuffer.duration - runtime.outputContext.currentTime) * 1000);
    const fallbackTimer = window.setTimeout(finish, Math.ceil(remainingMs) + 250);
  });
}

function prefetchMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return;
  }
  void navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    })
    .catch(() => undefined);
}

function parseLiveMessage(data: unknown): Record<string, string | number | boolean | null> | null {
  if (typeof data !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(data) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, string | number | boolean | null> : null;
  } catch {
    return null;
  }
}

function getLiveMessageString(message: Record<string, string | number | boolean | null>, key: string): string {
  const value = message[key];
  return typeof value === "string" ? value : "";
}

function mergeTranscript(current: string, next: string): string {
  const cleanNext = next.trim();
  if (!cleanNext) {
    return current;
  }
  if (!current) {
    return cleanNext;
  }
  if (current.endsWith(cleanNext) || current.includes(cleanNext)) {
    return current;
  }
  return `${current} ${cleanNext}`.trim();
}

function compactLiveTranscript(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "";
  }
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
  if (sentences.length <= 2) {
    return sentences.join(" ");
  }
  return sentences.slice(-2).join(" ");
}

function calculateInputLevel(samples: Float32Array): number {
  let totalSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    totalSquares += samples[index] * samples[index];
  }
  return Math.min(1, Math.sqrt(totalSquares / Math.max(1, samples.length)) * 6);
}

function resampleFloat32(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) {
    return input;
  }
  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);
  if (ratio > 1) {
    // Downsampling (e.g. 48kHz -> 16kHz): average each window of input samples so
    // high-frequency content is low-passed instead of point-sampled. Plain decimation
    // aliases speech harmonics into the voice band and degrades transcription quality.
    for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
      const start = Math.floor(outputIndex * ratio);
      const end = Math.min(input.length, Math.floor((outputIndex + 1) * ratio));
      let sum = 0;
      let count = 0;
      for (let i = start; i < end; i += 1) {
        sum += input[i];
        count += 1;
      }
      output[outputIndex] = count > 0 ? sum / count : input[Math.min(input.length - 1, start)];
    }
    return output;
  }
  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const inputIndex = outputIndex * ratio;
    const leftIndex = Math.floor(inputIndex);
    const rightIndex = Math.min(input.length - 1, leftIndex + 1);
    const fraction = inputIndex - leftIndex;
    output[outputIndex] = input[leftIndex] + (input[rightIndex] - input[leftIndex]) * fraction;
  }
  return output;
}

function floatToPcm16Bytes(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToUint8Array(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function parseAudioSampleRate(mimeType: string): number {
  const match = /rate=(\d+)/i.exec(mimeType);
  return match ? Number(match[1]) || 24000 : 24000;
}

export function buildRepeatSpeakingHref(
  testId: string,
  entryMode: SpeakingEntryMode,
  aiMode: SpeakingAiMode,
  part: number,
  topics: string[],
  randomTopic: boolean,
): string {
  const params = new URLSearchParams({
    mode: entryMode,
    aiMode,
    part: String(part),
    testId,
    randomTopic: randomTopic ? "1" : "0",
  });
  topics.forEach((topic) => params.append("topics", topic));
  return `/speaking/microphone-check?${params.toString()}`;
}

function normalizeAiMode(value: string | null): SpeakingAiMode {
  if (value === "free_talk" || value === "uzbek_roast") {
    return value;
  }
  if (value === "practice") return "free_talk";
  if (value === "strict_roast") return "uzbek_roast";
  return "strict_exam";
}

export function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatBand(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

function liveStatusLabel(status: LiveStatus): string {
  if (status === "connecting") return "Connecting";
  if (status === "ready") return "Ready";
  if (status === "listening") return "Listening";
  if (status === "ai_speaking") return "AI speaking";
  if (status === "finalizing") return "Preparing feedback";
  if (status === "closed") return "Ended";
  if (status === "error") return "Error";
  return "Starting";
}

function buildDisplayBars(baseBars: readonly number[], inputLevel: number): number[] {
  const lift = Math.pow(Math.min(1, inputLevel * 1.4), 0.75);
  return baseBars.map((height, index) => {
    const pulse = 0.72 + ((index % 7) / 14);
    return Math.max(6, Math.round(height * (0.34 + lift * pulse)));
  });
}
