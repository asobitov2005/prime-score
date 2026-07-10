"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useReadingAttemptWorkspaceController(props: ReadingAttemptWorkspaceProps) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type ReadingAttemptWorkspaceScope = ReturnType<typeof useReadingAttemptWorkspaceController>;
