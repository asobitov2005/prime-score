import { getTestSourceKey, getTestSourceLabel } from "@/lib/test-source";
import { isNewTestCreatedAt } from "@/lib/test-freshness";
import type { AttemptRow, TestCardAttemptSummary, TestCatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import type {
  PracticeCatalogAccess,
  PracticeCatalogSort,
  PracticeCatalogSource,
  PracticeCatalogType,
} from "./practice-catalog-params";

export function formatCatalogTestFormat(testFormat: TestCatalogItem["format"]) {
  if (!testFormat || testFormat === "full") {
    return "Full Test";
  }

  return testFormat
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isCompletedCatalogAttempt(attempt: AttemptRow) {
  return attempt.status === "completed" || attempt.status === "submitted";
}

export function toCatalogAttemptSummary(attempt: AttemptRow): TestCardAttemptSummary {
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

function isResumeOrReviewAction(label: string) {
  return label === "Continue" || label === "Review";
}

export function getCatalogActionButtonClassName(label: string, isPremiumCard: boolean) {
  return cn(
    "h-9 w-full gap-2 rounded-lg text-sm font-semibold shadow-none",
    !isPremiumCard && isResumeOrReviewAction(label)
      ? "border border-orange-200 bg-orange-50 text-orange-600 hover:border-orange-300 hover:bg-orange-50/90 dark:border-orange-500/25 dark:bg-orange-500/8 dark:text-orange-300 dark:hover:border-orange-500/35 dark:hover:bg-orange-500/12"
      : "border border-orange-200 bg-white text-orange-600 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-slate-950/40 dark:text-orange-300 dark:hover:bg-orange-500/10",
  );
}

function getCatalogTestNumber(test: TestCatalogItem) {
  return test.title.match(/\bTest\s*(\d+)\b/i)?.[1] ?? test.sourceDetail.match(/\bTest\s*(\d+)\b/i)?.[1] ?? null;
}

function getCatalogTestNumberValue(test: TestCatalogItem) {
  const value = getCatalogTestNumber(test);
  return value ? Number(value) : null;
}

export function getCatalogTestSource(test: TestCatalogItem): Exclude<PracticeCatalogSource, "all"> {
  return getTestSourceKey(test.source) ?? getTestSourceKey(test.sourceDetail) ?? "custom";
}

export function getCatalogTestAccess(test: TestCatalogItem): Exclude<PracticeCatalogAccess, "all"> {
  return test.accessType === "premium" ? "premium" : "free";
}

function getCatalogTestCreatedTime(test: TestCatalogItem) {
  const time = new Date(test.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareCatalogTestsByNewest(a: TestCatalogItem, b: TestCatalogItem) {
  const aCreated = getCatalogTestCreatedTime(a);
  const bCreated = getCatalogTestCreatedTime(b);

  if (aCreated !== bCreated) {
    return bCreated - aCreated;
  }

  const aTest = getCatalogTestNumberValue(a);
  const bTest = getCatalogTestNumberValue(b);

  if (aTest !== null && bTest !== null && aTest !== bTest) {
    return bTest - aTest;
  }

  return a.title.localeCompare(b.title);
}

function getCatalogCardAttemptState(
  test: TestCatalogItem,
  userAttempts: AttemptRow[],
): "completed" | "active" | "none" {
  if (userAttempts.some((attempt) => attempt.testId === test.id && attempt.status === "in_progress")) {
    return "active";
  }
  if (userAttempts.some((attempt) => attempt.testId === test.id && isCompletedCatalogAttempt(attempt))) {
    return "completed";
  }
  return "none";
}

function getCardAttemptSortRank(
  state: "completed" | "active" | "none",
  sort: PracticeCatalogSort,
): number {
  if (sort === "not_attempted") {
    return state === "none" ? 0 : 1;
  }
  return 0;
}

function getCambridgeBookNumber(test: TestCatalogItem) {
  return test.title.match(/\bCambridge\s*(\d+)\b/i)?.[1] ?? null;
}

function getCambridgeSkillTestNumber(test: TestCatalogItem) {
  const skillMatch = test.title.match(/\b(?:Reading|Listening)\s+Test\s*(\d+)\b/i);
  if (skillMatch) {
    return skillMatch[1];
  }

  return getCatalogTestNumber(test);
}

function getCambridgeBookNumberValue(test: TestCatalogItem) {
  const book = getCambridgeBookNumber(test);
  return book ? Number(book) : null;
}

function getCambridgeTestNumberValue(test: TestCatalogItem) {
  const value = getCambridgeSkillTestNumber(test) ?? getCatalogTestNumber(test);
  return value ? Number(value) : null;
}

export function splitCatalogTestsForDisplay(tests: TestCatalogItem[]) {
  const cambridgeGroups = new Map<number, TestCatalogItem[]>();
  const otherTests: TestCatalogItem[] = [];

  for (const test of tests) {
    const bookNumber = getCambridgeBookNumberValue(test);
    if (getCatalogTestSource(test) === "cambridge" && bookNumber !== null) {
      const existing = cambridgeGroups.get(bookNumber) ?? [];
      existing.push(test);
      cambridgeGroups.set(bookNumber, existing);
      continue;
    }

    otherTests.push(test);
  }

  for (const bookTests of cambridgeGroups.values()) {
    bookTests.sort((a, b) => {
      const aTest = getCambridgeTestNumberValue(a) ?? 999;
      const bTest = getCambridgeTestNumberValue(b) ?? 999;
      return aTest - bTest;
    });
  }

  const sortedBooks = [...cambridgeGroups.keys()].sort((a, b) => b - a);

  return { sortedBooks, cambridgeGroups, otherTests };
}

export function sortCatalogTests(tests: TestCatalogItem[], sort: PracticeCatalogSort, userAttempts: AttemptRow[]) {
  return tests.slice().sort((a, b) => {
    if (sort === "oldest") {
      return getCatalogTestCreatedTime(a) - getCatalogTestCreatedTime(b);
    }

    if (sort === "title_az") {
      return a.title.localeCompare(b.title);
    }

    if (sort === "not_attempted") {
      const rankA = getCardAttemptSortRank(getCatalogCardAttemptState(a, userAttempts), sort);
      const rankB = getCardAttemptSortRank(getCatalogCardAttemptState(b, userAttempts), sort);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
    }

    return compareCatalogTestsByNewest(a, b);
  });
}

function extractPassageTitleFromTestTitle(title: string) {
  const match = title.match(/^(.+?)\s*[—-]\s*Test\s*\d+\s*$/i);
  if (!match) {
    return null;
  }

  const extracted = match[1].trim();
  if (/^cambridge\s*\d+/i.test(extracted)) {
    return null;
  }

  return extracted;
}

function getCatalogPassageTitle(test: TestCatalogItem) {
  if (test.sectionTitle && test.sectionTitle !== test.title) {
    return test.sectionTitle;
  }

  if (test.format !== "full") {
    return extractPassageTitleFromTestTitle(test.title);
  }

  return null;
}

export function getCatalogCardTitleDisplay(test: TestCatalogItem) {
  const sourceKey = getCatalogTestSource(test);
  const testNumber = getCatalogTestNumber(test);
  const skillLabel = test.type === "listening" ? "Listening" : "Reading";
  const sourceLabel = getTestSourceLabel(test.source);

  if (sourceKey === "cambridge") {
    const bookNumber = getCambridgeBookNumber(test);
    const skillTestNumber = getCambridgeSkillTestNumber(test);

    return {
      title: skillTestNumber ? `${skillLabel} Test - ${skillTestNumber}` : test.title,
      subtitle: bookNumber ? `${sourceLabel} - ${bookNumber}` : sourceLabel,
    };
  }

  if (test.format !== "full") {
    return {
      title: testNumber ? `${sourceLabel} - ${testNumber}` : sourceLabel,
      subtitle: getCatalogPassageTitle(test),
    };
  }

  return {
    title: sourceLabel,
    subtitle: testNumber ? `Test - ${testNumber}` : null,
  };
}

export function getCatalogCardTitleClassName(test: TestCatalogItem) {
  return test.format === "full" ? "text-[18px]" : "text-[15px]";
}

export function getCatalogBookmarkItem(test: TestCatalogItem) {
  return {
    id: test.id,
    slug: test.slug,
    title: test.title,
    type: test.type,
    format: test.format,
    accessType: test.accessType,
    source: test.source,
    sourceLabel: getTestSourceLabel(test.source),
    description: test.description,
    questionCount: test.questionCount,
    estimatedMinutes: test.estimatedMinutes,
    href: `/tests/${test.slug || test.id}`,
    actionLabel: test.accessType === "premium" ? "Unlock" : "Open Test",
  };
}

export function getCatalogCompletedScoreLabel(test: TestCatalogItem, attempt: AttemptRow | undefined) {
  if (!attempt) {
    return test.format === "full" ? `0/${test.questionCount} correct • Band 0.0` : `0/${test.questionCount} correct`;
  }

  const totalQuestions = attempt.totalQuestions ?? test.questionCount;
  const score = attempt.score || "0";
  return attempt.band ? `${score}/${totalQuestions} correct • Band ${attempt.band}` : `${score}/${totalQuestions} correct`;
}

export function filterPracticeCatalogTests({
  catalogTests,
  testType,
  source,
  format,
  access,
  query,
}: {
  catalogTests: TestCatalogItem[];
  testType: PracticeCatalogType;
  source: PracticeCatalogSource;
  format: string;
  access: PracticeCatalogAccess;
  query: string;
}) {
  const searchQuery = query.trim().toLowerCase();

  return catalogTests
    .filter((test) => test.type === testType && test.status === "published")
    .filter((test) => source === "all" || getCatalogTestSource(test) === source)
    .filter((test) => format === "all" || test.format === format)
    .filter((test) => access === "all" || getCatalogTestAccess(test) === access)
    .filter((test) => {
      if (!searchQuery) {
        return true;
      }

      return `${test.title} ${test.sectionTitle ?? ""} ${test.sourceDetail} ${getTestSourceLabel(test.source)} ${formatCatalogTestFormat(test.format)} ${getCatalogTestAccess(test)}`
        .toLowerCase()
        .includes(searchQuery);
    });
}

export { isNewTestCreatedAt };
