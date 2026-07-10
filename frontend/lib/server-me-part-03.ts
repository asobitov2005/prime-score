import { DashboardBandProgressPoint, DashboardErrorDistributionItem, DashboardPerformanceSummary, DashboardQuestionTypeComparison, DashboardQuestionTypeComparisonItem, DashboardSectionAnalysisItem, DashboardSkillFocusItem, DashboardSkillTimeAnalysis, DashboardStat, formatIeltsBand, roundIeltsBand } from "./server-me-dependencies";
import { BackendBandProgressPoint, BackendErrorDistributionItem, BackendMeStats, BackendPerformanceSummary, BackendQuestionTypeComparison } from "./server-me-part-01";
import { BackendSectionAnalysisItem, BackendSkillFocusItem, BackendSkillTimeAnalysis, requestBackend } from "./server-me-part-02";

export function mapComparison(
  comparison: BackendQuestionTypeComparison
): DashboardQuestionTypeComparison {
  return {
    previousTestTitle: comparison.previous_test_title ?? null,
    previousTestDate: comparison.previous_test_date ?? null,
    currentTestTitle: comparison.current_test_title ?? null,
    currentTestDate: comparison.current_test_date ?? null,
    tests: comparison.tests.map((test) => ({
      testTitle: test.test_title,
      testDate: test.test_date
    })),
    items: comparison.items.map<DashboardQuestionTypeComparisonItem>((item) => ({
      label: item.label,
      previousAccuracy: item.previous_accuracy ?? null,
      currentAccuracy: item.current_accuracy ?? null,
      delta: item.delta ?? null,
      accuracies: item.accuracies ?? [],
      currentWorkedCount: item.current_worked_count ?? 0,
      currentErrorCount: item.current_error_count ?? 0,
    }))
  };
}

export function mapErrorDistribution(
  items: BackendErrorDistributionItem[]
): DashboardErrorDistributionItem[] {
  return items.map((item) => ({
    label: item.label,
    errorCount: item.error_count,
    share: item.share
  }));
}

export function mapProgressSeries(
  items: BackendBandProgressPoint[]
): DashboardBandProgressPoint[] {
  return items.map((item) => ({
    label: item.label,
    occurredAt: item.occurred_at,
    reading: roundIeltsBand(item.reading),
    listening: roundIeltsBand(item.listening),
    writing: roundIeltsBand(item.writing),
    speaking: roundIeltsBand(item.speaking)
  }));
}

export function mapPerformanceSummary(
  summary: BackendPerformanceSummary
): DashboardPerformanceSummary {
  return {
    studyTime: {
      totalTimeSec: summary.study_time.total_time_sec,
      readingTimeSec: summary.study_time.reading_time_sec,
      listeningTimeSec: summary.study_time.listening_time_sec,
      writingTimeSec: summary.study_time.writing_time_sec ?? 0,
      speakingTimeSec: summary.study_time.speaking_time_sec ?? 0
    },
    reading: {
      fullCount: summary.reading.full_count,
      section1Count: summary.reading.section_1_count,
      section2Count: summary.reading.section_2_count,
      section3Count: summary.reading.section_3_count,
      section4Count: summary.reading.section_4_count
    },
    listening: {
      fullCount: summary.listening.full_count,
      section1Count: summary.listening.section_1_count,
      section2Count: summary.listening.section_2_count,
      section3Count: summary.listening.section_3_count,
      section4Count: summary.listening.section_4_count
    },
    writing: summary.writing ? {
      fullCount: summary.writing.full_count,
      section1Count: summary.writing.section_1_count,
      section2Count: summary.writing.section_2_count,
      section3Count: summary.writing.section_3_count,
      section4Count: summary.writing.section_4_count
    } : undefined,
    speaking: summary.speaking ? {
      fullCount: summary.speaking.full_count,
      section1Count: summary.speaking.section_1_count,
      section2Count: summary.speaking.section_2_count,
      section3Count: summary.speaking.section_3_count,
      section4Count: summary.speaking.section_4_count
    } : undefined
  };
}

export function mapSectionAnalysisItem(item: BackendSectionAnalysisItem): DashboardSectionAnalysisItem {
  return {
    sectionNumber: item.section_number,
    label: item.label,
    workedCount: item.worked_count,
    correctCount: item.correct_count,
    accuracy: item.accuracy,
    attemptsCount: item.attempts_count,
    avgTimeSec: item.avg_time_sec ?? null,
  };
}

export function mapSkillFocusItem(item: BackendSkillFocusItem): DashboardSkillFocusItem {
  return {
    key: item.key,
    label: item.label,
    value: item.value ?? null,
    valueLabel: item.value_label,
    subtext: item.subtext ?? null,
    status: item.status ?? null,
  };
}

export function mapSkillTimeAnalysis(item: BackendSkillTimeAnalysis | null | undefined): DashboardSkillTimeAnalysis {
  return {
    avgTimePerTestSec: item?.avg_time_per_test_sec ?? null,
    recommendedTimeSec: item?.recommended_time_sec ?? null,
    timeManagementStatus: item?.time_management_status ?? "No timing data",
    slowestSection: item?.slowest_section ? mapSectionAnalysisItem(item.slowest_section) : null,
    fastestSection: item?.fastest_section ? mapSectionAnalysisItem(item.fastest_section) : null,
    unansweredAvgPercent: item?.unanswered_avg_percent ?? null,
  };
}

export async function getDashboardStats(): Promise<DashboardStat[]> {
  try {
    const stats = await requestBackend<BackendMeStats>("/me/stats");
    return [
      {
        label: "Attempts",
        value: String(stats.attempts_total),
        detail: "All recorded Reading and Listening attempts."
      },
      {
        label: "Average band",
        value: formatIeltsBand(stats.average_band, "N/A"),
        detail: "Calculated from completed full attempts."
      },
      {
        label: "Best Reading",
        value: formatIeltsBand(stats.reading_band, "N/A"),
        detail: "Highest completed Reading band."
      },
      {
        label: "Sessions",
        value: String(stats.active_sessions),
        detail: stats.leaderboard_rank ? `Leaderboard rank #${stats.leaderboard_rank}` : "Leaderboard hidden or not ranked yet."
      }
    ];
  } catch {
    return [
      { label: "Attempts", value: "0", detail: "Backend profile stats unavailable." },
      { label: "Average band", value: "N/A", detail: "Complete a full attempt to see averages." },
      { label: "Best Reading", value: "N/A", detail: "Reading band will appear after scoring." },
      { label: "Sessions", value: "0", detail: "No active user session data is available." }
    ];
  }
}
