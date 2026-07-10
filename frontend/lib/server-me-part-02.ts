import { AttemptRow, DashboardQuestionTypeAnalysisItem, formatDate, formatDateTime, formatIeltsBand, requestServerUserApi } from "./server-me-dependencies";
import { BackendMeAttempt, BackendQuestionTypeAnalysisItem } from "./server-me-part-01";

export type BackendAccuracyTrendPoint = {
  date: string;
  accuracy: number;
  band?: number | null;
  test_type?: string | null;
};

export type BackendWeeklyActivityPoint = {
  week_label: string;
  attempts_count: number;
  time_spent_min: number;
};

export type BackendScoreDistribution = {
  band_1_to_3: number;
  band_3_5_to_5: number;
  band_5_to_6_5: number;
  band_6_5_to_7_5: number;
  band_7_5_to_9: number;
};

export type BackendPersonalBests = {
  best_band?: number | null;
  best_accuracy?: number | null;
  longest_streak: number;
  current_streak: number;
  fastest_full_test_sec?: number | null;
};

export type BackendSpeedMetrics = {
  avg_time_per_question_sec?: number | null;
  reading_avg_sec_per_question?: number | null;
  listening_avg_sec_per_question?: number | null;
};

export type BackendImprovementRate = {
  last_5_avg_band?: number | null;
  prev_5_avg_band?: number | null;
  delta?: number | null;
  percent_change?: number | null;
};

export type BackendSectionAnalysisItem = {
  section_number: number;
  label: string;
  worked_count: number;
  correct_count: number;
  accuracy: number;
  attempts_count: number;
  avg_time_sec?: number | null;
};

export type BackendSkillFocusItem = {
  key: string;
  label: string;
  value?: number | null;
  value_label: string;
  subtext?: string | null;
  status?: string | null;
};

export type BackendSkillTimeAnalysis = {
  avg_time_per_test_sec?: number | null;
  recommended_time_sec?: number | null;
  time_management_status: string;
  slowest_section?: BackendSectionAnalysisItem | null;
  fastest_section?: BackendSectionAnalysisItem | null;
  unanswered_avg_percent?: number | null;
};

export type BackendLeaderboardEntry = {
  rank: number;
  user_id: string;
  xp: number;
};

export type BackendLeaderboardResponse = {
  items: BackendLeaderboardEntry[];
  current_user?: BackendLeaderboardEntry | null;
};

export interface LeaderboardPreviewSummary {
  rank: number | null;
  topPercent: number | null;
}

export async function requestBackend<T>(path: string): Promise<T> {
  return requestServerUserApi<T>(path);
}

export function formatAttemptDuration(totalSeconds: number | null | undefined): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatBandScore(value: number | string | null | undefined): string | null {
  const formatted = formatIeltsBand(value, "");
  return formatted || null;
}

export function normalizeAttemptSource(source: string | null | undefined, title: string): string {
  const normalized = `${source ?? ""} ${title}`.toLowerCase();
  if (normalized.includes("cambridge")) {
    return "Cambridge Official";
  }
  if (normalized.includes("real_exam") || normalized.includes("real exam")) {
    return "Recent Exam Papers";
  }
  return "Exam Practice Tests";
}

export function isSubmittedBackendAttempt(attempt: BackendMeAttempt): boolean {
  return attempt.status === "completed" || attempt.status === "auto_submitted";
}

export function mapBackendAttempt(attempt: BackendMeAttempt): AttemptRow {
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

export function mapQuestionTypeAnalysis(
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
