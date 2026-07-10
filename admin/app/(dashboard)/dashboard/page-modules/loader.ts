import { getAdminDashboardOverview } from "./dependencies";

export async function loadDashboardPageData({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const metrics = await getAdminDashboardOverview(searchParams);
  const hasActivity = metrics.recentActivity.length > 0;
  return { searchParams, metrics, hasActivity };
}

export type DashboardPageData = Awaited<ReturnType<typeof loadDashboardPageData>>;
