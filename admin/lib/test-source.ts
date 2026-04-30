const ADMIN_TEST_SOURCE_LABELS = {
  cambridge: "Cambridge Official",
  real_exam: "Recent Exam Papers",
  custom: "Exam Practice Tests",
} as const;

type AdminTestSourceKey = keyof typeof ADMIN_TEST_SOURCE_LABELS;

export function getAdminTestSourceKey(source: string | null | undefined): AdminTestSourceKey {
  const normalized = String(source ?? "").trim().toLowerCase();
  if (normalized === "cambridge" || normalized.includes("cambridge")) {
    return "cambridge";
  }
  if (normalized === "real_exam" || normalized.includes("real exam") || normalized.includes("recent exam papers")) {
    return "real_exam";
  }
  return "custom";
}

export function getAdminTestSourceLabel(source: string | null | undefined): string {
  return ADMIN_TEST_SOURCE_LABELS[getAdminTestSourceKey(source)];
}

export function normalizeAdminTestSourceDetail(source: string | null | undefined, detail: string | null | undefined): string {
  const normalizedDetail = String(detail ?? "").trim().toLowerCase();
  if (
    !normalizedDetail
    || normalizedDetail === "cambridge official"
    || normalizedDetail === "real exam material"
    || normalizedDetail === "custom practice"
    || normalizedDetail === "recent exam papers"
    || normalizedDetail === "exam practice tests"
  ) {
    return getAdminTestSourceLabel(source);
  }
  return String(detail ?? "").trim();
}

export const adminTestSourceOptions = [
  { value: "cambridge", label: ADMIN_TEST_SOURCE_LABELS.cambridge },
  { value: "real_exam", label: ADMIN_TEST_SOURCE_LABELS.real_exam },
  { value: "custom", label: ADMIN_TEST_SOURCE_LABELS.custom },
] as const;

