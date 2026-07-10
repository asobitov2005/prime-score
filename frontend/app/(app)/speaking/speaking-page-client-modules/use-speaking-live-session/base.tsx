"use client";
import type { SpeakingAiMode, SpeakingEntryMode } from "../dependencies";

export function useBaseScope(props: {
  sessionId: string | null;
  entryMode: SpeakingEntryMode;
  aiMode: SpeakingAiMode;
  part: number;
  topics: string[];
  randomTopic: boolean;
  prepComplete?: boolean;
}) {
  const {
    sessionId,
    entryMode,
    aiMode,
    part,
    topics,
    randomTopic,
    prepComplete = false,
  } = props;
    return { sessionId, entryMode, aiMode, part, topics, randomTopic, prepComplete };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
