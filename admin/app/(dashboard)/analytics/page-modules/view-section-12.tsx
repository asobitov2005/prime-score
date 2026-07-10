import type { AnalyticsPageData } from "./loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./dependencies";

export function AnalyticsPageSection12({ scope }: { scope: AnalyticsPageData }) {
  const { report } = scope;
  return (
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
  );
}
