"use client";

import { ClipboardCheck, Flame, Loader2, LucideIcon, MessageCircle, MessagesSquare, Mic2, Sora, SpeakingAiMode, SpeakingEntryMode, SpeakingTestListItem, SpeakingTopicItem, Star, StickyNote, User, createApiClient, normalizeSpeakingEntryMode, useEffect, useMemo, useRouter, useSearchParams, useState } from "./dependencies";

import { LiveSpeakingMockPage, SpeakingLaunchPanel } from "./shared-part-02";



export const display = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export type LiveStatus = "idle" | "connecting" | "ready" | "listening" | "ai_speaking" | "finalizing" | "closed" | "error";

export type SpeakingModeAccent = "purple" | "green" | "orange" | "blue";

export type SpeakingModeCardConfig = {
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

export const accentStyles: Record<
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

export const modeCards: readonly SpeakingModeCardConfig[] = [
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

export const aiWaveformBars = [
  8, 14, 10, 22, 32, 18, 42, 56, 30, 16, 44, 64, 38, 22, 54, 34, 14, 28, 46, 20,
  12, 36, 58, 42, 18, 50, 66, 32, 16, 40, 26, 10, 20, 34, 14, 8,
] as const;

export const userWaveformBars = [
  10, 18, 30, 16, 42, 58, 34, 22, 50, 70, 44, 18, 36, 62, 48, 24, 56, 74, 40, 20,
  46, 66, 52, 28, 60, 38, 16, 34, 54, 30, 12, 24,
] as const;

export const SPEECH_LEVEL_THRESHOLD = 0.018;

export const SPEECH_SILENCE_LEVEL = 0.014;

export const SPEECH_END_SILENCE_MS = 2800;

export const MIN_SPEECH_MS_BEFORE_SILENCE_END = 700;

export const ROAST_SPEECH_END_SILENCE_MS = 4500;

export const NORMAL_NO_ANSWER_MS = 12000;

export const PART_TWO_PREP_NO_ANSWER_MS = 65000;

export const PART_TWO_PREP_COMPLETE_NO_ANSWER_MS = 3000;

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

export function SpeakingHomePage() {
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
