import { APP_TIME_ZONE, BackendAttemptSnapshot, CheckCircle2, CircleHelp, LucideIcon, Target, TestType } from "./page-dependencies";
import { BreakdownItem, QuestionTypeBreakdownItem, ReviewTarget, SectionBreakdownItem } from "./page-part-01";

export function buildSectionBreakdown(
  items: BreakdownItem[],
  testType: TestType,
  totalQuestions: number,
  reviewHref: string,
  targets: ReviewTarget[],
): SectionBreakdownItem[] {
  const sectionPrefix = testType === "listening" ? "Part" : "Passage";
  const fallbackTotals = testType === "listening" ? [10, 10, 10, 10] : [13, 13, 14];
  const sourceItems = items.length > 0
    ? items
    : fallbackTotals.map((total, index) => ({
        label: `${sectionPrefix} ${index + 1}`,
        correct: 0,
        total,
      }));

  const targetItems = testType === "reading" ? sourceItems.slice(0, 3) : sourceItems;
  const normalizedItems = targetItems.length > 0
    ? targetItems
    : fallbackTotals.map((total, index) => ({ label: `${sectionPrefix} ${index + 1}`, correct: 0, total }));

  return normalizedItems.map((item, index) => {
    const total = Math.max(0, item.total || fallbackTotals[index] || Math.ceil(totalQuestions / normalizedItems.length) || 0);
    const correct = Math.max(0, item.correct || 0);
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const title = `${sectionPrefix} ${index + 1}`;

    return {
      label: item.label,
      title,
      reviewLabel: `Review ${title}`,
      correct,
      total,
      percent,
      href: withReviewTarget(reviewHref, targets[index] ?? {}),
    };
  });
}

export function buildQuestionTypeBreakdown(
  items: BreakdownItem[],
  reviewHref: string,
): QuestionTypeBreakdownItem[] {
  return items
    .filter((item) => item.total > 0)
    .map((item) => {
      const total = Math.max(0, item.total || 0);
      const correct = Math.max(0, item.correct || 0);
      const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
      const title = formatQuestionTypeLabel(item.label);

      return {
        ...item,
        title,
        reviewLabel: `Review ${title}`,
        correct,
        total,
        percent,
        href: withReviewTarget(reviewHref, { questionType: item.label }),
      };
    });
}

export function formatQuestionTypeLabel(value: string): string {
  return String(value || "Question type")
    .replace(/^(reading|listening)[_\s-]+/i, "")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "mc") return "MC";
      if (lower === "tfng") return "TFNG";
      if (lower === "ynng") return "YNNG";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function buildSectionReviewTargets(snapshot: BackendAttemptSnapshot | null): ReviewTarget[] {
  return (snapshot?.sections ?? []).map((section) => ({ sectionId: section.section_id }));
}

export function withReviewTarget(baseHref: string, target: ReviewTarget): string {
  const params = new URLSearchParams();

  if (target.sectionId) {
    params.set("sectionId", target.sectionId);
  }
  if (target.questionId) {
    params.set("questionId", target.questionId);
  }
  if (target.questionType) {
    params.set("questionType", normalizeQuestionTypeKey(target.questionType));
  }

  const query = params.toString();
  if (!query) {
    return baseHref;
  }

  return `${baseHref}${baseHref.includes("?") ? "&" : "?"}${query}`;
}

export function normalizeQuestionTypeKey(value: string | null | undefined): string {
  const normalized = String(value ?? "")
    .replace(/^(reading|listening)_/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  if (normalized === "tfng") return "true_false_not_given";
  if (normalized === "ynng") return "yes_no_not_given";
  if (normalized === "mcq" || normalized === "mc") return "multiple_choice";
  return normalized;
}

export function getScoreStatus(scorePercent: number): {
  label: string;
  icon: LucideIcon;
  className: string;
} {
  if (scorePercent >= 80) {
    return {
      label: "Strong result",
      icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    };
  }
  if (scorePercent >= 50) {
    return {
      label: "Developing",
      icon: Target,
      className: "bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    };
  }
  return {
    label: "Needs more practice",
    icon: CircleHelp,
    className: "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
  };
}

export function formatXpAmount(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

export function formatCompletedDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(parsed);
}

export function formatViolationTime(value: string | null | undefined): string {
  if (!value) {
    return "--:--:--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--:--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(parsed);
}
