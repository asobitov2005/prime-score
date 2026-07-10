"use client";
import type { DashboardAnalytics } from "../dependencies";
import { useWritingAnalyticsContentController } from "./controller";
import { WritingAnalyticsContentView } from "./view";

export function WritingAnalyticsContent(props: { analytics: DashboardAnalytics }) {
  const scope = useWritingAnalyticsContentController(props);
  return <WritingAnalyticsContentView scope={scope} />;
}
