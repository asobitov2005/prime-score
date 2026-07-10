import { getTestSourceLabel } from "@/lib/test-source";
import type { AttemptRow, TestCatalogItem } from "@/lib/types";
import type {
  PracticeCatalogAccess,
  PracticeCatalogSource,
  PracticeCatalogType,
} from "./practice-catalog-params";
import { formatCatalogTestFormat } from "./practice-catalog-attempts";
import {
  catalogNumberHelpers,
  getCatalogTestAccess,
  getCatalogTestSource,
} from "./practice-catalog-sorting";

function extractPassageTitleFromTestTitle(title: string) {
  const match = title.match(/^(.+?)\s*[—-]\s*Test\s*\d+\s*$/i);
  if (!match) return null;

  const extracted = match[1].trim();
  return /^cambridge\s*\d+/i.test(extracted) ? null : extracted;
}

function getCatalogPassageTitle(test: TestCatalogItem) {
  if (test.sectionTitle && test.sectionTitle !== test.title) {
    return test.sectionTitle;
  }
  return test.format !== "full"
    ? extractPassageTitleFromTestTitle(test.title)
    : null;
}

export function getCatalogCardTitleDisplay(test: TestCatalogItem) {
  const sourceKey = getCatalogTestSource(test);
  const testNumber = catalogNumberHelpers.getCatalogTestNumber(test);
  const skillLabel = test.type === "listening" ? "Listening" : "Reading";
  const sourceLabel = getTestSourceLabel(test.source);

  if (sourceKey === "cambridge") {
    const bookNumber = catalogNumberHelpers.getCambridgeBookNumber(test);
    const skillTestNumber =
      catalogNumberHelpers.getCambridgeSkillTestNumber(test);
    return {
      title: skillTestNumber
        ? `${skillLabel} Test - ${skillTestNumber}`
        : test.title,
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

export function getCatalogCompletedScoreLabel(
  test: TestCatalogItem,
  attempt: AttemptRow | undefined,
) {
  if (!attempt) {
    return test.format === "full"
      ? `0/${test.questionCount} correct • Band 0.0`
      : `0/${test.questionCount} correct`;
  }

  const totalQuestions = attempt.totalQuestions ?? test.questionCount;
  const score = attempt.score || "0";
  return attempt.band
    ? `${score}/${totalQuestions} correct • Band ${attempt.band}`
    : `${score}/${totalQuestions} correct`;
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
    .filter(
      (test) => source === "all" || getCatalogTestSource(test) === source,
    )
    .filter((test) => format === "all" || test.format === format)
    .filter(
      (test) => access === "all" || getCatalogTestAccess(test) === access,
    )
    .filter((test) => {
      if (!searchQuery) return true;
      return `${test.title} ${test.sectionTitle ?? ""} ${test.sourceDetail} ${getTestSourceLabel(test.source)} ${formatCatalogTestFormat(test.format)} ${getCatalogTestAccess(test)}`
        .toLowerCase()
        .includes(searchQuery);
    });
}
