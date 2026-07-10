"use client";
import type { DashboardAnalytics } from "../dependencies";

export function useBaseScope(props: { variant: "reading" | "listening"; analytics: DashboardAnalytics }) {
  const { variant, analytics } = props;
    return { variant, analytics };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
