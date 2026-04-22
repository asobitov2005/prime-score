import { getAttemptsByType } from "@/lib/mock-data";
import type {
  AttemptRow,
  DashboardAnalytics,
  DashboardBandProgressPoint,
  DashboardErrorDistributionItem,
  DashboardPerformanceSummary,
  DashboardQuestionTypeAnalysisItem,
  DashboardQuestionTypeComparison,
  DashboardQuestionTypeComparisonItem,
  DashboardStat,
  TestType
} from "@/lib/types";

const baseUrl = (
  process.env.API_INTERNAL_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

const debugHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Debug-User-Id": process.env.PRIMESCORE_DEBUG_USER_ID ?? "33333333-3333-3333-3333-333333333333",
  "X-Debug-First-Name": process.env.PRIMESCORE_DEBUG_USER_FIRST_NAME ?? "Azizbek",
  "X-Debug-Last-Name": process.env.PRIMESCORE_DEBUG_USER_LAST_NAME ?? "Prime",
  "X-Debug-Username": process.env.PRIMESCORE_DEBUG_USER_USERNAME ?? "azizbek",
  "X-Debug-Role": process.env.PRIMESCORE_DEBUG_USER_ROLE ?? "user",
  "X-Debug-Is-Premium": "true",
  "X-Debug-Show-On-Leaderboard": "true"
};

type BackendMeStats = {
  attempts_total: number;
  average_band?: number | null;
  reading_band?: number | null;
  listening_band?: number | null;
  leaderboard_rank?: number | null;
  active_sessions: number;
};

type BackendMeAttempt = {
  attempt_id: string;
  test_id: string;
  test_title: string;
  test_type: TestType;
  mode: "practice" | "exam";
  status: "draft" | "in_progress" | "completed" | "archived" | "auto_submitted";
  source?: string | null;
  raw_score?: number | null;
  band_score?: number | null;
  time_spent_sec?: number | null;
  started_at: string;
  updated_at?: string | null;
};

type BackendQuestionTypeAnalysisItem = {
  label: string;
  worked_count: number;
  correct_count: number;
  accuracy: number;
  error_count: number;
};

type BackendQuestionTypeComparisonItem = {
  label: string;
  previous_accuracy?: number | null;
  current_accuracy?: number | null;
  delta?: number | null;
  accuracies?: Array<number | null>;
};

type BackendQuestionTypeComparisonTest = {
  test_title: string;
  test_date: string;
};

type BackendQuestionTypeComparison = {
  previous_test_title?: string | null;
  previous_test_date?: string | null;
  current_test_title?: string | null;
  current_test_date?: string | null;
  tests: BackendQuestionTypeComparisonTest[];
  items: BackendQuestionTypeComparisonItem[];
};

type BackendErrorDistributionItem = {
  label: string;
  error_count: number;
  share: number;
};

type BackendBandProgressPoint = {
  label: string;
  occurred_at: string;
  reading?: number | null;
  listening?: number | null;
};

type BackendPerformanceStudyTime = {
  total_time_sec: number;
  reading_time_sec: number;
  listening_time_sec: number;
};

type BackendPerformanceTestCountBucket = {
  full_count: number;
  section_1_count: number;
  section_2_count: number;
  section_3_count: number;
  section_4_count: number;
};

type BackendPerformanceSummary = {
  study_time: BackendPerformanceStudyTime;
  reading: BackendPerformanceTestCountBucket;
  listening: BackendPerformanceTestCountBucket;
};

type BackendDashboardAnalytics = {
  performance_summary: BackendPerformanceSummary;
  question_type_analysis: BackendQuestionTypeAnalysisItem[];
  comparison: BackendQuestionTypeComparison;
  error_distribution: BackendErrorDistributionItem[];
  progress_series: BackendBandProgressPoint[];
};

