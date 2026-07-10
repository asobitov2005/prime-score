import { AttemptRow, DashboardActivityPoint } from "./server-me-dependencies";
import { BackendMeActivityPoint, BackendMeAttempt } from "./server-me-part-01";
import { isSubmittedBackendAttempt, mapBackendAttempt, requestBackend } from "./server-me-part-02";

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
      speakingTimeSec: point.speaking_time_sec ?? 0,
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
