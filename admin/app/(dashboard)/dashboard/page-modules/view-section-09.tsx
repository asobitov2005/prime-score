import type { DashboardPageData } from "./loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./dependencies";

export function DashboardPageSection9({ scope }: { scope: DashboardPageData }) {
  const { metrics } = scope;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/10 pb-3">
                <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">Avg Time Per Test</CardDescription>
                <CardTitle className="text-lg font-semibold">By test type</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Reading</p>
                  <p className="mt-1.5 text-3xl font-black text-foreground">
                    {metrics.avgTimePerTest?.readingAvgMin != null ? `${metrics.avgTimePerTest.readingAvgMin} min` : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Listening</p>
                  <p className="mt-1.5 text-3xl font-black text-foreground">
                    {metrics.avgTimePerTest?.listeningAvgMin != null ? `${metrics.avgTimePerTest.listeningAvgMin} min` : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
    
            {metrics.quickStats && (
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/10 pb-3">
                  <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">Platform Highlights</CardDescription>
                  <CardTitle className="text-lg font-semibold">Quick Stats Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3 border border-primary/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Fastest Test</span>
                    <span className="text-lg font-black">{metrics.quickStats.fastestCompletionMin ? `${metrics.quickStats.fastestCompletionMin}m` : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-amber-500/5 px-4 py-3 border border-amber-500/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Avg Accuracy</span>
                    <span className="text-lg font-black">{metrics.quickStats.averageAccuracy}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-violet-500/5 px-4 py-3 border border-violet-500/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Top Band Score</span>
                    <span className="text-lg font-black">{metrics.quickStats.highestBandAchieved ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
  );
}
