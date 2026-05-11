import type { TestCatalogItem } from "@/lib/types";

export function pickQuickTests<T extends Pick<TestCatalogItem, "id">>(
  tests: T[],
  attemptedTestIds: Set<string>,
  limit = 3,
  random = Math.random,
): T[] {
  const published = [...tests];
  const fresh = published.filter((test) => !attemptedTestIds.has(test.id));
  const attempted = published.filter((test) => attemptedTestIds.has(test.id));

  const shuffle = (items: T[]) => {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  };

  return [...shuffle(fresh), ...shuffle(attempted)].slice(0, limit);
}
