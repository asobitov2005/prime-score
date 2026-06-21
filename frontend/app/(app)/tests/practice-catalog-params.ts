export type PracticeCatalogType = "reading" | "listening";
export type PracticeCatalogSource = "all" | "cambridge" | "real_exam" | "custom";
export type PracticeCatalogReadingFormat = "all" | "full" | "passage_1" | "passage_2" | "passage_3";
export type PracticeCatalogListeningFormat = "all" | "full" | "part_1" | "part_2" | "part_3" | "part_4";
export type PracticeCatalogFormat = PracticeCatalogReadingFormat | PracticeCatalogListeningFormat;
export type PracticeCatalogAccess = "all" | "free" | "premium";
export type PracticeCatalogSort = "newest" | "oldest" | "title_az" | "not_attempted";

export type PracticeCatalogFilters = {
  source: PracticeCatalogSource;
  format: PracticeCatalogFormat;
  access: PracticeCatalogAccess;
  sort: PracticeCatalogSort;
  query: string;
};

export function normalizePracticeCatalogSource(value: string | null | undefined): PracticeCatalogSource {
  return value === "cambridge" || value === "real_exam" || value === "custom" ? value : "all";
}

export function normalizePracticeCatalogReadingFormat(value: string | null | undefined): PracticeCatalogReadingFormat {
  return value === "full" || value === "passage_1" || value === "passage_2" || value === "passage_3" ? value : "all";
}

export function normalizePracticeCatalogListeningFormat(value: string | null | undefined): PracticeCatalogListeningFormat {
  return value === "full" || value === "part_1" || value === "part_2" || value === "part_3" || value === "part_4" ? value : "all";
}

export function normalizePracticeCatalogAccess(value: string | null | undefined): PracticeCatalogAccess {
  return value === "free" || value === "premium" ? value : "all";
}

export function normalizePracticeCatalogSort(value: string | null | undefined): PracticeCatalogSort {
  return value === "oldest" || value === "title_az" || value === "not_attempted" ? value : "newest";
}

export function parsePracticeCatalogFilters(
  searchParams: URLSearchParams,
  testType: PracticeCatalogType,
): PracticeCatalogFilters {
  const formatNormalizer = testType === "listening"
    ? normalizePracticeCatalogListeningFormat
    : normalizePracticeCatalogReadingFormat;

  return {
    source: normalizePracticeCatalogSource(searchParams.get("source")),
    format: formatNormalizer(searchParams.get("format")),
    access: normalizePracticeCatalogAccess(searchParams.get("access")),
    sort: normalizePracticeCatalogSort(searchParams.get("sort")),
    query: (searchParams.get("q") ?? "").trim(),
  };
}

export function buildPracticeCatalogSearchParams(
  testType: PracticeCatalogType,
  filters: PracticeCatalogFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("type", testType);

  if (filters.source !== "all") {
    params.set("source", filters.source);
  }

  if (filters.format !== "all") {
    params.set("format", filters.format);
  }

  if (filters.access !== "all") {
    params.set("access", filters.access);
  }

  if (filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  return params;
}

export function buildPracticeCatalogPath(testType: PracticeCatalogType, filters: PracticeCatalogFilters) {
  const query = buildPracticeCatalogSearchParams(testType, filters).toString();
  return `/tests${query ? `?${query}` : ""}`;
}

export function replacePracticeCatalogUrl(testType: PracticeCatalogType, filters: PracticeCatalogFilters) {
  if (typeof window === "undefined") {
    return;
  }

  const nextPath = buildPracticeCatalogPath(testType, filters);
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (nextPath === currentPath) {
    return;
  }

  window.history.replaceState(window.history.state, "", nextPath);
}
