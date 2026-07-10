"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import type { Part3Scope } from "./controller-part-03";
import { useEffect } from "../dependencies";

export function useControllerPart4(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope) {
  const { result, releaseAudioRuntime } = scope;
  useEffect(() => {
      if (result && result.status !== "live") {
        releaseAudioRuntime();
      }
    }, [releaseAudioRuntime, result]);

  return {  };
}

export type Part4Scope = ReturnType<typeof useControllerPart4>;
