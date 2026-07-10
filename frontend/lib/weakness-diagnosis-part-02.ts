import { AttemptRow, DashboardAnalytics, DashboardQuestionTypeAnalysisItem, DashboardQuestionTypeComparisonItem } from "./weakness-diagnosis-dependencies";
import { MIN_AGGREGATE_WORKED, MIN_LATEST_WORKED, RankedWeakness, WeaknessDiagnosis, WeaknessInsight, severityForAccuracy, statusForAccuracy } from "./weakness-diagnosis-part-01";

export function buildInsightFromLatest(
  item: DashboardQuestionTypeComparisonItem,
  currentTestTitle: string | null,
): WeaknessInsight | null {
  if (item.currentAccuracy === null || (item.currentWorkedCount ?? 0) < MIN_LATEST_WORKED) {
    return null;
  }

  const workedCount = item.currentWorkedCount ?? 0;
  const errorCount = item.currentErrorCount ?? 0;
  const correctCount = Math.max(0, workedCount - errorCount);
  const testLabel = currentTestTitle ? `"${currentTestTitle}"` : "latest test";

  return {
    label: item.label,
    value: `${Math.round(item.currentAccuracy)}%`,
    detail: `${correctCount}/${workedCount} correct in ${testLabel}`,
    scorePercent: Math.max(0, Math.min(100, Math.round(item.currentAccuracy))),
  };
}

export function buildInsightFromAggregate(item: DashboardQuestionTypeAnalysisItem): WeaknessInsight | null {
  if (item.workedCount < MIN_AGGREGATE_WORKED) {
    return null;
  }

  return {
    label: item.label,
    value: `${Math.round(item.accuracy)}%`,
    detail: `${item.errorCount} missed in ${item.workedCount} questions overall`,
    scorePercent: Math.max(0, Math.min(100, Math.round(item.accuracy))),
  };
}

export function getLatestInsights(analytics: DashboardAnalytics): WeaknessInsight[] {
  return analytics.comparison.items
    .map((item) => buildInsightFromLatest(item, analytics.comparison.currentTestTitle))
    .filter((item): item is WeaknessInsight => item !== null)
    .sort((left, right) => left.scorePercent - right.scorePercent)
    .slice(0, 3);
}

export function getAggregateInsights(analysis: DashboardQuestionTypeAnalysisItem[]): WeaknessInsight[] {
  return analysis
    .map(buildInsightFromAggregate)
    .filter((item): item is WeaknessInsight => item !== null)
    .sort((left, right) => left.scorePercent - right.scorePercent)
    .slice(0, 3);
}

export function getReviewHref(lastCompletedAttempt: AttemptRow | null, skill: "reading" | "listening"): string {
  if (lastCompletedAttempt && (lastCompletedAttempt.type === "reading" || lastCompletedAttempt.type === "listening")) {
    if (lastCompletedAttempt.type === skill) {
      return `/attempts/${lastCompletedAttempt.id}/result`;
    }
  }
  return `/analytics/${skill}`;
}

export function getPracticeHref(skill: "reading" | "listening"): string {
  return `/tests?type=${skill}`;
}

export function formatSecondsShort(seconds: number | null): string {
  if (seconds === null) return "No data";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
}

export function buildLatestDescription(
  weakness: RankedWeakness,
  currentTestTitle: string | null,
): string {
  const correctCount = Math.max(0, weakness.workedCount - weakness.errorCount);
  const skillLabel = weakness.skill === "reading" ? "Reading" : "Listening";
  const testLabel = currentTestTitle ? `"${currentTestTitle}"` : "your latest test";

  return `In ${testLabel}, you scored ${correctCount}/${weakness.workedCount} on ${skillLabel} · ${weakness.shortTitle}. Review those answers before starting another random test.`;
}

export function buildAggregateDescription(weakness: RankedWeakness): string {
  const skillLabel = weakness.skill === "reading" ? "Reading" : "Listening";
  return `Across recent ${skillLabel} tests, ${weakness.shortTitle} is your most repeated gap (${weakness.errorCount} missed in ${weakness.workedCount} questions). Target this type next.`;
}

export function buildDiagnosisFromWeakness(
  weakness: RankedWeakness,
  analytics: DashboardAnalytics,
  lastCompletedAttempt: AttemptRow | null,
  insights: WeaknessInsight[],
): WeaknessDiagnosis {
  const reviewHref = getReviewHref(lastCompletedAttempt, weakness.skill);
  const practiceHref = getPracticeHref(weakness.skill);

  if (weakness.source === "latest") {
    const deltaMetric = weakness.delta === null
      ? "New type"
      : `${weakness.delta > 0 ? "+" : ""}${Math.round(weakness.delta)}%`;

    return {
      label: "Weakness Diagnosis",
      status: statusForAccuracy(weakness.accuracy, "latest"),
      severity: severityForAccuracy(weakness.accuracy),
      title: `${weakness.skill === "reading" ? "Reading" : "Listening"} · ${weakness.shortTitle}`,
      description: buildLatestDescription(weakness, analytics.comparison.currentTestTitle),
      primaryMetric: `${Math.round(weakness.accuracy)}%`,
      primaryMetricLabel: "latest accuracy",
      secondaryMetric: weakness.delta === null ? `${weakness.errorCount}/${weakness.workedCount}` : deltaMetric,
      secondaryMetricLabel: weakness.delta === null ? "missed in latest" : "vs previous tests",
      focusItems: insights.length > 0
        ? insights.map((item) => item.label)
        : ["Review latest mistakes", "Redo this question type", "Retest under timing"],
      insights,
      href: reviewHref,
      cta: reviewHref.startsWith("/attempts/") ? "Review latest mistakes" : "Open skill analytics",
    };
  }

  return {
    label: "Weakness Diagnosis",
    status: statusForAccuracy(weakness.accuracy, "aggregate"),
    severity: severityForAccuracy(weakness.accuracy),
    title: `${weakness.skill === "reading" ? "Reading" : "Listening"} · ${weakness.shortTitle}`,
    description: buildAggregateDescription(weakness),
    primaryMetric: `${Math.round(weakness.accuracy)}%`,
    primaryMetricLabel: "overall accuracy",
    secondaryMetric: `${weakness.errorCount}`,
    secondaryMetricLabel: "total missed",
    focusItems: [
      "Redo this question type",
      "Write why each answer was wrong",
      "Repeat under section timing",
    ],
    insights,
    href: practiceHref,
    cta: `Practice ${weakness.skill}`,
  };
}
