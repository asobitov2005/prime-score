import { AttemptRow, TestCatalogItem, getTestSourceLabel } from "./page-dependencies";
import { listeningTestCards } from "./page-part-04";
import { getContinueHref } from "./page-part-05";
import { ReadingTestCard } from "./page-part-06";

export function getReadingFormatBadgeLabel(format: ReadingTestCard["format"]) {
  if (format === "full") {
    return "Full Test";
  }

  return format
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getReadingCardTitleDisplay(card: ReadingTestCard) {
  if (card.source === "cambridge") {
    const [mainTitle, secondaryTitle] = card.title.split(/\s*[—-]\s*/);

    return {
      title: mainTitle?.trim() || card.title,
      subtitle: secondaryTitle?.trim() || null,
    };
  }

  const explicitTestNumber = card.title.match(/\bTest\s*(\d+)\b/i)?.[1];
  const trailingNumber = card.title.match(/(\d+)\s*$/)?.[1];
  const testNumber = explicitTestNumber ?? trailingNumber;
  const passageTitle = card.title
    .replace(/\s*[—-]\s*Test\s*\d+\s*$/i, "")
    .replace(/\s+\d+\s*$/, "")
    .trim();
  const shouldShowSubtitle = passageTitle
    && passageTitle !== card.title
    && passageTitle.toLowerCase() !== "recent exam paper";

  return {
    title: testNumber ? `Test ${testNumber}` : card.title,
    subtitle: shouldShowSubtitle ? passageTitle : null,
  };
}

export function getReadingCompletedScoreLabel(format: ReadingTestCard["format"]) {
  if (format === "full") {
    return "0/40 correct • Band 0.0";
  }

  return "10/12 correct";
}

export function getReadingBookmarkItem(card: ReadingTestCard) {
  return {
    id: card.id,
    title: card.title,
    type: "reading" as const,
    format: card.format,
    accessType: card.access === "premium" ? ("premium" as const) : ("public" as const),
    source: card.source,
    sourceLabel: getTestSourceLabel(card.source),
    description: card.meta,
    questionCount: null,
    estimatedMinutes: null,
    href: card.href,
    actionLabel: card.button,
  };
}

export type ListeningTestCard = (typeof listeningTestCards)[number];

export function getListeningCardTestNumber(card: ListeningTestCard) {
  return card.title.match(/\bTest\s*(\d+)\b/i)?.[1] ?? card.title.match(/(\d+)\s*$/)?.[1] ?? null;
}

export function getListeningCardFallbackHref(
  card: ListeningTestCard,
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
  return `/exam-preview/listening?testId=${encodeURIComponent(testId)}&mode=guest`;
}

export function getListeningFormatBadgeLabel(format: ListeningTestCard["format"]) {
  if (format === "full") {
    return "Full Test";
  }

  return format
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getListeningCardTitleDisplay(card: ListeningTestCard) {
  if (card.source === "cambridge") {
    const [mainTitle, secondaryTitle] = card.title.split(/\s*[—-]\s*/);

    return {
      title: mainTitle?.trim() || card.title,
      subtitle: secondaryTitle?.trim() || null,
    };
  }

  const explicitTestNumber = card.title.match(/\bTest\s*(\d+)\b/i)?.[1];
  const trailingNumber = card.title.match(/(\d+)\s*$/)?.[1];
  const testNumber = explicitTestNumber ?? trailingNumber;
  const partTitle = card.title
    .replace(/\s*[—-]\s*Test\s*\d+\s*$/i, "")
    .replace(/\s+\d+\s*$/, "")
    .trim();
  const shouldShowSubtitle = partTitle
    && partTitle !== card.title
    && partTitle.toLowerCase() !== "recent exam paper";

  return {
    title: testNumber ? `Test ${testNumber}` : card.title,
    subtitle: shouldShowSubtitle ? partTitle : null,
  };
}

export function getListeningCompletedScoreLabel(format: ListeningTestCard["format"]) {
  if (format === "full") {
    return "0/40 correct • Band 0.0";
  }

  return "8/10 correct";
}

export function getListeningBookmarkItem(card: ListeningTestCard) {
  return {
    id: card.id,
    title: card.title,
    type: "listening" as const,
    format: card.format,
    accessType: card.access === "premium" ? ("premium" as const) : ("public" as const),
    source: card.source,
    sourceLabel: getTestSourceLabel(card.source),
    description: card.meta,
    questionCount: null,
    estimatedMinutes: null,
    href: card.href,
    actionLabel: card.button,
  };
}
