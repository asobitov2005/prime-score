import { getDashboardAnalytics, getSubmittedAttempts, getXpSummary } from "@/lib/server-me";
import AnalyticsOverviewClient from "./overview-client";

export default async function AnalyticsOverviewPage() {
  const [overall, reading, listening, writing, speaking, attempts, xpSummary] = await Promise.all([
    getDashboardAnalytics(),
    getDashboardAnalytics("reading"),
    getDashboardAnalytics("listening"),
    getDashboardAnalytics("writing"),
    getDashboardAnalytics("speaking"),
    getSubmittedAttempts(),
    getXpSummary(),
  ]);

  return (
    <AnalyticsOverviewClient
      overall={overall}
      reading={reading}
      listening={listening}
      writing={writing}
      speaking={speaking}
      attempts={attempts}
      xpSummary={xpSummary}
    />
  );
}
