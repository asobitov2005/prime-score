"use client";

import { AttemptRow, formatDateTime } from "./history-client-dependencies";
import { FilterValue, HistoryGroup, bestAttemptFor, historyGroupKey } from "./history-client-part-01";

export function groupSubmittedAttempts(attempts: AttemptRow[]): HistoryGroup[] {
  const grouped = new Map<string, AttemptRow[]>();
  for (const attempt of attempts) {
    const key = historyGroupKey(attempt);
    const group = grouped.get(key);
    if (group) {
      group.push(attempt);
    } else {
      grouped.set(key, [attempt]);
    }
  }

  return Array.from(grouped.entries())
    .map(([key, groupAttempts]) => {
      const sortedAttempts = [...groupAttempts].sort((left, right) => attemptSortTimestamp(right) - attemptSortTimestamp(left));
      return {
        key,
        latestAttempt: sortedAttempts[0],
        bestAttempt: bestAttemptFor(sortedAttempts),
        attempts: sortedAttempts,
      };
    })
    .sort((left, right) => attemptSortTimestamp(right.latestAttempt) - attemptSortTimestamp(left.latestAttempt));
}

export function matchesFilter(attempt: AttemptRow, filter: FilterValue) {
  switch (filter) {
    case "reading":
    case "listening":
    case "writing":
      return attempt.type === filter;
    case "practice":
    case "exam":
      return attempt.mode === filter;
    case "cambridge":
      return attempt.source === "Cambridge Official";
    case "recent":
      return attempt.source === "Recent Exam Papers";
    case "practice_tests":
      return attempt.source === "Exam Practice Tests";
    default:
      return true;
  }
}

export function matchesWritingFilter(filter: FilterValue) {
  switch (filter) {
    case "all":
    case "writing":
      return true;
    default:
      return false;
  }
}

export function exactDateTime(value: string | null | undefined): string {
  return formatDateTime(value);
}

export function formatDurationLabel(seconds: number | null | undefined): string {
  const safe = Math.max(0, Math.floor(Number(seconds ?? 0)));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

export function writingBandClass(band: number) {
  if (band >= 8) return "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300";
  if (band >= 7) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (band >= 6) return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (band >= 5) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
}

export const HISTORY_MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export function sortTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  const match = value.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4}), (\d{2}):(\d{2})$/);
  if (!match) {
    return 0;
  }

  const [, day, month, year, hour, minute] = match;
  const monthIndex = HISTORY_MONTHS[month];
  if (monthIndex === undefined) {
    return 0;
  }

  return Date.UTC(Number(year), monthIndex, Number(day), Number(hour), Number(minute));
}

export function attemptSortTimestamp(attempt: AttemptRow): number {
  return Math.max(sortTimestamp(attempt.lastSavedAt), sortTimestamp(attempt.date));
}
