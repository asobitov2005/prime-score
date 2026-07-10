"use client";

import { AttemptRow, CheckCircle2, ComponentType, Headset, NotepadText, Pencil, PlayCircle, RotateCcw, TestCardAttemptSummary, TestCatalogItem, TestType, cn } from "./latest-tests-panel-dependencies";

export type LatestTestFilter = "all" | TestType | "speaking" | "mock";

export interface LatestTestsPanelProps {
  tests: TestCatalogItem[];
  attempts: AttemptRow[];
  initialFilter: LatestTestFilter;
}

export const latestTestFilters: Array<{ id: LatestTestFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "writing", label: "Writing" },
  { id: "speaking", label: "Speaking" },
  { id: "mock", label: "Mock" },
];

export const latestSkillOrder: TestType[] = ["reading", "listening", "writing"];

export const latestTestsLimit = 4;

export const latestTestsTableGridClassName =
  "grid-cols-[minmax(18rem,1.8fr)_minmax(9rem,0.8fr)_6rem_7rem_8rem_3rem]";

export const latestActionButtonBaseClassName =
  "h-10 min-w-28 rounded-xl px-4 text-sm font-semibold shadow-none";

export const latestActionButtonOutlineClassName =
  "h-10 min-w-28 rounded-xl border border-orange-200 bg-orange-50/80 px-4 text-sm font-semibold text-orange-700 shadow-none hover:border-orange-300 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:border-orange-400/35 dark:hover:bg-orange-500/15 dark:hover:text-orange-200";

export const latestActionButtonSolidClassName =
  "h-10 min-w-28 rounded-xl border border-orange-300 bg-orange-100 px-4 text-sm font-semibold text-orange-700 shadow-none hover:border-orange-400 hover:bg-orange-200 hover:text-orange-800 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:border-orange-500/45 dark:hover:bg-orange-500/22 dark:hover:text-orange-100";

export function toCardAttemptSummary(attempt: AttemptRow): TestCardAttemptSummary {
  return {
    id: attempt.id,
    mode: attempt.mode,
    status: attempt.status,
    score: attempt.score,
    band: attempt.band,
    totalQuestions: attempt.totalQuestions,
    lastSavedAt: attempt.lastSavedAt,
  };
}

export function isCompletedAttempt(attempt: TestCardAttemptSummary | undefined) {
  return attempt?.status === "completed" || attempt?.status === "submitted";
}

export function getAttemptStatus(attempt: TestCardAttemptSummary | undefined) {
  if (!attempt) {
    return {
      label: "Not started",
      icon: PlayCircle,
      className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  if (isCompletedAttempt(attempt)) {
    return {
      label: "Completed",
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  }

  return {
    label: "In progress",
    icon: RotateCcw,
    className: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300",
  };
}

export function formatDisplay(test: TestCatalogItem) {
  if (!test.format || test.format === "full") {
    return "Full Test";
  }

  const label = test.format
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return test.type === "listening" ? label.replace("Part", "Section") : label;
}

export function getSkillStyles(type: TestCatalogItem["type"]) {
  if (type === "listening") {
    return {
      icon: Headset,
      tileClassName: "border-sky-100 bg-sky-50 text-sky-700 shadow-sky-100/70 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300 dark:shadow-none",
    };
  }

  if (type === "writing") {
    return {
      icon: Pencil,
      tileClassName: "border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300 dark:shadow-none",
    };
  }

  return {
    icon: NotepadText,
    tileClassName: "border-teal-100 bg-teal-50 text-teal-700 shadow-teal-100/70 dark:border-teal-500/25 dark:bg-teal-500/10 dark:text-teal-300 dark:shadow-none",
  };
}

export function IconTile({
  icon: Icon,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  className: string;
}) {
  return (
    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm", className)}>
      <Icon className="h-6 w-6" />
    </span>
  );
}

export function testMatchesFilter(test: TestCatalogItem, filter: LatestTestFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "mock") {
    return `${test.title} ${test.source} ${test.sourceDetail} ${test.description} ${test.tags.join(" ")}`
      .toLowerCase()
      .includes("mock");
  }

  if (filter === "speaking") {
    return false;
  }

  return test.type === filter;
}

export function getTestCreatedTime(test: TestCatalogItem) {
  const time = new Date(test.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}
