"use client";

import { DashboardAnalytics } from "./overview-client-dependencies";

export function skillAccuracy(analytics: DashboardAnalytics) {
  const practiced = analytics.questionTypeAnalysis.filter((item) => item.workedCount > 0);
  const worked = practiced.reduce((sum, item) => sum + item.workedCount, 0);
  const correct = practiced.reduce((sum, item) => sum + item.correctCount, 0);
  return worked > 0 ? (correct / worked) * 100 : null;
}
