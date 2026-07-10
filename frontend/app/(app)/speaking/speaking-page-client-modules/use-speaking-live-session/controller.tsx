"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";
import { useControllerPart2 } from "./controller-part-02";
import { useControllerPart3 } from "./controller-part-03";
import { useControllerPart4 } from "./controller-part-04";

export function useuseSpeakingLiveSessionController(props: {
  sessionId: string | null;
  entryMode: SpeakingEntryMode;
  aiMode: SpeakingAiMode;
  part: number;
  topics: string[];
  randomTopic: boolean;
  prepComplete?: boolean;
}) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  scope = { ...scope, ...useControllerPart2(scope) };
  scope = { ...scope, ...useControllerPart3(scope) };
  scope = { ...scope, ...useControllerPart4(scope) };
  return scope;
}

export type useSpeakingLiveSessionScope = ReturnType<typeof useuseSpeakingLiveSessionController>;
