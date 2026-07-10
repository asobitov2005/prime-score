import { loadAnalyticsPageData } from "./page-modules/loader";
import { AnalyticsPageView } from "./page-modules/view";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const scope = await loadAnalyticsPageData(searchParams);
  return <AnalyticsPageView scope={scope} />;
}
