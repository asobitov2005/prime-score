import { getAdminAnalyticsPoints, getAdminAnalyticsReport } from "@/lib/server-data";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, SectionHeader, ProgressBar, StatCard } from "@/components/ui";
import { TrendingUp, Users, Brain, Activity, Target, Zap } from "lucide-react";

export default async function AnalyticsPage() {
  const [points, report] = await Promise.all([
    getAdminAnalyticsPoints(),
    getAdminAnalyticsReport()
  ]);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
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
                <ProgressBar value={12.4} />
                <p className="text-xs text-muted-foreground font-medium italic">Industry average for IELTS platforms: 8-10%</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Activity size={16} className="text-red-500" />
                    Churn Rate
                  </p>
                  <span className="text-2xl font-black">{report.churnRate}</span>
                </div>
                <ProgressBar value={2.1} />
                <p className="text-xs text-muted-foreground font-medium italic">Monthly subscription cancellations.</p>
              </div>
            </div>
            
            <div className="pt-6 border-t border-border">
               <CardTitle className="text-lg mb-4">Top Performing Tests</CardTitle>
               <div className="space-y-3">
                 {report.topTests.map((test, i) => (
                   <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-sm font-bold text-foreground">{test.title}</p>
                      <Badge tone="info" className="text-[10px] font-black">{test.count} attempts</Badge>
                   </div>
                 ))}
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="flex items-center gap-2">
                <Brain size={20} className="text-primary" />
                Hardest Questions
              </CardTitle>
              <CardDescription>Error rate distribution by question type.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               {report.hardestTypes.map((item, i) => (
                 <div key={i} className="space-y-3">
                    <div className="flex justify-between items-center">
                       <p className="text-sm font-black uppercase tracking-tight">{item.type}</p>
                       <span className="text-sm font-bold text-red-500">{item.errorRate} Error</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-red-500/60 transition-all duration-1000" 
                         style={{ width: item.errorRate }} 
                       />
                    </div>
                 </div>
               ))}
               
               <div className="mt-10 p-5 rounded-2xl bg-primary/5 border border-primary/10">
                  <p className="text-xs font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                    <Target size={14} /> Actionable Insight
                  </p>
                  <p className="text-sm font-medium text-foreground leading-relaxed italic">
                    "Users are struggling most with <strong>Matching Headings</strong>. Consider adding a specialized video guide or more practice materials for this family."
                  </p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
