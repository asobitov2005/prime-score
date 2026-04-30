const TEST_SOURCE_LABELS = {
  cambridge: "Cambridge Official",
  real_exam: "Recent Exam Papers",
  custom: "Exam Practice Tests",
} as const;

type TestSourceKey = keyof typeof TEST_SOURCE_LABELS;

const LEGACY_SOURCE_LABELS: Record<string, TestSourceKey> = {
  "cambridge official": "cambridge",
  "real exam material": "real_exam",
  "custom practice": "custom",
  "recent exam papers": "real_exam",
  "exam practice tests": "custom",
};

export function getTestSourceKey(source: string | null | undefined): TestSourceKey | null {
  const normalized = String(source ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "cambridge" || normalized.includes("cambridge")) {
    return "cambridge";
  }
  if (normalized === "real_exam" || normalized.includes("real exam") || normalized.includes("recent exam papers")) {
    return "real_exam";
  }
  if (normalized === "custom" || normalized.includes("custom practice") || normalized.includes("exam practice tests")) {
    return "custom";
  }
  return LEGACY_SOURCE_LABELS[normalized] ?? null;
}

export function getTestSourceLabel(source: string | null | undefined): string {
  const key = getTestSourceKey(source);
  return key ? TEST_SOURCE_LABELS[key] : TEST_SOURCE_LABELS.custom;
}

export function getTestSourceDetail(source: string | null | undefined, detail: string | null | undefined): string {
  const normalizedDetail = String(detail ?? "").trim();
  if (!normalizedDetail) {
    return getTestSourceLabel(source);
  }

  const detailKey = getTestSourceKey(normalizedDetail);
  if (detailKey) {
    return TEST_SOURCE_LABELS[detailKey];
  }

  return normalizedDetail;
}

export function matchesTestSourceFilter(
  source: string | null | undefined,
  detail: string | null | undefined,
  requestedSource: string | null | undefined,
): boolean {
  const requestedKey = getTestSourceKey(requestedSource);
  if (!requestedKey) {
    return true;
  }

  return getTestSourceKey(source) === requestedKey || getTestSourceKey(detail) === requestedKey;
}

export const testSourceOptions = [
  { id: "", label: "All Materials" },
  { id: "cambridge", label: TEST_SOURCE_LABELS.cambridge },
  { id: "real_exam", label: TEST_SOURCE_LABELS.real_exam },
  { id: "custom", label: TEST_SOURCE_LABELS.custom },
] as const;

