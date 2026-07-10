import { AttemptRow, DashboardAnalytics } from "./weakness-diagnosis-dependencies";
import { MIN_TOTAL_ERRORS, WeaknessDiagnosis, parseQuestionTypeLabel, rankAggregateWeaknesses, rankLatestWeaknesses } from "./weakness-diagnosis-part-01";
import { buildDiagnosisFromWeakness, formatSecondsShort, getAggregateInsights, getLatestInsights, getPracticeHref } from "./weakness-diagnosis-part-02";

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