async function requestBackend<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: debugHeaders
  });

  if (!response.ok) {
    throw new Error(`Profile backend request failed for ${path}`);
  }

  return (await response.json()) as T;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatAttemptDuration(totalSeconds: number | null | undefined): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeAttemptSource(source: string | null | undefined, title: string): string {
  const normalized = `${source ?? ""} ${title}`.toLowerCase();
  if (normalized.includes("cambridge")) {
    return "Cambridge Official";
  }
  if (normalized.includes("real_exam") || normalized.includes("real exam")) {
    return "Real Exam Material";
  }
  return "Custom Practice";
}

function mapQuestionTypeAnalysis(
  items: BackendQuestionTypeAnalysisItem[]
): DashboardQuestionTypeAnalysisItem[] {
  return items.map((item) => ({
    label: item.label,
    workedCount: item.worked_count,
    correctCount: item.correct_count,
    accuracy: item.accuracy,
    errorCount: item.error_count
  }));
}

function mapComparison(
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
      accuracies: item.accuracies ?? []
    }))
  };
}

function mapErrorDistribution(
  items: BackendErrorDistributionItem[]
): DashboardErrorDistributionItem[] {
  return items.map((item) => ({
    label: item.label,
    errorCount: item.error_count,
    share: item.share
  }));
}

function mapProgressSeries(
  items: BackendBandProgressPoint[]
): DashboardBandProgressPoint[] {
  return items.map((item) => ({
    label: item.label,
    occurredAt: item.occurred_at,
    reading: item.reading ?? null,
    listening: item.listening ?? null
  }));
}

function mapPerformanceSummary(
  summary: BackendPerformanceSummary
): DashboardPerformanceSummary {
  return {
    studyTime: {
      totalTimeSec: summary.study_time.total_time_sec,
      readingTimeSec: summary.study_time.reading_time_sec,
      listeningTimeSec: summary.study_time.listening_time_sec
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
    }
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
        value: stats.average_band?.toFixed(1) ?? "N/A",
        detail: "Calculated from completed full attempts."
      },
      {
        label: "Best Reading",
        value: stats.reading_band?.toFixed(1) ?? "N/A",
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
      { label: "Sessions", value: "2", detail: "Debug session cap remains enabled." }
    ];
  }
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  try {
    const analytics = await requestBackend<BackendDashboardAnalytics>("/me/analytics");
    return {
      performanceSummary: mapPerformanceSummary(analytics.performance_summary),
      questionTypeAnalysis: mapQuestionTypeAnalysis(analytics.question_type_analysis),
      comparison: mapComparison(analytics.comparison),
      errorDistribution: mapErrorDistribution(analytics.error_distribution),
      progressSeries: mapProgressSeries(analytics.progress_series)
    };
  } catch {
    return {
      performanceSummary: {
        studyTime: { totalTimeSec: 0, readingTimeSec: 0, listeningTimeSec: 0 },
        reading: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 },
        listening: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 }
      },
      questionTypeAnalysis: [],
      comparison: {
        previousTestTitle: null,
        previousTestDate: null,
        currentTestTitle: null,
        currentTestDate: null,
        tests: [],
        items: []
      },
      errorDistribution: [],
      progressSeries: []
    };
  }
}

export async function getUserAttempts(): Promise<AttemptRow[]> {
  try {
    const attempts = await requestBackend<BackendMeAttempt[]>("/me/attempts");
    return attempts.map((attempt) => ({
      id: attempt.attempt_id,
      testId: attempt.test_id,
      testTitle: attempt.test_title,
      type: attempt.test_type,
      source: normalizeAttemptSource(attempt.source, attempt.test_title),
      mode: attempt.mode,
      date: formatDate(attempt.started_at),
      lastSavedAt: formatDateTime(attempt.updated_at ?? attempt.started_at),
      score: attempt.raw_score !== null && attempt.raw_score !== undefined ? `${attempt.raw_score}` : "Pending",
      band: attempt.band_score !== null && attempt.band_score !== undefined ? attempt.band_score.toFixed(1) : null,
      timeSpent: formatAttemptDuration(attempt.time_spent_sec),
      status: attempt.status === "auto_submitted" ? "submitted" : attempt.status === "completed" ? "completed" : "in_progress"
    }));
  } catch {
    return getAttemptsByType();
  }
}
