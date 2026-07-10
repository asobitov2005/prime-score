"use client";
import type { SpeakingAiMode, SpeakingEntryMode } from "../dependencies";
import { useuseSpeakingLiveSessionController } from "./controller";
import { finishuseSpeakingLiveSession } from "./result";

export function useSpeakingLiveSession(props: {
  sessionId: string | null;
  entryMode: SpeakingEntryMode;
  aiMode: SpeakingAiMode;
  part: number;
  topics: string[];
  randomTopic: boolean;
  prepComplete?: boolean;
}) {
  const scope = useuseSpeakingLiveSessionController(props);
  return finishuseSpeakingLiveSession(scope);
}
