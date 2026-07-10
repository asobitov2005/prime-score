import type { AttemptRow, TestCatalogItem } from "@/lib/types";
import type {
  PracticeCatalogAccess,
  PracticeCatalogSort,
  PracticeCatalogSource,
} from "./practice-catalog-params";
import { isCompletedCatalogAttempt } from "./practice-catalog-attempts";
import { getTestSourceKey } from "@/lib/test-source";

function getCatalogTestNumber(test: TestCatalogItem) {
  return (
    test.title.match(/\bTest\s*(\d+)\b/i)?.[1] ??
    test.sourceDetail.match(/\bTest\s*(\d+)\b/i)?.[1] ??
    null
  );
}

function getCatalogTestNumberValue(test: TestCatalogItem) {
  const value = getCatalogTestNumber(test);
  return value ? Number(value) : null;
}

export function getCatalogTestSource(
  test: TestCatalogItem,
): Exclude<PracticeCatalogSource, "all"> {
  return (
    getTestSourceKey(test.source) ??
    getTestSourceKey(test.sourceDetail) ??
    "custom"
  );
}

export function getCatalogTestAccess(
  test: TestCatalogItem,
): Exclude<PracticeCatalogAccess, "all"> {
  return test.accessType === "premium" ? "premium" : "free";
}

function getCatalogTestCreatedTime(test: TestCatalogItem) {
  const time = new Date(test.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareCatalogTestsByNewest(
  a: TestCatalogItem,
  b: TestCatalogItem,
) {
  const aCreated = getCatalogTestCreatedTime(a);
  const bCreated = getCatalogTestCreatedTime(b);
  if (aCreated !== bCreated) return bCreated - aCreated;

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
  if (
    userAttempts.some(
      (attempt) => attempt.testId === test.id && attempt.status === "in_progress",
    )
  ) {
    return "active";
  }
  if (
    userAttempts.some(
      (attempt) =>
        attempt.testId === test.id && isCompletedCatalogAttempt(attempt),
    )
  ) {
    return "completed";
  }
  return "none";
}

function getCardAttemptSortRank(
  state: "completed" | "active" | "none",
  sort: PracticeCatalogSort,
) {
  return sort === "not_attempted" && state !== "none" ? 1 : 0;
}

function getCambridgeBookNumber(test: TestCatalogItem) {
  return test.title.match(/\bCambridge\s*(\d+)\b/i)?.[1] ?? null;
}

function getCambridgeSkillTestNumber(test: TestCatalogItem) {
  return (
    test.title.match(/\b(?:Reading|Listening)\s+Test\s*(\d+)\b/i)?.[1] ??
    getCatalogTestNumber(test)
  );
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
    } else {
      otherTests.push(test);
    }
  }

  for (const bookTests of cambridgeGroups.values()) {
    bookTests.sort(
      (a, b) =>
        (getCambridgeTestNumberValue(a) ?? 999) -
        (getCambridgeTestNumberValue(b) ?? 999),
    );
  }

  return {
    sortedBooks: [...cambridgeGroups.keys()].sort((a, b) => b - a),
    cambridgeGroups,
    otherTests,
  };
}

export function sortCatalogTests(
  tests: TestCatalogItem[],
  sort: PracticeCatalogSort,
  userAttempts: AttemptRow[],
) {
  return tests.slice().sort((a, b) => {
    if (sort === "oldest") {
      return getCatalogTestCreatedTime(a) - getCatalogTestCreatedTime(b);
    }
    if (sort === "title_az") return a.title.localeCompare(b.title);
    if (sort === "not_attempted") {
      const rankA = getCardAttemptSortRank(
        getCatalogCardAttemptState(a, userAttempts),
        sort,
      );
      const rankB = getCardAttemptSortRank(
        getCatalogCardAttemptState(b, userAttempts),
        sort,
      );
      if (rankA !== rankB) return rankA - rankB;
    }
    return compareCatalogTestsByNewest(a, b);
  });
}

export const catalogNumberHelpers = {
  getCatalogTestNumber,
  getCambridgeBookNumber,
  getCambridgeSkillTestNumber,
};
