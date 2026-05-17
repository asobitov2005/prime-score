import { formatDate, formatDateTime } from "@/lib/date-time";
import { requestServerUserApi } from "@/lib/server-user-auth";
import type {
  AttemptRow,
  DashboardAnalytics,
  DashboardBandProgressPoint,
  DashboardActivityPoint,
  DashboardErrorDistributionItem,
  DashboardPerformanceSummary,
  DashboardQuestionTypeAnalysisItem,
  DashboardQuestionTypeComparison,
  DashboardQuestionTypeComparisonItem,
  DashboardStat,
  TestType,
  XpSummary
} from "@/lib/types";

type BackendMeStats = {
  attempts_total: number;
  average_band?: number | null;
  reading_band?: number | null;
  listening_band?: number | null;
  leaderboard_rank?: number | null;
  active_sessions: number;
  total_xp?: number;
  current_level?: number;
  weekly_xp?: number;
  monthly_xp?: number;
};

type BackendXpSummary = {
  total_xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  weekly_xp: number;
  monthly_xp: number;
  progress: {
    level: number;
    level_floor_xp: number;
    next_level_xp: number;
    xp_into_level: number;
    xp_needed_for_next_level: number;
    progress_percent: number;
  };
};

type BackendMeActivityPoint = {
  activity_date: string;
  attempts_count: number;
  time_spent_sec: number;
  reading_time_sec: number;
  listening_time_sec: number;
  writing_time_sec: number;
};

type BackendMeAttempt = {
  attempt_id: string;
  test_id: string;
  test_title: string;
  test_type: TestType;
  test_format?: "full" | "passage_1" | "passage_2" | "passage_3" | "part_1" | "part_2" | "part_3" | "part_4" | null;
  mode: "practice" | "exam";
  status: "draft" | "in_progress" | "completed" | "archived" | "auto_submitted";
  source?: string | null;
  raw_score?: number | null;
  band_score?: number | string | null;
  total_questions?: number | null;
  time_spent_sec?: number | null;
  answered_count?: number | null;
  progress_percent?: number | null;
  time_limit_seconds?: number | null;
  last_answered_question_number?: number | null;
  started_at: string;
  completed_at?: string | null;
  updated_at?: string | null;
  violation_count?: number;
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
  writing?: number | null;
};

type BackendPerformanceStudyTime = {
  total_time_sec: number;
  reading_time_sec: number;
  listening_time_sec: number;
  writing_time_sec?: number | null;
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
  writing?: BackendPerformanceTestCountBucket | null;
};

type BackendWritingCriteria = {
  task_achievement?: number | null;
  coherence_cohesion?: number | null;
  lexical_resource?: number | null;
  grammatical_range_accuracy?: number | null;
};

type BackendDashboardAnalytics = {
  performance_summary: BackendPerformanceSummary;
  writing_criteria?: BackendWritingCriteria | null;
  question_type_analysis: BackendQuestionTypeAnalysisItem[];
  comparison: BackendQuestionTypeComparison;
  error_distribution: BackendErrorDistributionItem[];
  progress_series: BackendBandProgressPoint[];
  accuracy_trend?: BackendAccuracyTrendPoint[];
  weekly_activity?: BackendWeeklyActivityPoint[];
  score_distribution?: BackendScoreDistribution;
  personal_bests?: BackendPersonalBests;
  speed_metrics?: BackendSpeedMetrics;
  improvement_rate?: BackendImprovementRate;
};

type BackendAccuracyTrendPoint = {
  date: string;
  accuracy: number;
  band?: number | null;
  test_type?: string | null;
};

type BackendWeeklyActivityPoint = {
  week_label: string;
  attempts_count: number;
  time_spent_min: number;
};

type BackendScoreDistribution = {
  band_1_to_3: number;
  band_3_5_to_5: number;
  band_5_to_6_5: number;
  band_6_5_to_7_5: number;
  band_7_5_to_9: number;
};

type BackendPersonalBests = {
  best_band?: number | null;
  best_accuracy?: number | null;
  longest_streak: number;
  current_streak: number;
  fastest_full_test_sec?: number | null;
};

type BackendSpeedMetrics = {
  avg_time_per_question_sec?: number | null;
  reading_avg_sec_per_question?: number | null;
  listening_avg_sec_per_question?: number | null;
};

type BackendImprovementRate = {
  last_5_avg_band?: number | null;
  prev_5_avg_band?: number | null;
  delta?: number | null;
  percent_change?: number | null;
};

async function requestBackend<T>(path: string): Promise<T> {
  return requestServerUserApi<T>(path);
}

function formatAttemptDuration(totalSeconds: number | null | undefined): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatBandScore(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(1) : null;
}

