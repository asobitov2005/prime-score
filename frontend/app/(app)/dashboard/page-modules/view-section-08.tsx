import type { DashboardPageData } from "./loader";
import { SkillPerformance } from "./dependencies";

export function DashboardPageSection8({ scope }: { scope: DashboardPageData }) {
  const { analytics, attempts, writingHistory } = scope;
  return (
    <section className="[content-visibility:auto] [contain-intrinsic-size:420px]">
              <SkillPerformance
                analytics={analytics}
                attempts={attempts}
                writingHistory={writingHistory}
              />
            </section>
  );
}
