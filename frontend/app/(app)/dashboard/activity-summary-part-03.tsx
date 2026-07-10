"use client";

import { Bar, BarChart, Card, CardContent, Clock, ResponsiveContainer, Select, Tooltip, TrendingDown, TrendingUp, XAxis, cn, useAuthStore, useMemo, useState } from "./activity-summary-dependencies";
import { StudyTimeCardProps, StudyTimeTooltipCursor, buildMonthlyStudyData, formatHours, formatPlainHours } from "./activity-summary-part-01";

export function StudyTimeCard({ analytics, className }: StudyTimeCardProps) {
  const summary = analytics.performanceSummary;
  const studyTime = summary.studyTime;
  const createdAt = useAuthStore((state) => state.createdAt);
  const [range, setRange] = useState<"all_time" | "this_month" | "this_week">("all_time");
  const monthlyData = useMemo(() => buildMonthlyStudyData(analytics), [analytics]);
  const totalHours = studyTime.totalTimeSec / 3600;
  const thisWeekHours = (analytics.weeklyActivity.at(-1)?.timeSpentMin ?? 0) / 60;
  const previousWeekHours = (analytics.weeklyActivity.at(-2)?.timeSpentMin ?? 0) / 60;
  const thisMonthHours = monthlyData.at(-1)?.hours ?? 0;
  const previousMonthHours = monthlyData.at(-2)?.hours ?? 0;
  const joinedDate = createdAt ? new Date(createdAt) : null;
  const joinedTime = joinedDate && !Number.isNaN(joinedDate.getTime()) ? joinedDate.getTime() : null;
  const daysSinceJoined = joinedTime
    ? Math.max(1, Math.ceil((Date.now() - joinedTime) / (1000 * 60 * 60 * 24)))
    : 7;
  const dailyAverageHours = totalHours > 0
    ? totalHours / daysSinceJoined
    : thisWeekHours / 7;
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
                <Select
                  value={range}
                  onChange={(event) => setRange(event.target.value as typeof range)}
                  className="h-8 w-[118px] rounded-xl border-sky-200 bg-sky-50 px-2 text-xs font-semibold text-sky-800 focus-visible:border-sky-400 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200"
                >
                  <option value="all_time">All time</option>
                  <option value="this_month">This month</option>
                  <option value="this_week">This week</option>
                </Select>
              </div>
              <div className="ml-auto mt-7 h-[72px] w-[260px] max-w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="18%">
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "rgb(100 116 139)", fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip
                      cursor={<StudyTimeTooltipCursor />}
                      formatter={(value) => [`${Number(value).toFixed(1)}h`, "Study time"]}
                      contentStyle={{
                        border: "1px solid rgba(14,165,233,0.18)",
                        borderRadius: 12,
                        boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="hours" radius={[7, 7, 3, 3]} fill="#0EA5E9" maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "This week", value: formatHours(thisWeekHours), trend: thisWeekHours - previousWeekHours },
            { label: "This month", value: formatHours(thisMonthHours), trend: thisMonthHours - previousMonthHours },
            { label: "Daily average", value: formatHours(dailyAverageHours), trend: dailyAverageHours - previousDailyAverageHours },
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
