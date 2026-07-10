import type {
  AttemptRow,
  TestCardAttemptSummary,
  TestCatalogItem,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function formatCatalogTestFormat(
  testFormat: TestCatalogItem["format"],
) {
  if (!testFormat || testFormat === "full") {
    return "Full Test";
  }

  return testFormat
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isCompletedCatalogAttempt(attempt: AttemptRow) {
  return attempt.status === "completed" || attempt.status === "submitted";
}

export function toCatalogAttemptSummary(
  attempt: AttemptRow,
): TestCardAttemptSummary {
  return {
    id: attempt.id,
    mode: attempt.mode,
    status: attempt.status,
    score: attempt.score,
    band: attempt.band,
    totalQuestions: attempt.totalQuestions,
    lastSavedAt: attempt.lastSavedAt,
  };
}

function isResumeOrReviewAction(label: string) {
  return label === "Continue" || label === "Review";
}

export function getCatalogActionButtonClassName(
  label: string,
  isPremiumCard: boolean,
) {
  return cn(
    "h-9 w-full gap-2 rounded-lg text-sm font-semibold shadow-none",
    !isPremiumCard && isResumeOrReviewAction(label)
      ? "border border-orange-200 bg-orange-50 text-orange-600 hover:border-orange-300 hover:bg-orange-50/90 dark:border-orange-500/25 dark:bg-orange-500/8 dark:text-orange-300 dark:hover:border-orange-500/35 dark:hover:bg-orange-500/12"
      : "border border-orange-200 bg-white text-orange-600 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-slate-950/40 dark:text-orange-300 dark:hover:bg-orange-500/10",
  );
}
