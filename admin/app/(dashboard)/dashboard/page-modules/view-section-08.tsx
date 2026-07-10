import type { DashboardPageData } from "./loader";
import { BandDistributionChart, Card, CardContent, CardDescription, CardHeader, CardTitle, PaymentSplitChart, StatusSplitChart, TypeSplitChart } from "./dependencies";

export function DashboardPageSection8({ scope }: { scope: DashboardPageData }) {
  const { metrics } = scope;
  return (
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
  );
}
