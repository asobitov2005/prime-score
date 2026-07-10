"use client";

import { AttemptRow, WritingHistoryItem } from "./history-client-dependencies";

export type HistoryGroup = {
  key: string;
  latestAttempt: AttemptRow;
  bestAttempt: AttemptRow;
  attempts: AttemptRow[];
};

export type HistoryEntry =
  | {
      kind: "attempt";
      key: string;
      sortAt: string;
      group: HistoryGroup;
    }
  | {
      kind: "writing";
      key: string;
      sortAt: string;
      item: WritingHistoryItem;
    };

export type FilterValue =
  | "all"
  | "reading"
  | "listening"
  | "writing"
  | "practice"
  | "exam"
  | "cambridge"
  | "recent"
  | "practice_tests";

export const filterOptions: Array<{ id: FilterValue; label: string }> = [
  { id: "all", label: "All history" },
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "writing", label: "Writing" },
  { id: "practice", label: "Practice" },
  { id: "exam", label: "Exam" },
  { id: "cambridge", label: "Cambridge Official" },
  { id: "recent", label: "Recent Exam Papers" },
  { id: "practice_tests", label: "Exam Practice Tests" },
];

export function sourceBadgeClass(source: string): string {
  if (source === "Cambridge Official") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-600";
  }
  if (source === "Recent Exam Papers") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-600";
  }
  return "border-violet-500/30 bg-violet-500/10 text-violet-600";
}

export function formatDisplay(testFormat: string) {
  if (!testFormat || testFormat === "full") {
    return "Full Test";
  }
  return testFormat.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatBadgeClass(testFormat: string): string {
  if (!testFormat || testFormat === "full") {
    return "border-blue-500/30 text-blue-600 bg-blue-500/10";
  }
  return "border-slate-500/30 text-slate-600 bg-slate-500/10";
}

export function formatMode(mode: AttemptRow["mode"]): string {
  return mode === "exam" ? "Exam" : "Practice";
}

export function modeBadgeClass(mode: AttemptRow["mode"]): string {
  if (mode === "exam") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
}

export function typeBadgeClass(type: AttemptRow["type"]): string {
  if (type === "reading") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }
  if (type === "listening") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
}

export function historyTypeCardClass(type: AttemptRow["type"]): string {
  if (type === "reading") {
    return "border-sky-500/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(14,165,233,0.02)_26%,rgba(255,255,255,0)_42%)]";
  }
  if (type === "listening") {
    return "border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.09),rgba(245,158,11,0.025)_26%,rgba(255,255,255,0)_42%)]";
  }
  return "border-violet-500/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.09),rgba(139,92,246,0.025)_26%,rgba(255,255,255,0)_42%)]";
}

export function historyTypeAccentClass(type: AttemptRow["type"]): string {
  if (type === "reading") {
    return "bg-sky-500";
  }
  if (type === "listening") {
    return "bg-amber-500";
  }
  return "bg-violet-500";
}

export function formatType(type: AttemptRow["type"]): string {
  if (type === "reading") return "Reading";
  if (type === "listening") return "Listening";
  return "Writing";
}

export function formatScore(attempt: AttemptRow): string {
  const score = attempt.score.trim();
  if (score.includes("/") || score === "Pending" || attempt.totalQuestions === null) {
    return score;
  }
  return `${score}/${attempt.totalQuestions}`;
}

export function formatBand(attempt: AttemptRow): string {
  return attempt.testFormat === "full" ? attempt.band ?? "-" : "-";
}

export function scoreValue(attempt: AttemptRow): number {
  const match = attempt.score.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : -1;
}

export function bandValue(attempt: AttemptRow): number | null {
  if (!attempt.band) {
    return null;
  }
  const value = Number(attempt.band);
  return Number.isFinite(value) ? value : null;
}

export function historyGroupKey(attempt: AttemptRow): string {
  return `${attempt.testId}:${attempt.type}:${attempt.testFormat}`;
}

export function bestAttemptFor(attempts: AttemptRow[]): AttemptRow {
  return attempts.reduce((best, attempt) => {
    const attemptBand = bandValue(attempt);
    const bestBand = bandValue(best);
    if (attemptBand !== null || bestBand !== null) {
      const normalizedAttemptBand = attemptBand ?? -1;
      const normalizedBestBand = bestBand ?? -1;
      if (normalizedAttemptBand > normalizedBestBand) {
        return attempt;
      }
      if (normalizedAttemptBand < normalizedBestBand) {
        return best;
      }
    }
    return scoreValue(attempt) > scoreValue(best) ? attempt : best;
  }, attempts[0]);
}
