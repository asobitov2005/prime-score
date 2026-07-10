"use client";
import type { BaseScope } from "./base";
import { BookOpenText, CheckCircle2, ClipboardList, Clock3, Headphones, Target } from "../dependencies";
import { average, buildNineDayPerformanceTrend, buildSevenDayBandTrend, formatBand, formatPercent, formatSeconds, formatWholeBandDelta, questionTone, roundWholeBand, skillStatus } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { variant, analytics } = scope;
  const isListening = variant === "listening";

  const pageTitle = isListening ? "Listening Analytics" : "Reading Analytics";

  const pageSubtitle = isListening
      ? "Track your listening performance and understand audio-specific weak spots"
      : "Track your reading performance and find areas to improve";

  const HeaderIcon = isListening ? Headphones : BookOpenText;

  const skillKey = variant;

  const bandValues = analytics.progressSeries
      .map((point) => point[skillKey])
      .filter((value): value is number => typeof value === "number");

  const averageBand = roundWholeBand(average(bandValues.slice(-10)));

  const bandTrend = buildSevenDayBandTrend(analytics.progressSeries, skillKey);

  const performanceTrend = buildNineDayPerformanceTrend(analytics.accuracyTrend);

  const practicedQuestionTypes = analytics.questionTypeAnalysis.filter((item) => item.workedCount > 0);

  const totalWorked = practicedQuestionTypes.reduce((sum, item) => sum + item.workedCount, 0);

  const totalCorrect = practicedQuestionTypes.reduce((sum, item) => sum + item.correctCount, 0);

  const averageAccuracy = totalWorked > 0 ? (totalCorrect / totalWorked) * 100 : null;

  const completedCount = analytics.performanceSummary[skillKey].fullCount
      + analytics.performanceSummary[skillKey].section1Count
      + analytics.performanceSummary[skillKey].section2Count
      + analytics.performanceSummary[skillKey].section3Count
      + analytics.performanceSummary[skillKey].section4Count;

  const metrics = [
      { label: "Avg. Score", value: formatBand(averageBand), subtext: "of recent completed tests", icon: Target, iconClassName: "bg-indigo-50 text-indigo-600" },
      { label: "Accuracy", value: formatPercent(averageAccuracy), subtext: "Average answered accuracy", icon: CheckCircle2, iconClassName: "bg-emerald-50 text-emerald-600" },
      { label: "Avg. Time", value: formatSeconds(analytics.timeAnalysis.avgTimePerTestSec), subtext: "Per completed test", icon: Clock3, iconClassName: "bg-violet-50 text-violet-600" },
      { label: "Compl. Tests", value: String(completedCount), subtext: "Completed attempts", icon: ClipboardList, iconClassName: "bg-blue-50 text-blue-600" },
    ];

  const strengthItems = [...practicedQuestionTypes]
      .sort((a, b) => b.accuracy - a.accuracy || b.workedCount - a.workedCount)
      .slice(0, 4)
      .map((item) => ({ label: item.label, accuracy: item.accuracy }));

  const weakItems = [...practicedQuestionTypes]
      .sort((a, b) => a.accuracy - b.accuracy || b.workedCount - a.workedCount)
      .slice(0, 4)
      .map((item) => ({ label: item.label, accuracy: item.accuracy }));

  const questionTypeItems = analytics.questionTypeAnalysis.map((item) => ({
      label: item.label,
      accuracy: item.accuracy,
      attempts: item.workedCount,
      tone: questionTone(item.accuracy),
    }));

  const timeFocusItems = [
      { key: "avg_time", label: "Average Time per Test", valueLabel: formatSeconds(analytics.timeAnalysis.avgTimePerTestSec), subtext: null, status: null },
      { key: "recommended_time", label: "Recommended Time", valueLabel: formatSeconds(analytics.timeAnalysis.recommendedTimeSec), subtext: null, status: null },
      { key: "time_management", label: "Time Management", valueLabel: analytics.timeAnalysis.timeManagementStatus, subtext: null, status: analytics.timeAnalysis.timeManagementStatus === "Needs improvement" ? "needs_work" : "stable" },
      {
        key: "slowest_section",
        label: "Slowest Section",
        valueLabel: analytics.timeAnalysis.slowestSection?.label ?? "No data",
        subtext: analytics.timeAnalysis.slowestSection?.avgTimeSec ? `${formatSeconds(analytics.timeAnalysis.slowestSection.avgTimeSec)} average` : "Not enough section timing data",
        status: null,
      },
      {
        key: "fastest_section",
        label: "Fastest Section",
        valueLabel: analytics.timeAnalysis.fastestSection?.label ?? "No data",
        subtext: analytics.timeAnalysis.fastestSection?.avgTimeSec ? `${formatSeconds(analytics.timeAnalysis.fastestSection.avgTimeSec)} average` : "Not enough section timing data",
        status: null,
      },
      {
        key: "unanswered",
        label: "Unanswered Questions",
        valueLabel: analytics.timeAnalysis.unansweredAvgPercent === null ? "No data" : formatPercent(analytics.timeAnalysis.unansweredAvgPercent),
        subtext: "Average per test",
        status: null,
      },
    ];

  const focusItems = isListening ? analytics.skillFocus : timeFocusItems;

  const priorityItems = weakItems.slice(0, 3).map((item, index) => ({
      number: index + 1,
      title: item.label,
      metric: `${Math.round(item.accuracy)}% accuracy`,
      focus: `Focus: improve accuracy on ${item.label}.`,
      badgeClassName: index === 0 ? "bg-red-50 text-red-600" : index === 1 ? "bg-orange-50 text-orange-600" : "bg-amber-50 text-amber-700",
    }));

  const overallChange = analytics.improvementRate.delta ?? null;

  const overallChangeLabel = formatWholeBandDelta(overallChange);

  const overallChangeClassName = overallChange !== null && overallChange >= 0 ? "text-emerald-600" : "text-red-500";

  const analysisTitle = isListening ? "Listening Focus" : "Time Analysis";

  const primaryChartColor = isListening ? "#10B981" : "#4F46E5";

  const status = skillStatus(averageBand);

  const StatusIcon = status.icon;

  return { isListening, pageTitle, pageSubtitle, HeaderIcon, skillKey, bandValues, averageBand, bandTrend, performanceTrend, practicedQuestionTypes, totalWorked, totalCorrect, averageAccuracy, completedCount, metrics, strengthItems, weakItems, questionTypeItems, timeFocusItems, focusItems, priorityItems, overallChange, overallChangeLabel, overallChangeClassName, analysisTitle, primaryChartColor, status, StatusIcon };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
