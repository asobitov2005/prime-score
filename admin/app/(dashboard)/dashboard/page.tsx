import { loadDashboardPageData } from "./page-modules/loader";
import { DashboardPageView } from "./page-modules/view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const scope = await loadDashboardPageData(searchParams);
  return <DashboardPageView scope={scope} />;
}
