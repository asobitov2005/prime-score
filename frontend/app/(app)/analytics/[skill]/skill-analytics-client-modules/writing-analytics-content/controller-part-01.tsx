"use client";
import type { BaseScope } from "./base";
import { CheckCircle2, Clock3, FileText, Target, useState } from "../dependencies";
import { WritingPromptRow, WritingTaskTab, average, bandToRoundedPercent, buildSevenDayBandTrend, formatBand, formatSeconds, roundWholeBand, skillStatus } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { analytics } = scope;
  const [activeTaskTab, setActiveTaskTab] = useState<WritingTaskTab>("task1");

  const [activeDescriptorTab, setActiveDescriptorTab] = useState<WritingTaskTab>("task1");

  const [activePromptType, setActivePromptType] = useState("all");

  const writingBands = analytics.progressSeries
      .map((point) => point.writing)
      .filter((value): value is number => typeof value === "number");

  const averageWritingBand = roundWholeBand(average(writingBands.slice(-10)));

  const writingTrend = buildSevenDayBandTrend(analytics.progressSeries, "writing");

  const writingCriteria = analytics.writingCriteria;

  const writingMetricsData = [
      { label: "Average Band", value: formatBand(averageWritingBand), subtext: "of recent graded tasks", icon: Target, iconClassName: "bg-violet-50 text-violet-600" },
      { label: "Task Achievement", value: formatBand(writingCriteria?.taskAchievement ?? null), subtext: "Average criterion band", icon: CheckCircle2, iconClassName: "bg-emerald-50 text-emerald-600" },
      { label: "Avg. Completion Time", value: formatSeconds(analytics.timeAnalysis.avgTimePerTestSec), subtext: "Per writing submission", icon: Clock3, iconClassName: "bg-violet-50 text-violet-600" },
      {
        label: "Tasks Completed",
        value: String(
          analytics.performanceSummary.writing
            ? analytics.performanceSummary.writing.section1Count + analytics.performanceSummary.writing.section2Count + analytics.performanceSummary.writing.fullCount
            : 0
        ),
        subtext: "Graded and submitted tasks",
        icon: FileText,
        iconClassName: "bg-indigo-50 text-indigo-600",
      },
    ];

  const descriptorRows = [
      { label: activeDescriptorTab === "task1" ? "Task Achievement" : "Task Response", value: roundWholeBand(writingCriteria?.taskAchievement), color: "bg-emerald-500" },
      { label: "Coherence & Cohesion", value: roundWholeBand(writingCriteria?.coherenceCohesion), color: "bg-violet-500" },
      { label: "Lexical Resource", value: roundWholeBand(writingCriteria?.lexicalResource), color: "bg-indigo-500" },
      { label: "Grammatical Range & Accuracy", value: roundWholeBand(writingCriteria?.grammaticalRangeAccuracy), color: "bg-orange-500" },
    ];

  const writingPerformanceTrend = writingTrend.map((point) => ({
      date: point.date,
      band: point.score,
      task: bandToRoundedPercent(writingCriteria?.taskAchievement),
      lexical: bandToRoundedPercent(writingCriteria?.lexicalResource),
      grammar: bandToRoundedPercent(writingCriteria?.grammaticalRangeAccuracy),
    }));

  const promptTypeRows: WritingPromptRow[] = analytics.sectionAnalysis
      .filter((item) => item.sectionNumber === (activeTaskTab === "task1" ? 1 : 2))
      .map((item) => ({
        promptType: item.label,
        band: averageWritingBand === null ? "—" : formatBand(averageWritingBand),
        attempts: String(item.attemptsCount || item.workedCount),
        issue: item.workedCount > 0 ? `${Math.round(item.accuracy)}% completion accuracy from stored results` : "No scored submissions yet",
        status: item.workedCount === 0 ? "Not practiced" : item.accuracy >= 70 ? "Good" : item.accuracy >= 50 ? "Needs practice" : "Limited data",
      }));

  const activeTaskRows = activePromptType === "all"
      ? promptTypeRows
      : promptTypeRows.filter((item) => item.promptType === activePromptType);

  const activeDescriptors = descriptorRows;

  const writingStatus = skillStatus(averageWritingBand);

  const WritingStatusIcon = writingStatus.icon;

  const weakestCriterion = [...descriptorRows]
      .filter((item) => item.value !== null)
      .sort((a, b) => Number(a.value) - Number(b.value))[0];

  const writingPriorityItems = descriptorRows
      .filter((item) => item.value !== null)
      .sort((a, b) => Number(a.value) - Number(b.value))
      .slice(0, 3)
      .map((item, index) => ({
        number: index + 1,
        title: item.label,
        metric: `Band ${formatBand(item.value)}`,
        focus: `Focus: improve ${item.label.toLowerCase()} in the next writing submission.`,
        badgeClassName: index === 0 ? "bg-red-50 text-red-600" : index === 1 ? "bg-orange-50 text-orange-600" : "bg-amber-50 text-amber-700",
      }));

  return { activeTaskTab, setActiveTaskTab, activeDescriptorTab, setActiveDescriptorTab, activePromptType, setActivePromptType, writingBands, averageWritingBand, writingTrend, writingCriteria, writingMetricsData, descriptorRows, writingPerformanceTrend, promptTypeRows, activeTaskRows, activeDescriptors, writingStatus, WritingStatusIcon, weakestCriterion, writingPriorityItems };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
