"use client";

import { AttemptRow, DashboardAnalytics, XpSummary } from "./overview-client-dependencies";

export type Props = {
  overall: DashboardAnalytics;
  reading: DashboardAnalytics;
  listening: DashboardAnalytics;
  writing: DashboardAnalytics;
  speaking: DashboardAnalytics;
  attempts: AttemptRow[];
  xpSummary: XpSummary;
};
