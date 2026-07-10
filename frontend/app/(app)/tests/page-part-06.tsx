import { AttemptRow, CheckCircle2, ComponentType, Image, TestCatalogItem, cn, getTestSourceKey } from "./page-dependencies";
import { readingTestCards } from "./page-part-03";
import { compareReadingCardsByNewestTestNumber, getCambridgeBookAndTest, getContinueHref, getReadingCardTestNumber, normalizeMatchText } from "./page-part-05";
import { getReadingCardTitleDisplay } from "./page-part-07";

export function compareCambridgeReadingCards(a: ReadingTestCard, b: ReadingTestCard) {
  const aCambridge = getCambridgeBookAndTest(a);
  const bCambridge = getCambridgeBookAndTest(b);

  if (aCambridge.book !== null && bCambridge.book !== null && aCambridge.book !== bCambridge.book) {
    return bCambridge.book - aCambridge.book;
  }

  if (aCambridge.book !== null && bCambridge.book === null) {
    return -1;
  }

  if (aCambridge.book === null && bCambridge.book !== null) {
    return 1;
  }

  if (aCambridge.test !== null && bCambridge.test !== null && aCambridge.test !== bCambridge.test) {
    return aCambridge.test - bCambridge.test;
  }

  return compareReadingCardsByNewestTestNumber(a, b);
}

export function getCatalogTestNumber(test: TestCatalogItem) {
  return test.title.match(/\bTest\s*(\d+)\b/i)?.[1] ?? test.sourceDetail.match(/\bTest\s*(\d+)\b/i)?.[1] ?? null;
}

export function getCatalogTestNumberValue(test: TestCatalogItem) {
  const value = getCatalogTestNumber(test);
  return value ? Number(value) : null;
}

export function getReadingCardFallbackHref(
  card: ReadingTestCard,
  resolvedTest: TestCatalogItem | undefined,
  activeAttempt: AttemptRow | undefined,
  completedAttempt: AttemptRow | undefined,
) {
  if (card.access === "premium") {
    return "/subscription";
  }

  if (activeAttempt) {
    return getContinueHref(activeAttempt);
  }

  if (completedAttempt) {
    return `/attempts/${completedAttempt.id}/result`;
  }

  const testId = resolvedTest?.id ?? card.id;
  return `/exam-preview/reading?testId=${encodeURIComponent(testId)}&mode=guest`;
}

export function resolveReadingCardTest(card: ReadingTestCard, catalogTests: TestCatalogItem[]) {
  const titleDisplay = getReadingCardTitleDisplay(card);
  const cardTitle = normalizeMatchText(card.title);
  const cardMainTitle = normalizeMatchText(titleDisplay.title);
  const cardSubtitle = normalizeMatchText(titleDisplay.subtitle);
  const cardNumber = getReadingCardTestNumber(card);

  const candidates = catalogTests.filter((test) => test.type === "reading" && test.status === "published");
  const exact = candidates.find((test) => test.id === card.id || test.slug === card.id || normalizeMatchText(test.title) === cardTitle);
  if (exact) {
    return exact;
  }

  let bestMatch: { test: TestCatalogItem; score: number } | null = null;

  for (const test of candidates) {
    const testTitle = normalizeMatchText(test.title);
    const testSourceDetail = normalizeMatchText(test.sourceDetail);
    const testSectionText = normalizeMatchText(test.sections.map((section) => `${section.title} ${section.teaser}`).join(" "));
    const testNumber = getCatalogTestNumber(test);
    let score = 0;

    if (getTestSourceKey(test.source) === card.source || getTestSourceKey(test.sourceDetail) === card.source) {
      score += 6;
    }

    if (test.format === card.format) {
      score += 4;
    } else if (card.format !== "full" && test.format !== "full") {
      score += 2;
    }

    if ((card.access === "premium") === (test.accessType === "premium")) {
      score += 1;
    }

    if (cardNumber && testNumber === cardNumber) {
      score += 3;
    }

    if (cardMainTitle && (testTitle.includes(cardMainTitle) || cardMainTitle.includes(testTitle))) {
      score += 4;
    }

    if (cardSubtitle && (testTitle.includes(cardSubtitle) || testSectionText.includes(cardSubtitle) || testSourceDetail.includes(cardSubtitle))) {
      score += 5;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { test, score };
    }
  }

  if (bestMatch && bestMatch.score > 0) {
    return bestMatch.test;
  }

  return candidates.find((test) => getTestSourceKey(test.source) === card.source || getTestSourceKey(test.sourceDetail) === card.source)
    ?? candidates[0];
}

export function formatDisplay(testFormat: TestCatalogItem["format"]) {
  if (!testFormat || testFormat === "full") {
    return "Full Test";
  }

  return testFormat
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

export function CollectionImageTile({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative h-[4.25rem] w-[3.125rem] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800",
        className,
      )}
    >
      <Image src={src} alt={alt} fill sizes="96px" quality={100} className="object-cover" />
    </span>
  );
}

export function ReadingCompletedBadge() {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25">
      <CheckCircle2 className="h-3 w-3" />
      Completed
    </span>
  );
}

export function NewTestBadge() {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-red-200 bg-red-50 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
      New
    </span>
  );
}

export type ReadingTestCard = (typeof readingTestCards)[number];
