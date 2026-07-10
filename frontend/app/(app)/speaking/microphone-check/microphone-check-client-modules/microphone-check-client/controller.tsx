"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";
import { useControllerPart2 } from "./controller-part-02";

export function useMicrophoneCheckClientController() {
  let scope = useBaseScope();
  scope = { ...scope, ...useControllerPart1(scope) };
  scope = { ...scope, ...useControllerPart2(scope) };
  return scope;
}

export type MicrophoneCheckClientScope = ReturnType<typeof useMicrophoneCheckClientController>;
