import type {
  AttemptRow,
  DashboardAnalytics,
  DashboardQuestionTypeAnalysisItem,
  DashboardQuestionTypeComparisonItem,
} from "@/lib/types";

const MIN_LATEST_WORKED = 2;
const MIN_AGGREGATE_WORKED = 4;
const MIN_TOTAL_ERRORS = 3;
const WEAK_ACCURACY_THRESHOLD = 70;

export interface WeaknessInsight {
  label: string;
  value: string;
  detail: string;
  scorePercent: number;
}

export interface WeaknessDiagnosis {
  label: string;
  status: string;
  severity: "critical" | "attention" | "steady";
  title: string;
  description: string;
  primaryMetric: string;
  primaryMetricLabel: string;
  secondaryMetric: string;
  secondaryMetricLabel: string;
  focusItems: string[];
  insights: WeaknessInsight[];
  href: string;
  cta: string;
}

interface ParsedQuestionTypeLabel {
  skill: "reading" | "listening";
  shortTitle: string;
}

interface RankedWeakness {
  label: string;
  shortTitle: string;
  skill: "reading" | "listening";
  accuracy: number;
  workedCount: number;
  errorCount: number;
  delta: number | null;
  source: "latest" | "aggregate";
  impactScore: number;
}

function parseQuestionTypeLabel(label: string): ParsedQuestionTypeLabel | null {
  if (label.startsWith("Reading - ")) {
    return { skill: "reading", shortTitle: label.slice("Reading - ".length) };
  }
  if (label.startsWith("Listening - ")) {
    return { skill: "listening", shortTitle: label.slice("Listening - ".length) };
  }
  return null;
}

function severityForAccuracy(accuracy: number): WeaknessDiagnosis["severity"] {
  if (accuracy < 50) return "critical";
  if (accuracy < WEAK_ACCURACY_THRESHOLD) return "attention";
  return "steady";
}

function statusForAccuracy(accuracy: number, source: "latest" | "aggregate"): string {
  if (accuracy < 50) {
    return source === "latest" ? "Latest test risk" : "High impact";
  }
  if (accuracy < WEAK_ACCURACY_THRESHOLD) {
    return source === "latest" ? "Latest weak spot" : "Needs work";
  }
  return "Monitor";
}

function impactScore(accuracy: number, errorCount: number, workedCount: number): number {
  const accuracyWeight = (100 - accuracy) / 100;
  const errorRate = workedCount > 0 ? errorCount / workedCount : 0;
  const sampleWeight = Math.min(workedCount / 8, 1);
  return accuracyWeight * 0.65 + errorRate * sampleWeight * 0.35;
}

function findAggregateMatch(
  label: string,
  analysis: DashboardQuestionTypeAnalysisItem[],
): DashboardQuestionTypeAnalysisItem | undefined {
  return analysis.find((item) => item.label === label);
}

function rankLatestWeaknesses(
  comparisonItems: DashboardQuestionTypeComparisonItem[],
  analysis: DashboardQuestionTypeAnalysisItem[],
): RankedWeakness[] {
  const ranked: RankedWeakness[] = [];

  for (const item of comparisonItems) {
    const parsed = parseQuestionTypeLabel(item.label);
    if (!parsed || item.currentAccuracy === null) {
      continue;
    }

    const workedCount = item.currentWorkedCount ?? 0;
    const errorCount = item.currentErrorCount ?? Math.max(0, Math.round(workedCount * (1 - item.currentAccuracy / 100)));
    if (workedCount < MIN_LATEST_WORKED || item.currentAccuracy >= WEAK_ACCURACY_THRESHOLD) {
      continue;
    }

    const aggregate = findAggregateMatch(item.label, analysis);
    const accuracy = item.currentAccuracy;

    ranked.push({
      label: item.label,
      shortTitle: parsed.shortTitle,
      skill: parsed.skill,
      accuracy,
      workedCount,
      errorCount,
      delta: item.delta,
      source: "latest",
      impactScore: impactScore(accuracy, errorCount, workedCount) + (aggregate?.errorCount ?? 0) * 0.01,
    });
  }

  return ranked.sort((left, right) => {
    if (right.impactScore !== left.impactScore) {
      return right.impactScore - left.impactScore;
    }
    return left.accuracy - right.accuracy;
  });
}

