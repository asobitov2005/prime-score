import { getAttemptsByType } from "@/lib/mock-data";
import type { AttemptRow, DashboardStat, TestType } from "@/lib/types";

const baseUrl = (
  process.env.API_INTERNAL_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? "http://localhost:8000/api"
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
  raw_score?: number | null;
  band_score?: number | null;
  started_at: string;
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

export async function getUserAttempts(): Promise<AttemptRow[]> {
  try {
    const attempts = await requestBackend<BackendMeAttempt[]>("/me/attempts");
    return attempts.map((attempt) => ({
      id: attempt.attempt_id,
      testId: attempt.test_id,
      testTitle: attempt.test_title,
      type: attempt.test_type,
      source: "PrimeScore backend",
      mode: attempt.mode,
      date: formatDate(attempt.started_at),
      score: attempt.raw_score !== null && attempt.raw_score !== undefined ? `${attempt.raw_score}` : "Pending",
      band: attempt.band_score !== null && attempt.band_score !== undefined ? attempt.band_score.toFixed(1) : null,
      timeSpent: "Scored in backend",
      status: attempt.status === "auto_submitted" ? "submitted" : attempt.status === "completed" ? "completed" : "in_progress"
    }));
  } catch {
    return getAttemptsByType();
  }
}
