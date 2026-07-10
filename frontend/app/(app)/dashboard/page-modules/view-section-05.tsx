import type { DashboardPageData } from "./loader";
import { OverallBandKpiCard, XpSummaryCard } from "./dependencies";
import { LeaderboardPreviewCard } from "./shared";

export function DashboardPageSection5({ scope }: { scope: DashboardPageData }) {
  const { xpSummary, analytics, leaderboardPreview } = scope;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_340px_210px] xl:items-stretch">
              <XpSummaryCard summary={xpSummary} />
              <OverallBandKpiCard initialAnalytics={analytics} />
              <LeaderboardPreviewCard summary={leaderboardPreview} />
            </div>
  );
}
