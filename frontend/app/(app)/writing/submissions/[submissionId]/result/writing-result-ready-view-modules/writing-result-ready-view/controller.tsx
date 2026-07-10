"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useWritingResultReadyViewController(props: { scope: WritingResultReadyScope }) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type WritingResultReadyViewScope = ReturnType<typeof useWritingResultReadyViewController>;
