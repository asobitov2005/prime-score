import type { DashboardPageData } from "./loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./dependencies";

export function DashboardPageSection11({ scope }: { scope: DashboardPageData }) {
  const { metrics } = scope;
  return (
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
  );
}