function rankAggregateWeaknesses(
  analysis: DashboardQuestionTypeAnalysisItem[],
): RankedWeakness[] {
  const ranked: RankedWeakness[] = [];

  for (const item of analysis) {
    const parsed = parseQuestionTypeLabel(item.label);
    if (!parsed || item.workedCount < MIN_AGGREGATE_WORKED || item.accuracy >= WEAK_ACCURACY_THRESHOLD) {
      continue;
    }

    ranked.push({
      label: item.label,
      shortTitle: parsed.shortTitle,
      skill: parsed.skill,
      accuracy: item.accuracy,
      workedCount: item.workedCount,
      errorCount: item.errorCount,
      delta: null,
      source: "aggregate",
      impactScore: impactScore(item.accuracy, item.errorCount, item.workedCount),
    });
  }

  return ranked.sort((left, right) => {
    if (left.accuracy !== right.accuracy) {
      return left.accuracy - right.accuracy;
    }
    return right.errorCount - left.errorCount;
  });
}

function buildInsightFromLatest(
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

function buildInsightFromAggregate(item: DashboardQuestionTypeAnalysisItem): WeaknessInsight | null {
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

function getLatestInsights(analytics: DashboardAnalytics): WeaknessInsight[] {
  return analytics.comparison.items
    .map((item) => buildInsightFromLatest(item, analytics.comparison.currentTestTitle))
    .filter((item): item is WeaknessInsight => item !== null)
    .sort((left, right) => left.scorePercent - right.scorePercent)
    .slice(0, 3);
}

function getAggregateInsights(analysis: DashboardQuestionTypeAnalysisItem[]): WeaknessInsight[] {
  return analysis
    .map(buildInsightFromAggregate)
    .filter((item): item is WeaknessInsight => item !== null)
    .sort((left, right) => left.scorePercent - right.scorePercent)
    .slice(0, 3);
}

function getReviewHref(lastCompletedAttempt: AttemptRow | null, skill: "reading" | "listening"): string {
  if (lastCompletedAttempt && (lastCompletedAttempt.type === "reading" || lastCompletedAttempt.type === "listening")) {
    if (lastCompletedAttempt.type === skill) {
      return `/attempts/${lastCompletedAttempt.id}/result`;
    }
  }
  return `/analytics/${skill}`;
}

function getPracticeHref(skill: "reading" | "listening"): string {
  return `/tests?type=${skill}`;
}

function formatSecondsShort(seconds: number | null): string {
  if (seconds === null) return "No data";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
}

function buildLatestDescription(
  weakness: RankedWeakness,
  currentTestTitle: string | null,
): string {
  const correctCount = Math.max(0, weakness.workedCount - weakness.errorCount);
  const skillLabel = weakness.skill === "reading" ? "Reading" : "Listening";
  const testLabel = currentTestTitle ? `"${currentTestTitle}"` : "your latest test";

  return `In ${testLabel}, you scored ${correctCount}/${weakness.workedCount} on ${skillLabel} · ${weakness.shortTitle}. Review those answers before starting another random test.`;
}

function buildAggregateDescription(weakness: RankedWeakness): string {
  const skillLabel = weakness.skill === "reading" ? "Reading" : "Listening";
  return `Across recent ${skillLabel} tests, ${weakness.shortTitle} is your most repeated gap (${weakness.errorCount} missed in ${weakness.workedCount} questions). Target this type next.`;
}

function buildDiagnosisFromWeakness(
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

export function buildWeaknessDiagnosis(
  analytics: DashboardAnalytics,
  attempts: AttemptRow[],
  daysSinceLast: number,
): WeaknessDiagnosis {
  const completedAttempts = attempts.filter(
    (attempt) => attempt.status === "completed" || attempt.status === "submitted",
  );
  const lastCompletedAttempt = completedAttempts.find(
    (attempt) => attempt.type === "reading" || attempt.type === "listening",
  ) ?? null;
  const lastType = lastCompletedAttempt?.type === "listening" ? "listening" : "reading";
  const avgSpeed = analytics.speedMetrics.avgTimePerQuestionSec;
  const latestInsights = getLatestInsights(analytics);
  const aggregateInsights = getAggregateInsights(analytics.questionTypeAnalysis);
  const latestWeaknesses = rankLatestWeaknesses(analytics.comparison.items, analytics.questionTypeAnalysis);
  const aggregateWeaknesses = rankAggregateWeaknesses(analytics.questionTypeAnalysis);
  const mostCommonError = analytics.errorDistribution.find((item) => item.errorCount >= MIN_TOTAL_ERRORS) ?? null;

  if (completedAttempts.length === 0) {
    return {
      label: "Weakness Diagnosis",
      status: "Baseline needed",
      severity: "attention",
      title: "No reliable weak area yet",
      description: "Start with one timed Reading or Listening test so the dashboard can detect real question-type gaps.",
      primaryMetric: "0",
      primaryMetricLabel: "completed tests",
      secondaryMetric: "1 test",
      secondaryMetricLabel: "needed for baseline",
      focusItems: ["Take a timed test", "Review wrong answers", "Build first weakness profile"],
      insights: [],
      href: "/tests",
      cta: "Create baseline",
    };
  }

  if (daysSinceLast > 3) {
    return {
      label: "Weakness Diagnosis",
      status: "Consistency gap",
      severity: "attention",
      title: `${daysSinceLast} days without practice`,
      description: "The biggest current risk is retention loss. A short timed section is more useful than another passive review.",
      primaryMetric: `${daysSinceLast}d`,
      primaryMetricLabel: "inactive",
      secondaryMetric: formatSecondsShort(avgSpeed),
      secondaryMetricLabel: "avg/question",
      focusItems: ["Restart with one section", "Keep strict timing", "Review errors immediately"],
      insights: latestInsights.length > 0 ? latestInsights : aggregateInsights,
      href: getPracticeHref(lastType),
      cta: "Restart practice",
    };
  }

  const primaryLatest = latestWeaknesses[0] ?? null;
  if (primaryLatest) {
    return buildDiagnosisFromWeakness(primaryLatest, analytics, lastCompletedAttempt, latestInsights);
  }

  const primaryAggregate = aggregateWeaknesses[0] ?? null;
  if (primaryAggregate) {
    return buildDiagnosisFromWeakness(
      primaryAggregate,
      analytics,
      lastCompletedAttempt,
      aggregateInsights.length > 0 ? aggregateInsights : latestInsights,
    );
  }

  if (mostCommonError) {
    const parsed = parseQuestionTypeLabel(mostCommonError.label);
    return {
      label: "Weakness Diagnosis",
      status: "Error pattern",
      severity: "attention",
      title: parsed ? `${parsed.skill === "reading" ? "Reading" : "Listening"} · ${parsed.shortTitle}` : mostCommonError.label,
      description: `${Math.round(mostCommonError.share)}% of your recorded mistakes come from this question type (${mostCommonError.errorCount} total misses).`,
      primaryMetric: `${mostCommonError.errorCount}`,
      primaryMetricLabel: "errors",
      secondaryMetric: `${Math.round(mostCommonError.share)}%`,
      secondaryMetricLabel: "mistake share",
      focusItems: ["Review similar questions", "Compare traps", "Drill until stable"],
      insights: aggregateInsights.length > 0 ? aggregateInsights : latestInsights,
      href: parsed ? getPracticeHref(parsed.skill) : getPracticeHref(lastType),
      cta: "Start targeted test",
    };
  }

  return {
    label: "Weakness Diagnosis",
    status: "Stable",
    severity: "steady",
    title: "No major weakness detected",
    description: "Your recent data does not show a clear recurring gap yet. Use a full mock to expose the next bottleneck.",
    primaryMetric: formatSecondsShort(avgSpeed),
    primaryMetricLabel: "avg/question",
    secondaryMetric: lastCompletedAttempt?.band ?? "N/A",
    secondaryMetricLabel: "last band",
    focusItems: ["Take a full mock", "Check timing pressure", "Compare section scores"],
    insights: aggregateInsights.length > 0 ? aggregateInsights : latestInsights,
    href: "/tests",
    cta: "Run full mock",
  };
}
