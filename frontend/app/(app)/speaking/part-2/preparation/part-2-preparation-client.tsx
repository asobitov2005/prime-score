"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Part2PreparationLoadingState, Part2PreparationView } from "@/components/speaking/part-2-preparation-view";
import { createApiClient, type SpeakingTopicItem } from "@/lib/api/client";
import {
  buildCueCardSpeechText,
  PART_2_PREP_SECONDS,
  readSpeakingPrepNotes,
  writeSpeakingPrepNotes,
} from "@/lib/speaking-preparation";
import {
  buildPart2SpeakingLiveHref,
  normalizeSpeakingEntryMode,
  parseSpeakingTopicLabels,
} from "@/lib/speaking-navigation";

const DEFAULT_CUE_CARD = {
  promptText: "Describe a useful object you use every day.",
  bulletPoints: [
    "what the object is",
    "how you use it",
    "why it is useful",
    "and explain how you feel about it.",
  ],
};

function resolveCueCard(topic: SpeakingTopicItem | null) {
  if (!topic) {
    return {
      promptText: DEFAULT_CUE_CARD.promptText,
      bulletPoints: DEFAULT_CUE_CARD.bulletPoints,
      topicTitle: "Describe a useful object you use every day",
    };
  }

  const bulletPoints = topic.bulletPoints.length > 0 ? topic.bulletPoints : DEFAULT_CUE_CARD.bulletPoints;
  return {
    promptText: topic.promptText || DEFAULT_CUE_CARD.promptText,
    bulletPoints,
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

export function Part2PreparationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useMemo(() => createApiClient(), []);
  const sessionId = searchParams.get("sessionId");
  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));
  const topics = useMemo(() => parseSpeakingTopicLabels(searchParams), [searchParams]);
  const [topic, setTopic] = useState<SpeakingTopicItem | null>(null);
  const [isLoadingTopic, setIsLoadingTopic] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const hasNavigatedRef = useRef(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setIsLoadingTopic(false);
      return;
    }
    setNotes(readSpeakingPrepNotes(sessionId));
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoadingTopic(true);
      setLoadError(null);
      try {
        const payload = await api.listSpeakingTopics(2);
        if (cancelled) {
          return;
        }
        setTopic(findSpeakingTopic(payload.items, topics));
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load the cue card.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTopic(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, topics]);

  const cueCard = useMemo(() => resolveCueCard(topic), [topic]);
  const liveHref = useMemo(() => buildPart2SpeakingLiveHref(searchParams), [searchParams]);

  const persistNotes = useCallback(
    (value: string) => {
      setNotes(value);
      if (sessionId) {
        writeSpeakingPrepNotes(sessionId, value);
      }
    },
    [sessionId],
  );

  const goToSpeaking = useCallback(() => {
    if (hasNavigatedRef.current) {
      return;
    }
    hasNavigatedRef.current = true;
    window.speechSynthesis.cancel();
    router.push(liveHref);
  }, [liveHref, router]);

  useEffect(() => {
    if (isLoadingTopic || !sessionId || entryMode !== "part_2") {
      return;
    }

    const timerId = window.setTimeout(() => {
      goToSpeaking();
    }, PART_2_PREP_SECONDS * 1000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [entryMode, goToSpeaking, isLoadingTopic, sessionId]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      speechRef.current = null;
    };
  }, []);

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

  const handleEndPractice = useCallback(async () => {
    if (!sessionId) {
      router.replace("/speaking");
      return;
    }
    window.speechSynthesis.cancel();
    try {
      await api.deleteSpeakingSession(sessionId);
    } catch {
      // Still leave the preparation flow if cleanup fails.
    }
    router.replace("/speaking");
  }, [api, router, sessionId]);

  if (!sessionId) {
    return (
      <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-6">
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
      <div className="rounded-[18px] border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This preparation page is only available for Part 2 practice.</span>
        </div>
      </div>
    );
  }

  if (isLoadingTopic) {
    return <Part2PreparationLoadingState />;
  }

  return (
    <div className="pb-2">
      {loadError ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : null}

      <Part2PreparationView
        cueCard={cueCard}
        notes={notes}
        onNotesChange={persistNotes}
        onListenAgain={handleListenAgain}
        onEndPractice={() => {
          void handleEndPractice();
        }}
      />
    </div>
  );
}
