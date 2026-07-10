import { AttemptRow, FileText, Headphones, TestCatalogItem } from "./page-dependencies";
import { ActiveType, ListeningFormat, ReadingAccess, ReadingFormat, ReadingSort, ReadingSource } from "./page-part-01";
import { isCompletedAttempt } from "./page-part-05";
import { ReadingTestCard, resolveReadingCardTest } from "./page-part-06";

export const listeningTestCards = [
  {
    id: "listening-cam17-t1",
    title: "Cambridge 17 — Listening Test 1",
    meta: "Cambridge Official · Full Test",
    source: "cambridge",
    format: "full",
    access: "free",
    order: 17,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: Headphones,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-cam18-t2",
    title: "Cambridge 18 — Listening Test 2",
    meta: "Cambridge Official · Full Test",
    source: "cambridge",
    format: "full",
    access: "premium",
    order: 18,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: Headphones,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    href: "/subscription",
  },
  {
    id: "listening-recent-exam-paper-5",
    title: "Recent Exam Paper 5",
    meta: "Recent Exam Papers · Full Test",
    source: "real_exam",
    format: "full",
    access: "premium",
    order: 15,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-300",
    href: "/subscription",
  },
  {
    id: "listening-airport-information-test-13",
    title: "Airport Information — Test 13",
    meta: "Exam Practice Tests · Part 1",
    source: "custom",
    format: "part_1",
    access: "free",
    order: 13,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: Headphones,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-student-accommodation-test-12",
    title: "Student Accommodation — Test 12",
    meta: "Exam Practice Tests · Part 2",
    source: "custom",
    format: "part_2",
    access: "free",
    order: 12,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-research-discussion-test-10",
    title: "Research Discussion — Test 10",
    meta: "Exam Practice Tests · Part 3",
    source: "custom",
    format: "part_3",
    access: "free",
    order: 10,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-university-lecture-test-8",
    title: "University Lecture — Test 8",
    meta: "Exam Practice Tests · Part 4",
    source: "custom",
    format: "part_4",
    access: "free",
    order: 8,
    badges: ["Free"],
    button: "Start Test",
    buttonVariant: "outline",
    icon: FileText,
    iconClassName: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    href: "/tests?type=listening",
  },
  {
    id: "listening-cam16-t1",
    title: "Cambridge 16 — Listening Test 1",
    meta: "Cambridge Official · Part 1",
    source: "cambridge",
    format: "part_1",
    access: "premium",
    order: 16,
    badges: ["Premium"],
    button: "Unlock",
    buttonVariant: "outline",
    icon: Headphones,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    href: "/subscription",
  },
] as const;

export function normalizeActiveType(value: string | undefined): ActiveType {
  return value === "reading" || value === "listening" ? value : "all";
}

export function normalizeReadingSource(value: string | undefined): ReadingSource {
  return value === "cambridge" || value === "real_exam" || value === "custom" ? value : "all";
}

export function normalizeReadingFormat(value: string | undefined): ReadingFormat {
  return value === "full" || value === "passage_1" || value === "passage_2" || value === "passage_3" ? value : "all";
}

export function normalizeListeningFormat(value: string | undefined): ListeningFormat {
  return value === "full" || value === "part_1" || value === "part_2" || value === "part_3" || value === "part_4" ? value : "all";
}

export function normalizeReadingAccess(value: string | undefined): ReadingAccess {
  return value === "free" || value === "premium" ? value : "all";
}

export function normalizeReadingSort(value: string | undefined): ReadingSort {
  return value === "oldest" || value === "title_az" || value === "not_attempted"
    ? value
    : "newest";
}

export // 0 = should appear first for the given sort, 1 = afterwards. Ties fall back to
// the default ordering applied by each card comparator.
function getCardAttemptSortRank(
  state: "completed" | "active" | "none",
  sort: ReadingSort,
): number {
  if (sort === "not_attempted") {
    return state === "none" ? 0 : 1;
  }
  return 0;
}

export function getReadingCardAttemptState(
  card: ReadingTestCard,
  catalogTests: TestCatalogItem[],
  userAttempts: AttemptRow[],
): "completed" | "active" | "none" {
  const resolved = resolveReadingCardTest(card, catalogTests);
  if (!resolved) {
    return "none";
  }
  if (userAttempts.some((attempt) => attempt.testId === resolved.id && attempt.status === "in_progress")) {
    return "active";
  }
  if (userAttempts.some((attempt) => attempt.testId === resolved.id && isCompletedAttempt(attempt))) {
    return "completed";
  }
  return "none";
}
