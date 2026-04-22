"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "@/lib/api/client";
import type { DashboardAnalyticsResponse } from "@/lib/api/types";
import type { DashboardAnalytics, TestType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

export type DashboardAnalyticsFilter = "all" | TestType;

function mapAnalyticsResponse(response: DashboardAnalyticsResponse): DashboardAnalytics {
  return {
    performanceSummary: {
      studyTime: {
        totalTimeSec: response.performance_summary.study_time.total_time_sec,
        readingTimeSec: response.performance_summary.study_time.reading_time_sec,
        listeningTimeSec: response.performance_summary.study_time.listening_time_sec
      },
      reading: {
        fullCount: response.performance_summary.reading.full_count,
        section1Count: response.performance_summary.reading.section_1_count,
        section2Count: response.performance_summary.reading.section_2_count,
        section3Count: response.performance_summary.reading.section_3_count,
        section4Count: response.performance_summary.reading.section_4_count
      },
      listening: {
        fullCount: response.performance_summary.listening.full_count,
        section1Count: response.performance_summary.listening.section_1_count,
        section2Count: response.performance_summary.listening.section_2_count,
        section3Count: response.performance_summary.listening.section_3_count,
        section4Count: response.performance_summary.listening.section_4_count
      }
    },
    questionTypeAnalysis: response.question_type_analysis.map((item) => ({
      label: item.label,
      workedCount: item.worked_count,
      correctCount: item.correct_count,
      accuracy: item.accuracy,
      errorCount: item.error_count
    })),
    comparison: {
      previousTestTitle: response.comparison.previous_test_title ?? null,
      previousTestDate: response.comparison.previous_test_date ?? null,
      currentTestTitle: response.comparison.current_test_title ?? null,
      currentTestDate: response.comparison.current_test_date ?? null,
      tests: response.comparison.tests.map((test) => ({
        testTitle: test.test_title,
        testDate: test.test_date
      })),
      items: response.comparison.items.map((item) => ({
        label: item.label,
        previousAccuracy: item.previous_accuracy ?? null,
        currentAccuracy: item.current_accuracy ?? null,
        delta: item.delta ?? null,
        accuracies: item.accuracies ?? []
      }))
    },
    errorDistribution: response.error_distribution.map((item) => ({
      label: item.label,
      errorCount: item.error_count,
      share: item.share
    })),
    progressSeries: response.progress_series.map((item) => ({
      label: item.label,
      occurredAt: item.occurred_at,
      reading: item.reading ?? null,
      listening: item.listening ?? null
    }))
  };
}

function buildDebugHeaders(args: { userId: string; name: string; isPremium: boolean }): HeadersInit {
  const parts = args.name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "PrimeScore";
  const lastName = parts.slice(1).join(" ") || "User";

  return {
    "X-Debug-User-Id": args.userId,
    "X-Debug-First-Name": firstName,
    "X-Debug-Last-Name": lastName,
    "X-Debug-Username": firstName.toLowerCase(),
    "X-Debug-Role": "user",
    "X-Debug-Is-Premium": String(args.isPremium),
    "X-Debug-Show-On-Leaderboard": "true"
  };
}

export function getAverageBand(analytics: DashboardAnalytics, type: TestType): number | null {
  const values = analytics.progressSeries
    .map((point) => (type === "reading" ? point.reading : point.listening))
    .filter((value): value is number => value !== null && value !== undefined);

  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

export function useDashboardAnalytics(initialAnalytics: DashboardAnalytics, filter: DashboardAnalyticsFilter = "all") {
  const api = useMemo(() => createApiClient(), []);
  const { userId, name, isPremium } = useAuthStore();

  return useQuery({
    queryKey: ["dashboard-analytics", userId, name, isPremium, filter],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        return initialAnalytics;
      }

      const response = await api.getDashboardAnalytics(
        buildDebugHeaders({
          userId,
          name,
          isPremium
        }),
        filter === "all" ? undefined : filter
      );

      return mapAnalyticsResponse(response);
    },
    initialData: filter === "all" ? initialAnalytics : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000
  });
}
