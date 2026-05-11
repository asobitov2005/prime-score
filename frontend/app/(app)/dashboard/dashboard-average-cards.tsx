"use client";

import { BookOpenText, Headphones, PenSquare, TrendingUp, Mic } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAverageBand, roundToIeltsBand, useDashboardAnalytics } from "@/components/charts/use-dashboard-analytics";
import type { DashboardAnalytics } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DashboardAverageCardsProps {
  initialAnalytics: DashboardAnalytics;
}

function formatBand(value: number | null): string {
  return value === null ? "0.0" : value.toFixed(1);
}

function getBandLabel(band: number | null): { text: string; color: string } {
  if (band === null || band === 0) return { text: "No data", color: "text-muted-foreground" };
  if (band < 5.0) return { text: "Needs improvement", color: "text-rose-500" };
  if (band < 6.0) return { text: "Developing", color: "text-amber-500" };
  if (band < 7.0) return { text: "Good", color: "text-emerald-500" };
  if (band < 8.0) return { text: "Very good", color: "text-blue-500" };
  return { text: "Excellent", color: "text-violet-500" };
}

const sections = [
  { key: "reading", label: "Reading", icon: BookOpenText, iconColor: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  { key: "listening", label: "Listening", icon: Headphones, iconColor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  { key: "writing", label: "Writing", icon: PenSquare, iconColor: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", borderColor: "border-violet-500/20" },
  { key: "speaking", label: "Speaking", icon: Mic, iconColor: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", borderColor: "border-orange-500/20" },
] as const;

export function DashboardAverageCards({ initialAnalytics }: DashboardAverageCardsProps) {
  const analyticsQuery = useDashboardAnalytics(initialAnalytics);
  const analytics = analyticsQuery.data ?? initialAnalytics;
  const averageReading = getAverageBand(analytics, "reading");
  const averageListening = getAverageBand(analytics, "listening");
  const averageWriting = getAverageBand(analytics, "writing");
  // Speaking is currently mock as backend doesn't support it yet
  const averageSpeaking = null;

  const sectionBands = [averageReading, averageListening, averageWriting, averageSpeaking];
  const validBands = sectionBands.filter((b): b is number => b !== null && b > 0);
  const overallBand = validBands.length > 0
    ? roundToIeltsBand(validBands.reduce((sum, b) => sum + b, 0) / validBands.length)
    : 0;

  const overallLabel = getBandLabel(overallBand > 0 ? overallBand : null);

  // Improvement delta
  const delta = analytics.improvementRate?.delta ?? null;

  const bandValues: Record<string, number | null> = {
    reading: averageReading,
    listening: averageListening,
    writing: averageWriting,
    speaking: averageSpeaking,
  };

  const statusColorMap: Record<string, { bg: string; border: string; glow: string; text: string }> = {
    "text-muted-foreground": { bg: "bg-muted/5", border: "border-muted/10", glow: "from-muted/5", text: "text-muted-foreground" },
    "text-rose-500": { bg: "bg-rose-500/5", border: "border-rose-500/10", glow: "from-rose-500/5", text: "text-rose-900 dark:text-rose-300" },
    "text-amber-500": { bg: "bg-amber-500/5", border: "border-amber-500/10", glow: "from-amber-500/5", text: "text-amber-900 dark:text-amber-300" },
    "text-emerald-500": { bg: "bg-emerald-500/5", border: "border-emerald-500/10", glow: "from-emerald-500/5", text: "text-emerald-900 dark:text-emerald-300" },
    "text-blue-500": { bg: "bg-blue-500/5", border: "border-blue-500/10", glow: "from-blue-500/5", text: "text-blue-900 dark:text-blue-300" },
    "text-violet-500": { bg: "bg-violet-500/5", border: "border-violet-500/10", glow: "from-violet-500/5", text: "text-violet-900 dark:text-violet-300" },
  };

  const currentStatusColors = statusColorMap[overallLabel.color] || statusColorMap["text-muted-foreground"];

  // Gauge calculations
  const gaugeSize = 90;
  const strokeWidth = 9;
  const radius = (gaugeSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = (overallBand / 9) * 100;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col sm:flex-row gap-5 lg:gap-6 h-full items-center justify-center">
      {/* Left: Overall Band */}
      <div className={cn(
        "flex flex-col items-center justify-center rounded-3xl border p-5 min-w-[170px] shadow-sm relative overflow-hidden group transition-all duration-500",
        currentStatusColors.bg,
        currentStatusColors.border
      )}>
        <div className={cn("absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br to-transparent blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700", currentStatusColors.glow)} />
        
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 relative z-10">Overall Band</p>
        
        <p className="text-5xl font-semibold tracking-tight leading-none mb-4 relative z-10 text-foreground">
          {overallBand > 0 ? overallBand.toFixed(1) : "—"}
        </p>

        <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-background/80 backdrop-blur-md shadow-sm border border-border/10 relative z-10 mb-4", overallLabel.color)}>
          {overallLabel.text}
        </div>

        {/* Improvement (Delta) */}
        {delta !== null && (
          <div className="flex flex-col items-center gap-1 w-full relative z-10 border-t border-border/10 pt-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className={cn("h-3.5 w-3.5", delta >= 0 ? "text-emerald-500" : "text-rose-500")} />
              <span className={cn("text-sm font-bold", delta >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {delta > 0 ? "+" : ""}{delta.toFixed(1)} pts
              </span>
            </div>
            <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Since last test</p>
          </div>
        )}
      </div>

      {/* Right: Section Scores - Vertical Stack */}
      <div className="flex-1 flex flex-col gap-2 w-full">
        {sections.map((section) => {
          const Icon = section.icon;
          const band = bandValues[section.key];
          return (
            <div
              key={section.key}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2 bg-background/40 hover:bg-background/80 transition-all duration-300 group shadow-sm",
                section.borderColor
              )}
            >
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm", section.bg)}>
                <Icon className={cn("h-4 w-4", section.iconColor)} />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between px-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 truncate">{section.label}</p>
                <p className="text-lg font-semibold tracking-tight text-foreground leading-none tabular-nums">
                  {formatBand(band)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
