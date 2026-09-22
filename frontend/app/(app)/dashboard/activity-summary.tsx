"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardActivityPoint } from "@/lib/types";
import { APP_TIME_ZONE } from "@/lib/date-time";
import { summarizeStudyTime } from "@/lib/dashboard-metrics";

interface StudyTimeCardProps {
  activity: DashboardActivityPoint[];
  className?: string;
}

function formatHours(value: number | null | undefined): string {
  const safeHours = Math.max(0, Number(value ?? 0));
  return `${safeHours === 0 ? 0 : safeHours.toFixed(1)}h`;
}

function formatPlainHours(value: number | null | undefined): string {
  const safeHours = Math.max(0, Number(value ?? 0));
  return safeHours === 0 ? "0" : safeHours.toFixed(1);
}

type StudyTimeRange = "all_time" | "this_month" | "this_week";

const STUDY_TIME_RANGE_OPTIONS: readonly { value: StudyTimeRange; label: string }[] = [
  { value: "all_time", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "this_week", label: "This week" },
];

/**
 * Compact custom dropdown for the study-time range. Uses the same
 * button-plus-popover pattern as the other in-app dropdowns so it renders
 * consistently on mobile instead of falling back to the native OS picker.
 */
function StudyTimeRangeDropdown({
  value,
  onChange,
}: {
  value: StudyTimeRange;
  onChange: (value: StudyTimeRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption = STUDY_TIME_RANGE_OPTIONS.find((option) => option.value === value) ?? STUDY_TIME_RANGE_OPTIONS[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-8 w-[118px] items-center justify-between gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors",
          open
            ? "border-sky-400 bg-sky-50 text-sky-800 ring-4 ring-sky-100/70 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/10"
            : "border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-300 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200",
        )}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Study time range"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-30 w-[130px] overflow-hidden rounded-xl border border-sky-100 bg-white p-1.5 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.45)] dark:border-sky-500/20 dark:bg-slate-900 dark:shadow-none"
        >
          {STUDY_TIME_RANGE_OPTIONS.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  onChange(option.value);
                }}
                className={cn(
                  "flex h-8 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50",
                )}
              >
                <span>{option.label}</span>
                {active ? <Check className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function StudyTimeCard({ activity, className }: StudyTimeCardProps) {
  const [range, setRange] = useState<StudyTimeRange>("all_time");
  const studyMetrics = useMemo(
    () => summarizeStudyTime(activity, new Date(), APP_TIME_ZONE),
    [activity],
  );
  const monthlyData = studyMetrics.monthlyData;
  const totalHours = studyMetrics.totalHours;
  const { thisWeekHours, thisWeekDaysElapsed, previousWeekHours, thisMonthHours, previousMonthHours } = studyMetrics;
  const dailyAverageHours = thisWeekHours / thisWeekDaysElapsed;
  const previousDailyAverageHours = previousWeekHours / 7;
  const selectedHours = {
    all_time: totalHours,
    this_month: thisMonthHours,
    this_week: thisWeekHours,
  }[range];

  return (
    <Card className={cn("overflow-hidden rounded-[1.5rem] border border-sky-100 bg-white shadow-lg shadow-sky-950/5 dark:border-sky-500/20 dark:bg-slate-950/80", className)}>
      <CardContent className="flex h-full flex-col justify-between gap-2 p-3">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="min-w-[142px]">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-sky-500/10 p-1.5">
                  <Clock className="h-3.5 w-3.5 text-sky-600" />
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Study Time</h3>
              </div>
              <div className="mt-7 flex items-end gap-1.5">
                <span className="text-[2rem] font-semibold leading-none tracking-tight text-slate-950 dark:text-white">
                  {formatPlainHours(selectedHours)}
                </span>
                <span className="pb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">h</span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {range === "all_time" ? "Total study time" : range === "this_month" ? "Study time this month" : "Study time this week"}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex justify-end">
                <StudyTimeRangeDropdown value={range} onChange={setRange} />
              </div>
              <div
                className="ml-auto mt-7 flex h-[72px] w-[260px] max-w-full items-end justify-between gap-2"
                role="img"
                aria-label="Study hours by month for the last five months"
              >
                {monthlyData.map((point) => {
                  const maximumHours = Math.max(1, ...monthlyData.map((item) => item.hours));
                  const height = point.hours > 0 ? Math.max(6, (point.hours / maximumHours) * 48) : 2;
                  return (
                    <div key={point.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${point.month}: ${point.hours.toFixed(1)} hours`}>
                      <div
                        className="w-5 max-w-full rounded-t-md bg-sky-500/85"
                        style={{ height: `${height}px` }}
                      />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{point.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "This week", value: formatHours(thisWeekHours), trend: thisWeekHours - previousWeekHours },
            { label: "This month", value: formatHours(thisMonthHours), trend: thisMonthHours - previousMonthHours },
            { label: "Daily avg / week", value: formatHours(dailyAverageHours), trend: dailyAverageHours - previousDailyAverageHours },
          ].map((item) => {
            const isDown = item.trend < 0;
            const TrendIcon = isDown ? TrendingDown : TrendingUp;
            return (
            <div key={item.label} className="rounded-xl bg-sky-50 px-2.5 py-1.5 dark:bg-sky-500/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-sky-700/70 dark:text-sky-200/65">
                {item.label}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold tracking-tight text-slate-950 dark:text-white">
                <TrendIcon className={cn("h-3.5 w-3.5", isDown ? "text-rose-500" : "text-emerald-500")} />
                <span>{item.value}</span>
              </p>
            </div>
          );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
