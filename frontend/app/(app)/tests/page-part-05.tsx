import { AttemptRow, TestCardAttemptSummary, TestCatalogItem, cn } from "./page-dependencies";
import { ListeningFormat, ReadingAccess, ReadingFormat, ReadingSort, ReadingSource } from "./page-part-01";
import { ReadingTestCard } from "./page-part-06";
import { ListeningTestCard } from "./page-part-07";
import { resolveListeningCardTest } from "./page-part-08";

export function getListeningCardAttemptState(
  card: ListeningTestCard,
  catalogTests: TestCatalogItem[],
  userAttempts: AttemptRow[],
): "completed" | "active" | "none" {
  const resolved = resolveListeningCardTest(card, catalogTests);
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

export function buildReadingTestsHref({
  source,
  format,
  access,
  sort,
  query,
}: {
  source?: ReadingSource;
  format?: ReadingFormat;
  access?: ReadingAccess;
  sort?: ReadingSort;
  query?: string;
}) {
  const params = new URLSearchParams();
  params.set("type", "reading");

  if (source && source !== "all") {
    params.set("source", source);
  }

  if (format && format !== "all") {
    params.set("format", format);
  }

  if (access && access !== "all") {
    params.set("access", access);
  }

  if (sort && sort !== "newest") {
    params.set("sort", sort);
  }

  const normalizedQuery = query?.trim();
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  return `/tests?${params.toString()}`;
}

export function buildListeningTestsHref({
  source,
  format,
  access,
  sort,
  query,
}: {
  source?: ReadingSource;
  format?: ListeningFormat;
  access?: ReadingAccess;
  sort?: ReadingSort;
  query?: string;
}) {
  const params = new URLSearchParams();
  params.set("type", "listening");

  if (source && source !== "all") {
    params.set("source", source);
  }

  if (format && format !== "all") {
    params.set("format", format);
  }

  if (access && access !== "all") {
    params.set("access", access);
  }

  if (sort && sort !== "newest") {
    params.set("sort", sort);
  }

  const normalizedQuery = query?.trim();
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  return `/tests?${params.toString()}`;
}

export function getContinueHref(attempt: AttemptRow) {
  const route = attempt.type === "listening" ? "/exam-preview/listening" : "/exam-preview/reading";
  return `${route}?attemptId=${attempt.id}&mode=${attempt.mode}&resume=${Date.now()}`;
}

export function isCompletedAttempt(attempt: AttemptRow) {
  return attempt.status === "completed" || attempt.status === "submitted";
}

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

export function isResumeOrReviewAction(label: string) {
  return label === "Continue" || label === "Review";
}

export function getTestActionButtonClassName(label: string, isPremiumCard: boolean) {
  return cn(
    "h-9 w-full gap-2 rounded-lg text-sm font-semibold shadow-none",
    !isPremiumCard && isResumeOrReviewAction(label)
      ? "border-orange-300 bg-orange-100 text-orange-700 hover:border-orange-400 hover:bg-orange-200 hover:text-orange-800 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:border-orange-500/45 dark:hover:bg-orange-500/22 dark:hover:text-orange-100"
      : "border-orange-200 bg-white text-orange-600 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-slate-950/40 dark:text-orange-300 dark:hover:bg-orange-500/10",
  );
}

export function normalizeMatchText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getReadingCardTestNumber(card: ReadingTestCard) {
  return card.title.match(/\bTest\s*(\d+)\b/i)?.[1] ?? card.title.match(/(\d+)\s*$/)?.[1] ?? null;
}

export function getReadingCardTestNumberValue(card: ReadingTestCard) {
  const value = getReadingCardTestNumber(card);
  return value ? Number(value) : null;
}

export function getCambridgeBookAndTest(card: ReadingTestCard) {
  const book = card.title.match(/\bCambridge\s*(\d+)\b/i)?.[1];
  const test = getReadingCardTestNumberValue(card);

  return {
    book: book ? Number(book) : null,
    test,
  };
}

export function compareReadingCardsByNewestTestNumber(a: ReadingTestCard, b: ReadingTestCard) {
  const aTest = getReadingCardTestNumberValue(a);
  const bTest = getReadingCardTestNumberValue(b);

  if (aTest !== null && bTest !== null && aTest !== bTest) {
    return bTest - aTest;
  }

  if (aTest !== null && bTest === null) {
    return -1;
  }

  if (aTest === null && bTest !== null) {
    return 1;
  }

  return b.order - a.order;
}
