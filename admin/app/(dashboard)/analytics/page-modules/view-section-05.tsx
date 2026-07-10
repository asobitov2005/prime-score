import type { AnalyticsPageData } from "./loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./dependencies";

export function AnalyticsPageSection5({ scope }: { scope: AnalyticsPageData }) {
  const { report } = scope;
  return (
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
  );
}
