import type { DashboardPageData } from "./loader";
import { AttemptsByDayChart, Card, CardContent, CardDescription, CardHeader, CardTitle, RegistrationTrendChart, RevenueTrendChart } from "./dependencies";

export function DashboardPageSection6({ scope }: { scope: DashboardPageData }) {
  const { metrics } = scope;
  return (
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
  );
}
