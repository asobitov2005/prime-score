"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  buildRepeatSpeakingHref,
  useSpeakingLiveSession,
} from "@/app/(app)/speaking/speaking-page-client";
import { Part2LiveLoadingState, Part2LiveView } from "@/components/speaking/part-2-live-view";
import { SpeakingResultSummary } from "@/components/speaking/speaking-result-summary";
import { createApiClient, type SpeakingTopicItem } from "@/lib/api/client";
import {
  shouldShowPart2CueCard,
  type Part2ViewPhase,
} from "@/lib/speaking-part-2-phases";
import {
  buildCueCardSpeechText,
  PART_2_PREP_SECONDS,
  readSpeakingPrepNotes,
  writeSpeakingPrepNotes,
  type Part2CueCard,
} from "@/lib/speaking-preparation";
import { normalizeSpeakingEntryMode, parseSpeakingTopicLabels } from "@/lib/speaking-navigation";
import { resolveSpeakingQuestionsAnswered } from "@/lib/speaking-result-utils";

const SPEAKING_RESULT_VIEWPORT =
  "max-h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-3rem)] overflow-y-auto overscroll-contain pr-1";

type SpeakingAiMode = "strict_exam" | "free_talk" | "uzbek_roast";

const DEFAULT_CUE_CARD: Part2CueCard = {
  promptText: "Describe a useful object you use every day.",
  bulletPoints: [
    "what the object is",
    "how you use it",
    "why it is useful",
    "and explain how you feel about it.",
  ],
  topicTitle: "Describe a useful object you use every day",
};

function normalizeAiMode(value: string | null): SpeakingAiMode {
  if (value === "free_talk" || value === "uzbek_roast") {
    return value;
  }
  if (value === "practice") return "free_talk";
  if (value === "strict_roast") return "uzbek_roast";
  return "strict_exam";
}

function resolveCueCard(topic: SpeakingTopicItem | null): Part2CueCard {
  if (!topic) {
    return DEFAULT_CUE_CARD;
  }

  return {
    promptText: topic.promptText || DEFAULT_CUE_CARD.promptText,
    bulletPoints: topic.bulletPoints.length > 0 ? topic.bulletPoints : DEFAULT_CUE_CARD.bulletPoints,
    topicTitle: topic.topicTitle,
  };
}

function findSpeakingTopic(items: SpeakingTopicItem[], labels: string[]): SpeakingTopicItem | null {
  if (items.length === 0) {
    return null;
  }
  const normalizedLabels = labels.map((label) => label.trim().toLowerCase()).filter(Boolean);
  if (normalizedLabels.length === 0) {
    return items[0] ?? null;
  }
  return (
    items.find((item) => normalizedLabels.includes(item.topicTitle.trim().toLowerCase()))
    ?? items.find((item) => normalizedLabels.some((label) => item.topicTitle.toLowerCase().includes(label)))
    ?? items[0]
    ?? null
  );
}

