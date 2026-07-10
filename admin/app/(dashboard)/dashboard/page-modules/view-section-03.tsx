import type { DashboardPageData } from "./loader";
import { BarChart3, Link, SectionHeader, buttonClassName } from "./dependencies";

export function DashboardPageSection3({ scope }: { scope: DashboardPageData }) {
  return (
    <SectionHeader
            eyebrow="Command Center"
            title="Platform Metrics"
            description="Live operational numbers from the production database. Empty database states stay zero."
            actions={
              <Link href="/analytics" className={buttonClassName({ variant: "solid", size: "sm" })}>
                <BarChart3 className="h-4 w-4" />
                Open Analytics
              </Link>
            }
          />
  );
}
