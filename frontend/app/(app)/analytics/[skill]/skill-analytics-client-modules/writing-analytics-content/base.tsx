"use client";
import type { DashboardAnalytics } from "../dependencies";

export function useBaseScope(props: { analytics: DashboardAnalytics }) {
  const { analytics } = props;
    return { analytics };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
