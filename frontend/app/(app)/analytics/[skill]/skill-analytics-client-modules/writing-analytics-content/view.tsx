"use client";
import type { WritingAnalyticsContentScope } from "./controller";
import { WritingAnalyticsContentView1 } from "./view-section-07";

export function WritingAnalyticsContentView({ scope }: { scope: WritingAnalyticsContentScope }) {
  return <WritingAnalyticsContentView1 scope={scope} />;
}
