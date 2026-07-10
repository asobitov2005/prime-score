"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useSpeakingTopicPickerClientController() {
  let scope = useBaseScope();
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type SpeakingTopicPickerClientScope = ReturnType<typeof useSpeakingTopicPickerClientController>;
