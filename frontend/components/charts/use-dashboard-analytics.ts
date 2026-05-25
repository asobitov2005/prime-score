"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "@/lib/api/client";
import type { DashboardAnalyticsResponse } from "@/lib/api/types";
import type { DashboardAnalytics, TestType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

export type DashboardAnalyticsFilter = "all" | TestType;

export function roundToIeltsBand(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 9) {
    return 9;
  }

  const whole = Math.floor(value);
  const fraction = value - whole;
  if (fraction < 0.25) {
    return whole;
  }
  if (fraction < 0.75) {
    return whole + 0.5;
  }
  return Math.min(9, whole + 1);
}

function mapAnalyticsResponse(response: DashboardAnalyticsResponse): DashboardAnalytics {
  return {
    performanceSummary: {
      studyTime: {
        totalTimeSec: response.performance_summary.study_time.total_time_sec,
        readingTimeSec: response.performance_summary.study_time.reading_time_sec,
        listeningTimeSec: response.performance_summary.study_time.listening_time_sec,
        writingTimeSec: response.performance_summary.study_time.writing_time_sec
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
      },
      writing: response.performance_summary.writing ? {
        fullCount: response.performance_summary.writing.full_count,
        section1Count: response.performance_summary.writing.section_1_count,
        section2Count: response.performance_summary.writing.section_2_count,
        section3Count: response.performance_summary.writing.section_3_count,
        section4Count: response.performance_summary.writing.section_4_count
      } : undefined
    },
    writingCriteria: response.writing_criteria ? {
      taskAchievement: response.writing_criteria.task_achievement ?? null,
      coherenceCohesion: response.writing_criteria.coherence_cohesion ?? null,
      lexicalResource: response.writing_criteria.lexical_resource ?? null,
      grammaticalRangeAccuracy: response.writing_criteria.grammatical_range_accuracy ?? null,
    } : null,
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
      listening: item.listening ?? null,
      writing: item.writing ?? null
    })),
    accuracyTrend: (response.accuracy_trend ?? []).map((p) => ({
      date: p.date,
      accuracy: p.accuracy,
      band: p.band ?? null,
      testType: p.test_type ?? null,
    })),
    weeklyActivity: (response.weekly_activity ?? []).map((p) => ({
      weekLabel: p.week_label,
      attemptsCount: p.attempts_count,
      timeSpentMin: p.time_spent_min,
    })),
    scoreDistribution: {
      band1To3: response.score_distribution?.band_1_to_3 ?? 0,
      band3_5To5: response.score_distribution?.band_3_5_to_5 ?? 0,
      band5To6_5: response.score_distribution?.band_5_to_6_5 ?? 0,
      band6_5To7_5: response.score_distribution?.band_6_5_to_7_5 ?? 0,
      band7_5To9: response.score_distribution?.band_7_5_to_9 ?? 0,
    },
    personalBests: {
      bestBand: response.personal_bests?.best_band ?? null,
      bestAccuracy: response.personal_bests?.best_accuracy ?? null,
      longestStreak: response.personal_bests?.longest_streak ?? 0,
      currentStreak: response.personal_bests?.current_streak ?? 0,
      fastestFullTestSec: response.personal_bests?.fastest_full_test_sec ?? null,
    },
    speedMetrics: {
      avgTimePerQuestionSec: response.speed_metrics?.avg_time_per_question_sec ?? null,
      readingAvgSecPerQuestion: response.speed_metrics?.reading_avg_sec_per_question ?? null,
      listeningAvgSecPerQuestion: response.speed_metrics?.listening_avg_sec_per_question ?? null,
    },
    improvementRate: {
      last5AvgBand: response.improvement_rate?.last_5_avg_band ?? null,
      prev5AvgBand: response.improvement_rate?.prev_5_avg_band ?? null,
      delta: response.improvement_rate?.delta ?? null,
      percentChange: response.improvement_rate?.percent_change ?? null,
    },
  };
}

export function getAverageBand(analytics: DashboardAnalytics, type: TestType): number | null {
  const values = analytics.progressSeries
    .map((point) => (type === "reading" ? point.reading : type === "listening" ? point.listening : point.writing))
    .filter((value): value is number => value !== null && value !== undefined);

  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return roundToIeltsBand(total / values.length);
}

export function useDashboardAnalytics(
  initialAnalytics: DashboardAnalytics,
  filter: DashboardAnalyticsFilter = "all",
  enabled = true
) {
  const api = useMemo(() => createApiClient(), []);
  const { userId, accessToken } = useAuthStore();

  return useQuery({
    queryKey: ["dashboard-analytics", userId, filter],
    enabled: enabled && Boolean(userId && accessToken),
    queryFn: async () => {
      if (!userId || !accessToken) {
        return initialAnalytics;
      }

      const response = await api.getDashboardAnalytics(undefined, filter === "all" ? undefined : filter);

      return mapAnalyticsResponse(response);
    },
    initialData: filter === "all" ? initialAnalytics : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000
  });
}
