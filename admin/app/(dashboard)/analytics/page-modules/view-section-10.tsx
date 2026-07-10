import type { AnalyticsPageData } from "./loader";
import { BarChart3, Card, CardContent, CardDescription, CardHeader, CardTitle, ProgressBar, Users } from "./dependencies";

export function AnalyticsPageSection10({ scope }: { scope: AnalyticsPageData }) {
  const { report } = scope;
  return (
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
  );
}
