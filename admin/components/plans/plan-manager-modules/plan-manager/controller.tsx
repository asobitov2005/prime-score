"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function usePlanManagerController(props: PlanManagerProps) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type PlanManagerScope = ReturnType<typeof usePlanManagerController>;
