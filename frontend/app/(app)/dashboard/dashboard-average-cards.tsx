"use client";

import { useState } from "react";
import { DashboardTrendLineChart } from "@/components/dashboard/dashboard-trend-line-chart";
import { getAverageBand, getAverageSkillBand, roundToIeltsBand } from "@/lib/dashboard-metrics";
import { getDayTrendPoints, type DashboardTrendSkill } from "@/lib/dashboard-trend";
import type { DashboardAnalytics } from "@/lib/types";

const SKILLS = ["reading", "listening", "writing", "speaking"] as const;
const SERIES = ["overall", ...SKILLS] as const;

export function OverallBandKpiCard({ initialAnalytics }: { initialAnalytics: DashboardAnalytics }) {
  const [skill, setSkill] = useState<DashboardTrendSkill>("overall");
  const average = skill === "overall"
    ? getAverageSkillBand(SKILLS.map((item) => getAverageBand(initialAnalytics, item)))
    : getAverageBand(initialAnalytics, skill);
  const points = getDayTrendPoints(initialAnalytics, skill, 7);
  const hasPoints = points.some((point) => point.value !== null);

  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-5 sm:p-6" aria-labelledby="band-progress-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="band-progress-title" className="text-base font-semibold tracking-tight text-foreground">Band progress</h2>
          <p className="mt-1 text-xs text-muted-foreground">Your scored results over the last 7 days.</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {average === null ? "—" : roundToIeltsBand(average).toFixed(1)}
          </span>
          <p className="mt-1 text-[10px] text-muted-foreground">Average {skill === "overall" ? "across scored skills" : `${skill} band`}</p>
        </div>
      </div>
      <div className="my-5 flex flex-wrap gap-1" role="group" aria-label="Band progress skill">
        {SERIES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={skill === item}
            onClick={() => setSkill(item)}
            className="rounded-md px-2.5 py-2 text-xs font-medium capitalize text-muted-foreground transition-colors hover:bg-muted aria-pressed:bg-accent aria-pressed:text-primary"
          >
            {item}
          </button>
        ))}
      </div>
      {hasPoints ? (
        <div className="h-[180px]" aria-live="polite">
          <DashboardTrendLineChart points={points} seriesLabel={skill} strokeColor="hsl(var(--primary))" height={180} />
        </div>
      ) : (
        <div className="grid h-[180px] place-content-center rounded-lg border border-dashed border-border px-4 text-center">
          <p className="text-sm font-medium text-foreground">No {skill === "overall" ? "scored" : skill} results this week</p>
          <p className="mt-2 text-xs text-muted-foreground">Complete a test to see your band progress here.</p>
        </div>
      )}
    </section>
  );
}
