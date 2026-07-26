import { getAdminAnalyticsReport } from "@/lib/server-data";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, SectionHeader, ProgressBar } from "@/components/ui";
import { TrendingUp, Activity, Target, Users, BarChart3 } from "lucide-react";
import { DauTrendChart, HourlyDistributionChart, WeekdayActivityChart } from "@/components/analytics-charts";
import { AdminFilterBar } from "@/components/admin-filter-bar";

function percentValue(value: string): number {
  const parsed = Number(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const report = await getAdminAnalyticsReport(searchParams);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <AdminFilterBar />
      
      <SectionHeader
        eyebrow="Data Intelligence"
        title="Deep Analytics"
        description="Detailed performance metrics, user retention, and content difficulty analysis."
      />

      {/* Retention Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary">Daily Active (DAU)</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter">{report.dau}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-bold text-muted-foreground">Unique users today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Weekly Active (WAU)</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter">{report.wau}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-bold text-muted-foreground">Unique users this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Monthly Active (MAU)</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter">{report.mau}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-bold text-muted-foreground">Unique users this month</p>
          </CardContent>
        </Card>
      </div>

      {/* ---- NEW: DAU Trend + Hourly Distribution ---- */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">DAU Trend</CardDescription>
            <CardTitle className="text-lg font-semibold">30-day daily active users</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <DauTrendChart data={report.dauTrend} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">Hourly Distribution</CardDescription>
            <CardTitle className="text-lg font-semibold">When users practice most</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <HourlyDistributionChart data={report.hourlyDistribution} />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="flex items-center gap-2">
              <Activity size={20} className="text-emerald-500" />
              Weekly Heatmap
            </CardTitle>
            <CardDescription>Activity distribution across days of week.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <WeekdayActivityChart data={report.weekdayActivity} />
          </CardContent>
        </Card>
      </div>

      {report.userSegmentation && (
        <Card>
          <CardHeader className="border-b bg-muted/10">
            <CardTitle>User Segmentation</CardTitle>
            <CardDescription>Comparing behavior of Free vs Premium users.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid gap-12 md:grid-cols-2">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-xl font-black">F</div>
                   <div>
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Free Tier</p>
                      <p className="text-2xl font-black">{report.userSegmentation.free.count} Users</p>
                   </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                   <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Avg. Attempts / User</p>
                   <p className="text-xl font-black text-foreground">{report.userSegmentation.free.avgAttempts}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-xl font-black text-primary">P</div>
                   <div>
                      <p className="text-sm font-bold text-primary uppercase tracking-tight">Premium Tier</p>
                      <p className="text-2xl font-black">{report.userSegmentation.premium.count} Users</p>
                   </div>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                   <p className="text-xs font-bold text-primary uppercase mb-1">Avg. Attempts / User</p>
                   <p className="text-xl font-black text-foreground">{report.userSegmentation.premium.avgAttempts}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- NEW: Completion Funnel ---- */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" />
              Completion Funnel
            </CardTitle>
            <CardDescription>Started → Completed conversion</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {report.completionFunnel ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Started</p>
                    <p className="mt-1 text-3xl font-black">{report.completionFunnel.started}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Completed</p>
                    <p className="mt-1 text-3xl font-black">{report.completionFunnel.completed}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Rate</p>
                    <p className="mt-1 text-3xl font-black">{report.completionFunnel.rate}%</p>
                  </div>
                </div>
                <ProgressBar value={report.completionFunnel.rate} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm font-medium text-muted-foreground">
                No completion data yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Platform Stickiness
            </CardTitle>
            <CardDescription>DAU / MAU engagement ratio</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-muted/20 p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">DAU</p>
                  <p className="mt-1 text-3xl font-black">{report.dau}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/20 p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">MAU</p>
                  <p className="mt-1 text-3xl font-black">{report.mau}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Stickiness Score</p>
                <p className="mt-2 text-4xl font-black text-foreground">
                  {report.mau > 0 ? Math.round((report.dau / report.mau) * 100) : 0}%
                </p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  A score above 20% indicates good user retention and daily engagement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- NEW: Avg Score by Test ---- */}
      {report.avgScoreByTest.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">Average Score by Test</CardDescription>
            <CardTitle className="text-lg font-semibold">Band performance per test</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/5">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Test</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg Band</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {report.avgScoreByTest.map((item) => (
                    <tr key={item.testTitle} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold">{item.testTitle}</td>
                      <td className="px-4 py-3 text-right font-black">{item.avgBand != null ? item.avgBand.toFixed(1) : "—"}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-bold">{item.attemptCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="border-b bg-muted/10">
            <CardTitle>User Growth & Conversion</CardTitle>
            <CardDescription>Conversion from free to premium and churn rates.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" />
                    Conversion Rate
                  </p>
                  <span className="text-2xl font-black">{report.conversionRate}</span>
                </div>
                <ProgressBar value={percentValue(report.conversionRate)} />
                <p className="text-xs text-muted-foreground font-medium">Premium users divided by total registered users.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Activity size={16} className="text-red-500" />
                    Churn Rate
                  </p>
                  <span className="text-2xl font-black">{report.churnRate}</span>
                </div>
                <ProgressBar value={percentValue(report.churnRate)} />
                <p className="text-xs text-muted-foreground font-medium">Returns 0% until cancellation tracking exists in DB.</p>
              </div>
            </div>
            
            <div className="pt-6 border-t border-border">
               <CardTitle className="text-lg mb-4">Top Performing Tests</CardTitle>
               <div className="space-y-3">
                 {report.topTests.length === 0 ? (
                   <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm font-medium text-muted-foreground">
                     No attempt data yet.
                   </div>
                 ) : null}
                 {report.topTests.map((test) => (
                   <div key={test.title} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-sm font-bold text-foreground">{test.title}</p>
                      <Badge tone="info" className="text-[10px] font-black">{test.count} attempts</Badge>
                   </div>
                 ))}
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* NEW: User Segmentation Card */}
          {report.userSegmentation && (
            <Card className="h-full">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="flex items-center gap-2">
                  <Target size={20} className="text-primary" />
                  User Value Segmentation
                </CardTitle>
                <CardDescription>Engagement breakdown by subscription tier.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Premium Users</p>
                    <Badge tone="success" className="font-black text-xs">{report.userSegmentation.premium.count} users</Badge>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Avg Attempts</p>
                    <p className="mt-1 text-4xl font-black text-foreground">{report.userSegmentation.premium.avgAttempts}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-muted-foreground">Free Users</p>
                    <Badge tone="neutral" className="font-black text-xs">{report.userSegmentation.free.count} users</Badge>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg Attempts</p>
                    <p className="mt-1 text-4xl font-black text-foreground">{report.userSegmentation.free.avgAttempts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
