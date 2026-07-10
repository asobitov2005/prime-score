import type { DashboardPageData } from "./loader";
import { DashboardPageSection1 } from "./view-section-12";

export function DashboardPageView({ scope }: { scope: DashboardPageData }) {
  return <DashboardPageSection1 scope={scope} />;
}
