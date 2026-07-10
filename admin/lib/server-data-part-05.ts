import { AdminAnalyticsPoint } from "./server-data-dependencies";
import { requestAdmin } from "./server-data-part-02";
import { getAdminAuditEntries } from "./server-data-part-04";

export async function getAdminActivityFeed(): Promise<string[]> {
  const entries = await getAdminAuditEntries();
  return entries.slice(0, 4).map((entry) => `${entry.action} • ${entry.resource}`);
}

export async function getAdminAnalyticsPoints(params?: Record<string, string>): Promise<AdminAnalyticsPoint[]> {
  const report = await getAdminAnalyticsReport(params);
  return report.activityPoints;
}

export interface AdminAnalyticsReport {
  dau: number;
  wau: number;
  mau: number;
  conversionRate: string;
  churnRate: string;
  activityPoints: AdminAnalyticsPoint[];
  topTests: { title: string; count: number }[];
  hardestTypes: { type: string; errorRate: string }[];
  dauTrend: { date: string; value: number }[];
  completionFunnel: { started: number; completed: number; rate: number } | null;
  avgScoreByTest: { testTitle: string; avgBand: number; attemptCount: number }[];
  hourlyDistribution: { label: string; value: number }[];
  userSegmentation: { free: { count: number; avgAttempts: number }; premium: { count: number; avgAttempts: number } } | null;
  weekdayActivity: { label: string; value: number }[];
}

export async function getAdminAnalyticsReport(params?: Record<string, string>): Promise<AdminAnalyticsReport> {
  try {
    const qs = params ? new URLSearchParams(params).toString() : "";
    const endpoint = qs ? `/analytics?${qs}` : "/analytics";
    const report = await requestAdmin<{
      dau: number;
      wau: number;
      mau: number;
      conversion_rate: string;
      churn_rate: string;
      activity_points: Array<{ label: string; value: number }>;
      top_tests: Array<{ title: string; count: number }>;
      hardest_question_types: Array<{ type: string; error_rate: string }>;
      dau_trend?: Array<{ date: string; value: number }>;
      completion_funnel?: { started: number; completed: number; rate: number } | null;
      avg_score_by_test?: Array<{ test_title: string; avg_band: number; attempt_count: number }>;
      hourly_distribution?: Array<{ label: string; value: number }>;
      user_segmentation?: { free: { count: number; avg_attempts: number }; premium: { count: number; avg_attempts: number } } | null;
      weekday_activity?: Array<{ label: string; value: number }>;
    }>("/analytics");
    return {
      dau: report.dau,
      wau: report.wau,
      mau: report.mau,
      conversionRate: report.conversion_rate,
      churnRate: report.churn_rate,
      activityPoints: report.activity_points.map((point) => ({ label: point.label, value: point.value })),
      topTests: report.top_tests.map((item) => ({ title: item.title, count: item.count })),
      hardestTypes: report.hardest_question_types.map((item) => ({ type: item.type, errorRate: item.error_rate })),
      dauTrend: (report.dau_trend ?? []).map(p => ({ date: p.date, value: p.value })),
      completionFunnel: report.completion_funnel ? { started: report.completion_funnel.started, completed: report.completion_funnel.completed, rate: report.completion_funnel.rate } : null,
      avgScoreByTest: (report.avg_score_by_test ?? []).map(t => ({ testTitle: t.test_title, avgBand: t.avg_band, attemptCount: t.attempt_count })),
      hourlyDistribution: (report.hourly_distribution ?? []).map(h => ({ label: h.label, value: h.value })),
      userSegmentation: report.user_segmentation ? { free: { count: report.user_segmentation.free.count, avgAttempts: report.user_segmentation.free.avg_attempts }, premium: { count: report.user_segmentation.premium.count, avgAttempts: report.user_segmentation.premium.avg_attempts } } : null,
      weekdayActivity: (report.weekday_activity ?? []).map(w => ({ label: w.label, value: w.value })),
    };
  } catch {
    return {
      dau: 0,
      wau: 0,
      mau: 0,
      conversionRate: "0%",
      churnRate: "0%",
      activityPoints: [
        { label: "Mon", value: 0 },
        { label: "Tue", value: 0 },
        { label: "Wed", value: 0 },
        { label: "Thu", value: 0 },
        { label: "Fri", value: 0 },
        { label: "Sat", value: 0 },
        { label: "Sun", value: 0 }
      ],
      topTests: [],
      hardestTypes: [],
      dauTrend: [],
      completionFunnel: null,
      avgScoreByTest: [],
      hourlyDistribution: [],
      userSegmentation: null,
      weekdayActivity: [],
    };
  }
}
