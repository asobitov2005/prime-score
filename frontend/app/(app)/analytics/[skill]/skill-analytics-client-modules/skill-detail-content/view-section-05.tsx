"use client";
import type { SkillDetailContentScope } from "./controller";
import { AlertTriangle, Area, AreaChart, ArrowLeft, CartesianGrid, CheckCircle2, Info, Line, LineChart, Link, ResponsiveContainer, Tooltip, XAxis, YAxis, cn } from "../dependencies";
import { AccuracyBar, Card, CardTitle, focusIcon, formatBand, formatTrendValue, noDataMessage, progressColor } from "../shared";
import { SkillDetailContentSection2 } from "./view-section-05";

export function SkillDetailContentView1({ scope }: { scope: SkillDetailContentScope }) {
  const { isListening, HeaderIcon, pageTitle, pageSubtitle, averageBand, status, StatusIcon, overallChangeClassName, overallChangeLabel, bandTrend, primaryChartColor, metrics, strengthItems, weakItems, performanceTrend, questionTypeItems, analysisTitle, focusItems, priorityItems } = scope;
  return (
    (
        <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
          <SkillDetailContentSection2 scope={scope} />
        </div>
      )
  );
}
