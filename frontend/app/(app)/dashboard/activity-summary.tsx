"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardActivityPoint } from "@/lib/types";
import { APP_TIME_ZONE } from "@/lib/date-time";
import { summarizeStudyTime } from "@/lib/dashboard-metrics";

type StudyTimeRange = "all_time" | "this_month" | "this_week";

function formatHours(value: number): string {
  return value > 0 ? value.toFixed(1) : "0";
}

export function StudyTimeCard({ activity, className }: { activity: DashboardActivityPoint[]; className?: string }) {
  const [range, setRange] = useState<StudyTimeRange>("all_time");
  const metrics = summarizeStudyTime(activity, new Date(), APP_TIME_ZONE);
  const selectedHours = {
    all_time: metrics.totalHours,
    this_month: metrics.thisMonthHours,
    this_week: metrics.thisWeekHours,
  }[range];
  const maximumHours = Math.max(1, ...metrics.monthlyData.map((point) => point.hours));

  return (
    <Card className={cn("min-w-0 rounded-lg border-border bg-card shadow-none", className)}>
      <CardContent className="flex h-full flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Study time</h2>
            <p className="mt-1 text-xs text-muted-foreground">Time spent practising across all skills.</p>
          </div>
          <select
            aria-label="Study time range"
            value={range}
            onChange={(event) => setRange(event.target.value as StudyTimeRange)}
            className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-primary"
          >
            <option value="all_time">All time</option>
            <option value="this_month">This month</option>
            <option value="this_week">This week</option>
          </select>
        </div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground" aria-live="polite">
          {formatHours(selectedHours)}<span className="ml-1.5 text-sm font-normal text-muted-foreground">hours</span>
        </p>
        <div className="flex min-h-28 flex-1 items-end gap-4" role="img" aria-label="Study hours by month for the last five months">
          {metrics.monthlyData.map((point) => (
            <div key={point.month} className="flex min-w-0 flex-1 flex-col items-center gap-2" title={`${point.month}: ${formatHours(point.hours)} hours`}>
              <span className="text-[10px] tabular-nums text-muted-foreground">{formatHours(point.hours)}h</span>
              <div className="w-full max-w-9 rounded-t bg-primary/70" style={{ height: point.hours > 0 ? Math.max(4, point.hours / maximumHours * 85) : 0 }} />
              <span className="text-[10px] text-muted-foreground">{point.month}</span>
            </div>
          ))}
        </div>
        <dl className="grid grid-cols-3 gap-3 border-t border-border pt-4">
          {[
            { label: "This week", value: metrics.thisWeekHours },
            { label: "This month", value: metrics.thisMonthHours },
            { label: "Daily avg / week", value: metrics.thisWeekHours / metrics.thisWeekDaysElapsed },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-[10px] leading-relaxed text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">{formatHours(item.value)}h</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
