import { TrendingDown, TrendingUp } from "lucide-react";
import { DashboardTrendLineChart } from "@/components/dashboard/dashboard-trend-line-chart";
import { getAverageBand, roundToIeltsBand } from "@/components/charts/use-dashboard-analytics";
import { getDayTrendPoints } from "@/lib/dashboard-trend";
import type { DashboardAnalytics } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getAverageSkillBand } from "./dashboard-metrics";

interface DashboardAverageCardsProps {
  initialAnalytics: DashboardAnalytics;
}

function getOverallBand(analytics: DashboardAnalytics): number {
  const average = getAverageSkillBand([
    getAverageBand(analytics, "reading"),
    getAverageBand(analytics, "listening"),
    getAverageBand(analytics, "writing"),
    getAverageBand(analytics, "speaking"),
  ]);
  return average === null ? 0 : roundToIeltsBand(average);
}

export function OverallBandKpiCard({ initialAnalytics }: DashboardAverageCardsProps) {
  const analytics = initialAnalytics;
  const overallBand = getOverallBand(analytics);
  const trendPoints = getDayTrendPoints(analytics, "overall", 5);
  const lastDayValue = trendPoints[trendPoints.length - 1]?.value ?? null;
  const previousDayValue = trendPoints[trendPoints.length - 2]?.value ?? null;
  const trendDelta = lastDayValue !== null && previousDayValue !== null
    ? roundToIeltsBand(lastDayValue - previousDayValue)
    : null;
  const delta = analytics.improvementRate?.delta ?? trendDelta;
  const gaugePath = "M18 100 A52 52 0 1 1 110 100";
  const gaugeLength = 265;
  const progress = overallBand > 0 ? Math.max(0, Math.min(overallBand / 9, 1)) : 0;
  const dashOffset = gaugeLength * (1 - progress);

  return (
    <section className="relative h-full overflow-hidden rounded-[1.2rem] border border-orange-200/60 bg-card p-3 shadow-xl shadow-orange-950/8 dark:border-orange-500/20 dark:bg-slate-950/80 dark:shadow-black/30">
      <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-orange-200/25 dark:bg-orange-500/10" />
      <div className="relative">
        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[96px_minmax(0,1fr)]">
          <div className="flex shrink-0 flex-col items-center">
            <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">AVERAGE BAND</p>
            <div className="relative h-[108px] w-[108px]">
              <svg className="h-full w-full" viewBox="0 0 128 128" aria-hidden="true">
                <path d={gaugePath} fill="none" stroke="rgba(251,146,60,0.12)" strokeWidth="6" strokeLinecap="round" />
                <path d={gaugePath} fill="none" stroke="rgba(251,146,60,0.08)" strokeWidth="2" strokeLinecap="round" />
                <path
                  d={gaugePath}
                  fill="none"
                  stroke="rgba(251,146,60,0.22)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={gaugeLength}
                  strokeDashoffset={dashOffset}
                />
                <path
                  d={gaugePath}
                  fill="none"
                  stroke="url(#overall-band-progress)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={gaugeLength}
                  strokeDashoffset={dashOffset}
                />
                <defs>
                  <linearGradient id="overall-band-progress" x1="20" x2="96" y1="16" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FB923C" />
                    <stop offset="0.55" stopColor="#F97316" />
                    <stop offset="1" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
                <span className="text-[1.9rem] font-semibold leading-none tracking-tight text-foreground">
                  {overallBand > 0 ? overallBand.toFixed(1) : "—"}
                </span>
              </div>
            </div>

            <div className="-mt-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                {delta !== null && delta < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                )}
                <span className={cn("text-xs font-semibold", delta !== null && delta < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                  {delta !== null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts` : "No trend yet"}
                </span>
              </div>
              <p className="mt-0 text-[11px] font-medium text-muted-foreground">vs previous scored tests</p>
            </div>
          </div>

          <div className="min-w-0 self-center">
            <div className="h-[132px] w-full">
              <DashboardTrendLineChart points={trendPoints} seriesLabel="Overall" strokeColor="#F97316" height={132} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
