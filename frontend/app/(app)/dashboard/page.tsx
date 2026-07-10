import { loadDashboardPageData } from "./page-modules/loader";
import { DashboardPageView } from "./page-modules/view";

export default async function DashboardPage() {
  const scope = await loadDashboardPageData();
  return <DashboardPageView scope={scope} />;
}
