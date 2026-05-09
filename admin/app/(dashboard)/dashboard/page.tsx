import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, BarChart3, CreditCard, FileText, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, ProgressBar, SectionHeader, buttonClassName, cn } from "@/components/ui";
import { getAdminDashboardOverview } from "@/lib/server-data";
import { RevenueTrendChart, RegistrationTrendChart, AttemptsByDayChart, TypeSplitChart, BandDistributionChart, PaymentSplitChart, StatusSplitChart } from "@/components/dashboard-charts";
import { AdminFilterBar } from "@/components/admin-filter-bar";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/80">
      <div
        className={cn(
          "absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full blur-2xl",
          tone === "success" && "bg-success/20",
          tone === "warning" && "bg-warning/20",
          tone === "danger" && "bg-danger/20",
          tone === "neutral" && "bg-primary/15"
        )}
      />
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</CardDescription>
          <CardTitle className="mt-2 text-3xl font-black tracking-tight">{value}</CardTitle>
        </div>
        <div className="rounded-xl border border-border bg-background/70 p-2 text-primary">{icon}</div>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-xs font-semibold text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const metrics = await getAdminDashboardOverview(searchParams);
  const hasActivity = metrics.recentActivity.length > 0;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <AdminFilterBar />
      
      <SectionHeader
        eyebrow="Command Center"
        title="Platform Metrics"
        description="Live operational numbers from the production database. Empty database states stay zero."
        actions={
          <Link href="/analytics" className={buttonClassName({ variant: "solid", size: "sm" })}>
            <BarChart3 className="h-4 w-4" />
            Open Analytics
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={`${formatMoney(metrics.revenueTotal)} UZS`}
          detail={`${formatNumber(metrics.paymentsCompleted)} completed payments`}
          icon={<CreditCard className="h-5 w-5" />}
          tone="success"
        />
        <MetricCard
          label="Users"
          value={formatNumber(metrics.usersTotal)}
          detail={`${formatNumber(metrics.usersNewToday)} new today, ${formatNumber(metrics.activeUsers7d)} active in 7 days`}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          label="Attempts"
          value={formatNumber(metrics.attemptsTotal)}
          detail={`${formatNumber(metrics.attemptsToday)} started today, ${metrics.completionRate}% completed`}
          icon={<Activity className="h-5 w-5" />}
          tone="warning"
        />
        <MetricCard
          label="Premium"
          value={formatNumber(metrics.premiumUsers)}
          detail={`${metrics.premiumRate}% of registered users`}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="success"
        />
      </div>

      {/* ---- NEW: Revenue + Registration + Attempts Trend Charts ---- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">Revenue Trend</CardDescription>
            <CardTitle className="text-lg font-semibold">30-day revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <RevenueTrendChart data={metrics.revenueTrend} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">New Users</CardDescription>
            <CardTitle className="text-lg font-semibold">30-day registrations</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <RegistrationTrendChart data={metrics.registrationTrend} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">Daily Attempts</CardDescription>
            <CardTitle className="text-lg font-semibold">30-day activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <AttemptsByDayChart data={metrics.attemptsByDay} />
          </CardContent>
        </Card>
      </div>

      {/* ---- NEW: Type Split + Band Distribution + Avg Time ---- */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-3">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">Test Type Split</CardDescription>
            <CardTitle className="text-lg font-semibold">Reading vs Listening</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <TypeSplitChart data={metrics.typeSplit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Band Distribution</CardTitle>
            <CardDescription>Historical performance spread.</CardDescription>
          </CardHeader>
          <CardContent>
            <BandDistributionChart data={metrics.bandDistribution} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Method distribution.</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentSplitChart data={metrics.paymentMethodSplit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attempt Status</CardTitle>
            <CardDescription>Platform activity health.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusSplitChart data={metrics.attemptStatusSplit} />
          </CardContent>
        </Card>
      </div>

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

      {/* ---- Top Active Users ---- */}
      {metrics.topActiveUsers.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em]">Top Active Users</CardDescription>
            <CardTitle className="text-lg font-semibold">Most engaged users by attempt count</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/5">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Attempts</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topActiveUsers.map((user, idx) => (
                    <tr key={user.name + idx} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-black text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold">{user.name}</td>
                      <td className="px-4 py-3 text-right font-black">{user.attemptCount}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{user.lastActive ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle>Operational Health</CardTitle>
            <CardDescription>Live ratios derived from attempts, users, tests, and payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-7 p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Attempt completion rate</p>
                <Badge tone={metrics.completionRate >= 60 ? "success" : "warning"}>{metrics.completionRate}%</Badge>
              </div>
              <ProgressBar value={metrics.completionRate} />
              <p className="text-xs font-medium text-muted-foreground">
                {formatNumber(metrics.attemptsCompleted)} completed out of {formatNumber(metrics.attemptsTotal)} attempts.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Premium user share</p>
                <Badge tone={metrics.premiumRate > 0 ? "success" : "neutral"}>{metrics.premiumRate}%</Badge>
              </div>
              <ProgressBar value={metrics.premiumRate} />
              <p className="text-xs font-medium text-muted-foreground">
                {formatNumber(metrics.premiumUsers)} premium users out of {formatNumber(metrics.usersTotal)} registered users.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Published</p>
                <p className="mt-2 text-2xl font-black">{formatNumber(metrics.testsPublished)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Draft</p>
                <p className="mt-2 text-2xl font-black">{formatNumber(metrics.testsDraft)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Archived</p>
                <p className="mt-2 text-2xl font-black">{formatNumber(metrics.testsArchived)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Content Status
              </CardTitle>
              <CardDescription>Current test library state from DB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
                <span className="text-sm font-semibold">Total tests</span>
                <span className="text-xl font-black">{formatNumber(metrics.testsTotal)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
                <span className="text-sm font-semibold">Average band</span>
                <span className="text-xl font-black">{metrics.averageBand == null ? "0" : metrics.averageBand.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
                <span className="text-sm font-semibold">Pending payments</span>
                <Badge tone={metrics.paymentsPending > 0 ? "warning" : "neutral"}>{formatNumber(metrics.paymentsPending)}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Recent Admin Activity
              </CardTitle>
              <CardDescription>Latest audit events written by admin actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {hasActivity ? (
                metrics.recentActivity.map((item) => (
                  <div key={item} className="rounded-xl border border-border bg-background/60 px-4 py-3 text-sm font-semibold">
                    {item}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm font-medium text-muted-foreground">
                  No audit activity yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