function usePart2ViewPhase(
  examinerTranscript: string,
  isInterviewStarted: boolean,
  cueCard: Part2CueCard,
): Part2ViewPhase {
  const [phase, setPhase] = useState<Part2ViewPhase>("examiner");
  const prepStartedAtRef = useRef<number | null>(null);
  const prepEndedRef = useRef(false);
  const phaseRef = useRef<Part2ViewPhase>("examiner");
  phaseRef.current = phase;

  const enterPreparation = useCallback(() => {
    if (prepEndedRef.current || phaseRef.current !== "examiner") {
      return;
    }
    prepStartedAtRef.current = Date.now();
    setPhase("preparation");
  }, []);

  const enterSpeaking = useCallback(() => {
    if (prepEndedRef.current) {
      return;
    }
    prepEndedRef.current = true;
    setPhase("speaking");
  }, []);

  useEffect(() => {
    if (!isInterviewStarted || prepEndedRef.current || phaseRef.current !== "examiner") {
      return;
    }
    if (shouldShowPart2CueCard(examinerTranscript, cueCard)) {
      enterPreparation();
    }
  }, [cueCard, enterPreparation, examinerTranscript, isInterviewStarted]);

  useEffect(() => {
    if (!isInterviewStarted || prepEndedRef.current) {
      return;
    }

    const timerId = window.setTimeout(() => {
      if (phaseRef.current === "examiner" && !prepEndedRef.current) {
        enterPreparation();
      }
    }, 25000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [enterPreparation, isInterviewStarted]);

  useEffect(() => {
    if (phase !== "preparation" || prepEndedRef.current) {
      return;
    }

    const startedAt = prepStartedAtRef.current ?? Date.now();
    prepStartedAtRef.current = startedAt;
    const remainingMs = PART_2_PREP_SECONDS * 1000 - (Date.now() - startedAt);
    const timerId = window.setTimeout(() => {
      enterSpeaking();
    }, Math.max(0, remainingMs));

    return () => {
      window.clearTimeout(timerId);
    };
  }, [enterSpeaking, phase]);

  return phase;
}

export function Part2LiveClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));
  const aiMode = normalizeAiMode(searchParams.get("aiMode"));
  const topics = useMemo(() => parseSpeakingTopicLabels(searchParams), [searchParams]);
  const topicLabel = topics[0] ?? searchParams.get("topic") ?? "Selected topic";
  const randomTopic = searchParams.get("randomTopic") !== "0";
  const api = useMemo(() => createApiClient(), []);
  const [connectionOnline, setConnectionOnline] = useState(true);
  const [topic, setTopic] = useState<SpeakingTopicItem | null>(null);
  const [notes, setNotes] = useState("");
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const live = useSpeakingLiveSession({
    sessionId,
    entryMode,
    aiMode,
    part: 2,
    topics,
    randomTopic,
  });

  const cueCard = useMemo(() => resolveCueCard(topic), [topic]);

  const viewPhase = usePart2ViewPhase(
    live.examinerTranscript,
    live.isInterviewStarted,
    cueCard,
  );

  useEffect(() => {
    setConnectionOnline(navigator.onLine);
    const handleOnline = () => setConnectionOnline(true);
    const handleOffline = () => setConnectionOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    setNotes(readSpeakingPrepNotes(sessionId));
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await api.listSpeakingTopics(2);
        if (!cancelled) {
          setTopic(findSpeakingTopic(payload.items, topics));
        }
      } catch {
        // Cue card fallback is handled in resolveCueCard.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, topics]);

  useEffect(() => {
    if (live.result) {
      document.documentElement.classList.remove("primescore-scroll-lock");
      return;
    }

    document.documentElement.classList.add("primescore-scroll-lock");

    return () => {
      document.documentElement.classList.remove("primescore-scroll-lock");
    };
  }, [live.result]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      speechRef.current = null;
    };
  }, []);

  const persistNotes = useCallback(
    (value: string) => {
      setNotes(value);
      if (sessionId) {
        writeSpeakingPrepNotes(sessionId, value);
      }
    },
    [sessionId],
  );

  const handleListenAgain = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(buildCueCardSpeechText(cueCard));
    utterance.rate = 0.95;
    utterance.pitch = 1;
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [cueCard]);

  const repeatHref = live.result
    ? buildRepeatSpeakingHref(live.result.speakingTestId, live.result.entryMode, aiMode, 2, topics, randomTopic)
    : "/speaking";

  const handleEndTest = useCallback(() => {
    if (live.isDeletingSession || live.status === "finalizing") {
      return;
    }
    live.stop();
  }, [live]);

  if (!sessionId) {
    return (
      <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-semibold text-amber-950">Speaking session is not ready</h1>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Start from the microphone check page so PrimeScore can create a backend AI session first.
        </p>
        <Link
          href="/speaking"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#7C3AED] px-4 text-sm font-semibold text-white"
        >
          Back to Speaking
        </Link>
      </div>
    );
  }

  if (entryMode !== "part_2") {
    return (
      <div className="rounded-[20px] border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This live page is only available for Part 2 practice.</span>
        </div>
      </div>
    );
  }

  if (live.result) {
    return (
      <div className={cn("w-full", SPEAKING_RESULT_VIEWPORT)}>
        <SpeakingResultSummary
          result={live.result}
          repeatHref={repeatHref}
          part={2}
          topics={topics}
          questionCount={resolveSpeakingQuestionsAnswered(live.result)}
        />
      </div>
    );
  }

  if (!live.isInterviewStarted) {
    return <Part2LiveLoadingState />;
  }

  return (
    <div className="flex min-h-0 max-h-[calc(100dvh-3.5rem)] flex-col overflow-hidden overscroll-none lg:h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)] lg:max-h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)]">
      <Part2LiveView
        live={live}
        cueCard={cueCard}
        viewPhase={viewPhase}
        notes={notes}
        topicLabel={topicLabel}
        connectionOnline={connectionOnline}
        onNotesChange={persistNotes}
        onListenAgain={handleListenAgain}
        onEndTest={handleEndTest}
        endDisabled={live.isDeletingSession || live.status === "finalizing" || live.status === "closed"}
      />
    </div>
  );
}
