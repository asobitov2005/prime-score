import { TestCatalogItem, getTestSourceKey } from "./page-dependencies";
import { normalizeMatchText } from "./page-part-05";
import { getCatalogTestNumber } from "./page-part-06";
import { ListeningTestCard, getListeningCardTestNumber, getListeningCardTitleDisplay } from "./page-part-07";

export function resolveListeningCardTest(card: ListeningTestCard, catalogTests: TestCatalogItem[]) {
  const titleDisplay = getListeningCardTitleDisplay(card);
  const cardTitle = normalizeMatchText(card.title);
  const cardMainTitle = normalizeMatchText(titleDisplay.title);
  const cardSubtitle = normalizeMatchText(titleDisplay.subtitle);
  const cardNumber = getListeningCardTestNumber(card);

  const candidates = catalogTests.filter((test) => test.type === "listening" && test.status === "published");
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
    } else if (card.format !== "full" && String(test.format).startsWith("part_")) {
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
