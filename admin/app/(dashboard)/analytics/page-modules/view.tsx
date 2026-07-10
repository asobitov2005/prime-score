import type { AnalyticsPageData } from "./loader";
import { AnalyticsPageSection1 } from "./view-section-13";

export function AnalyticsPageView({ scope }: { scope: AnalyticsPageData }) {
  return <AnalyticsPageSection1 scope={scope} />;
}
