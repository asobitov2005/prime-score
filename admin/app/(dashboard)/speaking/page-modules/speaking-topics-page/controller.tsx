"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useSpeakingTopicsPageController() {
  let scope = useBaseScope();
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type SpeakingTopicsPageScope = ReturnType<typeof useSpeakingTopicsPageController>;
