import type { AttemptMode, TestScope, TestType } from "@/lib/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ExamStartParams {
  testType: TestType | string;
  testId: string;
  scope: TestScope | string;
  mode: AttemptMode | string;
  sectionId?: string;
  forceNew?: boolean;
}

export interface NormalizedExamStart {
  scope: TestScope;
  mode: AttemptMode;
  sectionId?: string;
  forceNew: boolean;
}

/**
 * Mirrors the normalization in the internal attempts/start route so that the
 * exam-preview server page and the start buttons agree on the effective scope.
 */
export function normalizeExamStart(params: {
  scope?: string;
  mode?: string;
  sectionId?: string;
  forceNew?: boolean;
}): NormalizedExamStart {
  const hasValidSectionId = Boolean(params.sectionId && UUID_PATTERN.test(params.sectionId));
  const scope: TestScope = params.scope === "section" && hasValidSectionId ? "section" : "full";
  // Section-level attempts are always practice.
  const mode: AttemptMode = scope === "section" ? "practice" : params.mode === "exam" ? "exam" : "practice";

  return {
    scope,
    mode,
    sectionId: scope === "section" && hasValidSectionId ? params.sectionId : undefined,
    forceNew: Boolean(params.forceNew),
  };
}

/**
 * Builds the exam-preview href that defers attempt creation to the server, so
 * navigation is instant and the loading skeleton renders on the exam page
 * instead of leaving the user waiting on the catalog.
 */
export function buildExamStartHref(params: ExamStartParams): string {
  const normalized = normalizeExamStart({
    scope: typeof params.scope === "string" ? params.scope : undefined,
    mode: typeof params.mode === "string" ? params.mode : undefined,
    sectionId: params.sectionId,
    forceNew: params.forceNew,
  });

  const search = new URLSearchParams();
  search.set("testId", params.testId);
  search.set("scope", normalized.scope);
  search.set("mode", normalized.mode);
  search.set("start", "1");
  if (normalized.sectionId) {
    search.set("sectionId", normalized.sectionId);
  }
  if (normalized.forceNew) {
    search.set("forceNew", "1");
  }
  search.set("resume", String(Date.now()));

  const base = params.testType === "reading" ? "/exam-preview/reading" : "/exam-preview/listening";
  return `${base}?${search.toString()}`;
}
