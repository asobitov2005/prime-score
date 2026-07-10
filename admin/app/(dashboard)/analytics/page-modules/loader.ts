import { getAdminAnalyticsReport } from "./dependencies";

export async function loadAnalyticsPageData({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const report = await getAdminAnalyticsReport(searchParams);
  return { searchParams, report };
}

export type AnalyticsPageData = Awaited<ReturnType<typeof loadAnalyticsPageData>>;
