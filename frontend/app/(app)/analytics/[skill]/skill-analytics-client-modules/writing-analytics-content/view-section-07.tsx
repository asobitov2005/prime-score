"use client";
import type { WritingAnalyticsContentScope } from "./controller";
import { Area, AreaChart, ArrowLeft, ArrowRight, CartesianGrid, CheckCircle, ClipboardList, Clock3, Lightbulb, Line, LineChart, Link, PencilLine, ResponsiveContainer, Timer, Tooltip, XAxis, YAxis, cn } from "../dependencies";
import { AccuracyBar, Card, CardTitle, formatBand, formatPercent, formatSeconds, formatTrendValue, formatWholeBandDelta, noDataMessage, writingStatusClassName } from "../shared";
import { WritingAnalyticsContentSection2 } from "./view-section-07";

export function WritingAnalyticsContentView1({ scope }: { scope: WritingAnalyticsContentScope }) {
  const { averageWritingBand, writingStatus, WritingStatusIcon, analytics, writingTrend, writingMetricsData, setActiveDescriptorTab, activeDescriptorTab, activeDescriptors, writingPerformanceTrend, activeTaskRows, weakestCriterion, writingPriorityItems } = scope;
  return (
    (
        <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
          <WritingAnalyticsContentSection2 scope={scope} />
        </div>
      )
  );
}
