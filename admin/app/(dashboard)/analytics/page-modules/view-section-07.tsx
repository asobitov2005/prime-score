import type { AnalyticsPageData } from "./loader";
import { Activity, Card, CardContent, CardDescription, CardHeader, CardTitle, DauTrendChart, HourlyDistributionChart, WeekdayActivityChart } from "./dependencies";

export function AnalyticsPageSection7({ scope }: { scope: AnalyticsPageData }) {
  const { report } = scope;
  return (
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
  );
}