function normalizeAttemptSource(source: string | null | undefined, title: string): string {
  const normalized = `${source ?? ""} ${title}`.toLowerCase();
  if (normalized.includes("cambridge")) {
    return "Cambridge Official";
  }
  if (normalized.includes("real_exam") || normalized.includes("real exam")) {
    return "Recent Exam Papers";
  }
  return "Exam Practice Tests";
}

function isSubmittedBackendAttempt(attempt: BackendMeAttempt): boolean {
  return attempt.status === "completed" || attempt.status === "auto_submitted";
}

function mapBackendAttempt(attempt: BackendMeAttempt): AttemptRow {
  const isSubmitted = isSubmittedBackendAttempt(attempt);
  return {
    id: attempt.attempt_id,
    testId: attempt.test_id,
    testTitle: attempt.test_title,
    type: attempt.test_type,
    testFormat: attempt.test_format ?? "full",
    source: normalizeAttemptSource(attempt.source, attempt.test_title),
    mode: attempt.mode,
    date: formatDate(attempt.started_at),
    lastSavedAt: formatDateTime(
      isSubmitted
        ? attempt.completed_at ?? attempt.updated_at ?? attempt.started_at
        : attempt.updated_at ?? attempt.started_at
    ),
    score: attempt.raw_score !== null && attempt.raw_score !== undefined ? String(attempt.raw_score) : "Pending",
    band: formatBandScore(attempt.band_score),
    totalQuestions: attempt.total_questions ?? null,
    timeSpent: formatAttemptDuration(attempt.time_spent_sec),
    timeSpentSec: attempt.time_spent_sec ?? null,
    answeredCount: attempt.answered_count ?? 0,
    progressPercent: attempt.progress_percent ?? 0,
    timeLimitSeconds: attempt.time_limit_seconds ?? 0,
    lastAnsweredQuestionNumber: attempt.last_answered_question_number ?? null,
    status: attempt.status === "auto_submitted" ? "submitted" : attempt.status === "completed" ? "completed" : "in_progress",
    violationCount: attempt.violation_count ?? 0
  };
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
    listening: item.listening ?? null,
    writing: item.writing ?? null
  }));
}

function mapPerformanceSummary(
  summary: BackendPerformanceSummary
): DashboardPerformanceSummary {
  return {
    studyTime: {
      totalTimeSec: summary.study_time.total_time_sec,
      readingTimeSec: summary.study_time.reading_time_sec,
      listeningTimeSec: summary.study_time.listening_time_sec,
      writingTimeSec: summary.study_time.writing_time_sec ?? 0
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
    } : undefined
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
      { label: "Sessions", value: "0", detail: "No active user session data is available." }
    ];
  }
}

export async function getXpSummary(): Promise<XpSummary> {
  try {
    const summary = await requestBackend<BackendXpSummary>("/me/xp-summary");
    return {
      totalXp: summary.total_xp,
      level: summary.level,
      currentStreak: summary.current_streak,
      bestStreak: summary.best_streak,
      weeklyXp: summary.weekly_xp,
      monthlyXp: summary.monthly_xp,
      progress: {
        level: summary.progress.level,
        levelFloorXp: summary.progress.level_floor_xp,
        nextLevelXp: summary.progress.next_level_xp,
        xpIntoLevel: summary.progress.xp_into_level,
        xpNeededForNextLevel: summary.progress.xp_needed_for_next_level,
        progressPercent: summary.progress.progress_percent,
      },
    };
  } catch {
    return {
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      bestStreak: 0,
      weeklyXp: 0,
      monthlyXp: 0,
      progress: {
        level: 1,
        levelFloorXp: 0,
        nextLevelXp: 100,
        xpIntoLevel: 0,
        xpNeededForNextLevel: 100,
        progressPercent: 0,
      },
    };
  }
}

