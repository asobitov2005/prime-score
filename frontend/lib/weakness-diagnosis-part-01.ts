import { DashboardQuestionTypeAnalysisItem, DashboardQuestionTypeComparisonItem } from "./weakness-diagnosis-dependencies";

export const MIN_LATEST_WORKED = 2;

export const MIN_AGGREGATE_WORKED = 4;

export const MIN_TOTAL_ERRORS = 3;

export const WEAK_ACCURACY_THRESHOLD = 70;

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

export interface ParsedQuestionTypeLabel {
  skill: "reading" | "listening";
  shortTitle: string;
}

export interface RankedWeakness {
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

export function parseQuestionTypeLabel(label: string): ParsedQuestionTypeLabel | null {
  if (label.startsWith("Reading - ")) {
    return { skill: "reading", shortTitle: label.slice("Reading - ".length) };
  }
  if (label.startsWith("Listening - ")) {
    return { skill: "listening", shortTitle: label.slice("Listening - ".length) };
  }
  return null;
}

export function severityForAccuracy(accuracy: number): WeaknessDiagnosis["severity"] {
  if (accuracy < 50) return "critical";
  if (accuracy < WEAK_ACCURACY_THRESHOLD) return "attention";
  return "steady";
}

export function statusForAccuracy(accuracy: number, source: "latest" | "aggregate"): string {
  if (accuracy < 50) {
    return source === "latest" ? "Latest test risk" : "High impact";
  }
  if (accuracy < WEAK_ACCURACY_THRESHOLD) {
    return source === "latest" ? "Latest weak spot" : "Needs work";
  }
  return "Monitor";
}

export function impactScore(accuracy: number, errorCount: number, workedCount: number): number {
  const accuracyWeight = (100 - accuracy) / 100;
  const errorRate = workedCount > 0 ? errorCount / workedCount : 0;
  const sampleWeight = Math.min(workedCount / 8, 1);
  return accuracyWeight * 0.65 + errorRate * sampleWeight * 0.35;
}

export function findAggregateMatch(
  label: string,
  analysis: DashboardQuestionTypeAnalysisItem[],
): DashboardQuestionTypeAnalysisItem | undefined {
  return analysis.find((item) => item.label === label);
}

export function rankLatestWeaknesses(
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

export function rankAggregateWeaknesses(
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
