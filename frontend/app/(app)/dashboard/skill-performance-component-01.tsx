"use client";

import { AttemptRow, DashboardAnalytics, WritingHistoryItem } from "./skill-performance-dependencies";

export interface SkillPerformanceProps {
  analytics: DashboardAnalytics;
  attempts: AttemptRow[];
  writingHistory: {
    items: WritingHistoryItem[];
    total: number;
  };
}
