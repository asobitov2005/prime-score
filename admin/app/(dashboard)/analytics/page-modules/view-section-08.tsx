import type { AnalyticsPageData } from "./loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./dependencies";

export function AnalyticsPageSection8({ scope }: { scope: AnalyticsPageData }) {
  const { report } = scope;
  return (
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
  );
}
