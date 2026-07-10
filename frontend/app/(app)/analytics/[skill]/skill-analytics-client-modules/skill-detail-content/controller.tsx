"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useSkillDetailContentController(props: { variant: "reading" | "listening"; analytics: DashboardAnalytics }) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type SkillDetailContentScope = ReturnType<typeof useSkillDetailContentController>;
