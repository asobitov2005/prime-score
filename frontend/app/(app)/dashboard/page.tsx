import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockHeatmap, mockProgressSeries, mockRadarSeries } from "@/lib/mock-data";
import { getDashboardStats, getUserAttempts } from "@/lib/server-me";

export default async function DashboardPage() {
  const [stats, attempts] = await Promise.all([getDashboardStats(), getUserAttempts()]);
  return (
    <div className="space-y-6">
      
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 p-6 lg:p-10 border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-5">
            <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Welcome back, Candidate.</CardTitle>
              <CardDescription className="text-muted-foreground text-base font-medium mt-1 max-w-lg leading-relaxed">
                Track your Reading and Listening progress, inspect recent attempts, and prepare for your next target score.
              </CardDescription>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 shrink-0">
             <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 w-fit px-3 py-1 font-black uppercase tracking-widest text-[10px] rounded-md shadow-sm border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                Premium Active
             </span>
             <Button asChild variant="solid" className="h-12 px-6 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:-translate-y-0.5">
               <Link href="/tests">
                 Explore tests
                 <ArrowRight className="h-4 w-4 ml-2" />
               </Link>
             </Button>
          </div>

        </CardHeader>
      </Card>


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/50">
            <CardHeader className="space-y-1 p-6">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">{stat.label}</CardDescription>
              <CardTitle className="text-4xl font-light">{stat.value}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">{stat.detail}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <DashboardCharts progressSeries={mockProgressSeries} radarSeries={mockRadarSeries} heatmap={mockHeatmap} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="flex flex-col">
          <CardHeader className="p-6 pb-4">
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-6 pt-0">
            <div className="space-y-4">
              {attempts.map((attempt) => (
                <div key={attempt.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-muted/50">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{attempt.testTitle}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="capitalize">{attempt.type}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span className="capitalize">{attempt.mode}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span>{attempt.source}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{attempt.score}</p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary">Band {attempt.band ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">Estimate</p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/attempts/${attempt.id}/result`}>Review</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="p-6 pb-4">
              <CardTitle>Pinned tests</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-6 pt-0">
              <div className="rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-muted/50">
                <p className="font-medium">Cambridge 18 Reading Test 1</p>
                <p className="text-sm text-muted-foreground mt-1">Public · 60m · 3 passages</p>
              </div>
              <div className="rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-muted/50">
                <p className="font-medium">Cambridge 18 Listening Test 2</p>
                <p className="text-sm text-muted-foreground mt-1">Premium · 32m · 4 parts</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="p-6 pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-primary/80">Leaderboard</CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-4 p-6 pt-0">
              <div>
                <p className="text-5xl font-light text-primary">#42</p>
                <p className="text-sm text-muted-foreground mt-2">Top 5% in Reading</p>
              </div>
              <Button asChild variant="link" className="text-primary hover:text-primary/80 px-0">
                <Link href="/leaderboard">
                  View rankings
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