export async function getLeaderboardRank(type: "combined" | TestType = "combined"): Promise<number | null> {
  try {
    const payload = await requestBackend<{
      current_user?: {
        rank: number;
      } | null;
    }>(`/leaderboard?type=${encodeURIComponent(type)}&period=all_time`);
    const rank = payload.current_user?.rank ?? null;
    return typeof rank === "number" && rank > 0 ? rank : null;
  } catch {
    return null;
  }
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  try {
    const analytics = await requestBackend<BackendDashboardAnalytics>("/me/analytics");
    const sd = analytics.score_distribution;
    const pb = analytics.personal_bests;
    const sm = analytics.speed_metrics;
    const ir = analytics.improvement_rate;
    return {
      performanceSummary: mapPerformanceSummary(analytics.performance_summary),
      writingCriteria: analytics.writing_criteria ? {
        taskAchievement: analytics.writing_criteria.task_achievement ?? null,
        coherenceCohesion: analytics.writing_criteria.coherence_cohesion ?? null,
        lexicalResource: analytics.writing_criteria.lexical_resource ?? null,
        grammaticalRangeAccuracy: analytics.writing_criteria.grammatical_range_accuracy ?? null,
      } : null,
      questionTypeAnalysis: mapQuestionTypeAnalysis(analytics.question_type_analysis),
      comparison: mapComparison(analytics.comparison),
      errorDistribution: mapErrorDistribution(analytics.error_distribution),
      progressSeries: mapProgressSeries(analytics.progress_series),
      accuracyTrend: (analytics.accuracy_trend ?? []).map((p) => ({
        date: p.date,
        accuracy: p.accuracy,
        band: p.band ?? null,
        testType: p.test_type ?? null,
      })),
      weeklyActivity: (analytics.weekly_activity ?? []).map((p) => ({
        weekLabel: p.week_label,
        attemptsCount: p.attempts_count,
        timeSpentMin: p.time_spent_min,
      })),
      scoreDistribution: {
        band1To3: sd?.band_1_to_3 ?? 0,
        band3_5To5: sd?.band_3_5_to_5 ?? 0,
        band5To6_5: sd?.band_5_to_6_5 ?? 0,
        band6_5To7_5: sd?.band_6_5_to_7_5 ?? 0,
        band7_5To9: sd?.band_7_5_to_9 ?? 0,
      },
      personalBests: {
        bestBand: pb?.best_band ?? null,
        bestAccuracy: pb?.best_accuracy ?? null,
        longestStreak: pb?.longest_streak ?? 0,
        currentStreak: pb?.current_streak ?? 0,
        fastestFullTestSec: pb?.fastest_full_test_sec ?? null,
      },
      speedMetrics: {
        avgTimePerQuestionSec: sm?.avg_time_per_question_sec ?? null,
        readingAvgSecPerQuestion: sm?.reading_avg_sec_per_question ?? null,
        listeningAvgSecPerQuestion: sm?.listening_avg_sec_per_question ?? null,
      },
      improvementRate: {
        last5AvgBand: ir?.last_5_avg_band ?? null,
        prev5AvgBand: ir?.prev_5_avg_band ?? null,
        delta: ir?.delta ?? null,
        percentChange: ir?.percent_change ?? null,
      },
    };
  } catch {
    return {
      performanceSummary: {
        studyTime: { totalTimeSec: 0, readingTimeSec: 0, listeningTimeSec: 0, writingTimeSec: 0 },
        reading: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 },
        listening: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 },
        writing: { fullCount: 0, section1Count: 0, section2Count: 0, section3Count: 0, section4Count: 0 }
      },
      writingCriteria: null,
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
      progressSeries: [],
      accuracyTrend: [],
      weeklyActivity: [],
      scoreDistribution: { band1To3: 0, band3_5To5: 0, band5To6_5: 0, band6_5To7_5: 0, band7_5To9: 0 },
      personalBests: { bestBand: null, bestAccuracy: null, longestStreak: 0, currentStreak: 0, fastestFullTestSec: null },
      speedMetrics: { avgTimePerQuestionSec: null, readingAvgSecPerQuestion: null, listeningAvgSecPerQuestion: null },
      improvementRate: { last5AvgBand: null, prev5AvgBand: null, delta: null, percentChange: null },
    };
  }
}

export async function getDashboardActivity(): Promise<DashboardActivityPoint[]> {
  try {
    const activity = await requestBackend<BackendMeActivityPoint[]>("/me/activity");
    return activity.map((point) => ({
      activityDate: point.activity_date,
      attemptsCount: point.attempts_count,
      timeSpentSec: point.time_spent_sec,
      readingTimeSec: point.reading_time_sec ?? 0,
      listeningTimeSec: point.listening_time_sec ?? 0,
      writingTimeSec: point.writing_time_sec ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getUserAttempts(): Promise<AttemptRow[]> {
  try {
    const attempts = await requestBackend<BackendMeAttempt[]>("/me/attempts");
    const activeTestIds = new Set<string>();
    return attempts
      .filter((attempt) => {
        if (isSubmittedBackendAttempt(attempt)) {
          return true;
        }
        if (attempt.status !== "in_progress" || activeTestIds.has(attempt.test_id)) {
          return false;
        }
        activeTestIds.add(attempt.test_id);
        return true;
      })
      .map(mapBackendAttempt);
  } catch {
    return [];
  }
}

export async function getSubmittedAttempts(): Promise<AttemptRow[]> {
  try {
    const attempts = await requestBackend<BackendMeAttempt[]>("/me/attempts");
    return attempts.filter(isSubmittedBackendAttempt).map(mapBackendAttempt);
  } catch {
    return [];
  }
}
