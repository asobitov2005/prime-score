"use client";

import { PART_2_PREP_SECONDS, Part2CueCard, Part2ViewPhase, SpeakingTopicItem, shouldShowPart2CueCard, useCallback, useEffect, useRef, useState } from "./part-2-live-client-dependencies";

export const SPEAKING_RESULT_VIEWPORT =
  "max-h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-3rem)] overflow-y-auto overscroll-contain pr-1";

export type SpeakingAiMode = "strict_exam" | "free_talk" | "uzbek_roast";

export const DEFAULT_CUE_CARD: Part2CueCard = {
  promptText: "Describe a useful object you use every day.",
  bulletPoints: [
    "what the object is",
    "how you use it",
    "why it is useful",
    "and explain how you feel about it.",
  ],
  topicTitle: "Describe a useful object you use every day",
};

export function normalizeAiMode(value: string | null): SpeakingAiMode {
  if (value === "free_talk" || value === "uzbek_roast") {
    return value;
  }
  if (value === "practice") return "free_talk";
  if (value === "strict_roast") return "uzbek_roast";
  return "strict_exam";
}

export function resolveCueCard(topic: SpeakingTopicItem | null): Part2CueCard {
  if (!topic) {
    return DEFAULT_CUE_CARD;
  }

  return {
    promptText: topic.promptText || DEFAULT_CUE_CARD.promptText,
    bulletPoints: topic.bulletPoints.length > 0 ? topic.bulletPoints : DEFAULT_CUE_CARD.bulletPoints,
    topicTitle: topic.topicTitle,
  };
}

export function findSpeakingTopic(items: SpeakingTopicItem[], labels: string[]): SpeakingTopicItem | null {
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

export function usePart2ViewPhase(
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
