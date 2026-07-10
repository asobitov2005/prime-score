"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useWritingAnalyticsContentController(props: { analytics: DashboardAnalytics }) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type WritingAnalyticsContentScope = ReturnType<typeof useWritingAnalyticsContentController>;
