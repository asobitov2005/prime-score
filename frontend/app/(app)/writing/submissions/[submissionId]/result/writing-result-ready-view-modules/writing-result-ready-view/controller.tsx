"use client";

import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useWritingResultReadyViewController(
  props: Parameters<typeof useBaseScope>[0],
) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type WritingResultReadyViewScope = ReturnType<
  typeof useWritingResultReadyViewController
>;
