import Link from "next/link";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ProgressBar, SectionHeader, buttonClassName, cn } from "@/components/ui";
import { ArrowRight, Activity, Users, Zap, TrendingUp, Clock, Flame, Target, Filter, ChevronRight, BarChart3, CreditCard } from "lucide-react";

export default async function DashboardPage() {
  // Mocking the comprehensive data based on the requested metrics
  const metrics = {
    mrr: "$4,250",
    dailyPurchases: 14,
    conversionRate: "8.4%",
    
    users: {
      new: { daily: 45, weekly: 310, monthly: 1250 },
      active: { dau: 850, wau: 4200, mau: 12500 }
    },
    
    engagement: {
      testsTaken: { daily: 1200, weekly: 8500, monthly: 35000 },
      avgTestsPerUser: 4.2,
      avgSessionDuration: "24m 10s",
      timeSpentPerDay: "45m"
    },
    
    funnel: {
      signupToFirst: 78, // %
      firstToSecond: 65, // %
      activeToPremium: 12 // %
    },
    
    loyalty: {
      retention7d: "42%",
      retention30d: "24%",
      returningUsers: "68%",
      streaks: 340, // users with 3+ day streak
      topScore10: "7.5 Band" // avg score of top 10%
    }
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <SectionHeader
        eyebrow="Command Center"
        title="Platform Metrics"
        description="Real-time pulse of your user growth, revenue, and product engagement."
        actions={
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="font-bold border-border/60">
              <Filter className="h-4 w-4 mr-2" />
              Last 30 Days
            </Button>
            <Link href="/analytics" className={buttonClassName({ variant: "solid", size: "sm" })}>
              View Full Report
            </Link>
          </div>
        }
      />

      {/* Hero Stats: The Big 4 */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-card/50 hover:bg-card transition-colors border-border/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><CreditCard size={64} /></div>
          <CardHeader className="p-6 pb-2">
            <CardDescription className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">MRR (Revenue)</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter text-foreground">{metrics.mrr}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-xs font-bold text-emerald-500 flex items-center gap-1"><TrendingUp size={12}/> +12.5% vs last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 hover:bg-card transition-colors border-border/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Users size={64} /></div>
          <CardHeader className="p-6 pb-2">
            <CardDescription className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Active Users (DAU)</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter text-foreground">{metrics.users.active.dau.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-xs font-bold text-emerald-500 flex items-center gap-1"><TrendingUp size={12}/> +5.2% vs yesterday</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 hover:bg-card transition-colors border-border/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Activity size={64} /></div>
          <CardHeader className="p-6 pb-2">
            <CardDescription className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Tests Taken (Daily)</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter text-foreground">{metrics.engagement.testsTaken.daily.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-xs font-bold text-emerald-500 flex items-center gap-1"><TrendingUp size={12}/> +8.4% vs yesterday</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 hover:bg-primary/10 transition-colors border-primary/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-primary"><Zap size={64} /></div>
          <CardHeader className="p-6 pb-2">
            <CardDescription className="text-[11px] font-black uppercase tracking-widest text-primary">Free → Paid Conversion</CardDescription>
            <CardTitle className="text-4xl font-black tracking-tighter text-foreground">{metrics.conversionRate}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-xs font-bold text-primary/80">Avg. {metrics.dailyPurchases} daily purchases</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Audience & Growth */}
        <Card className="border-border/50 shadow-sm flex flex-col">
          <CardHeader className="border-b border-border/40 bg-muted/10 p-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary"/> Audience & Growth</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="p-5 border-b border-border/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">New Users</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-lg font-black text-foreground">{metrics.users.new.daily}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Daily</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-lg font-black text-foreground">{metrics.users.new.weekly}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Weekly</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-lg font-black text-foreground">{metrics.users.new.monthly}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Monthly</p>
                </div>
              </div>
            </div>
            <div className="p-5 flex-1 bg-background/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Active Users (MAU/WAU)</p>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-sm font-bold">Monthly Active</p>
                  <p className="text-xl font-black">{metrics.users.active.mau.toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-sm font-bold">Weekly Active</p>
                  <p className="text-xl font-black">{metrics.users.active.wau.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: The Funnel */}
        <Card className="border-border/50 shadow-sm flex flex-col">
          <CardHeader className="border-b border-border/40 bg-muted/10 p-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2"><Filter className="h-5 w-5 text-primary"/> User Journey Funnel</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-6 flex-1">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-foreground">Signup → 1st Test</span>
                <span className="font-bold text-primary">{metrics.funnel.signupToFirst}%</span>
              </div>
              <ProgressBar value={metrics.funnel.signupToFirst} />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Activation Rate</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-foreground">1st Test → 2nd Test</span>
                <span className="font-bold text-primary">{metrics.funnel.firstToSecond}%</span>
              </div>
              <ProgressBar value={metrics.funnel.firstToSecond} />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Hooked Rate</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-foreground">Active → Premium</span>
                <span className="font-bold text-emerald-500">{metrics.funnel.activeToPremium}%</span>
              </div>
              {/* Custom colored progress bar for revenue */}
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 transition-all" style={{ width: `${metrics.funnel.activeToPremium}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Monetization</p>
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Engagement & Loyalty */}
        <Card className="border-border/50 shadow-sm flex flex-col">
          <CardHeader className="border-b border-border/40 bg-muted/10 p-5">
            <CardTitle className="text-lg font-bold flex items-center gap-2"><Target className="h-5 w-5 text-primary"/> Engagement & Quality</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="p-5 border-b border-border/40 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Time per day</p>
                <p className="text-2xl font-black text-foreground flex items-center gap-1.5"><Clock size={18} className="text-primary"/> {metrics.engagement.timeSpentPerDay}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Avg Session</p>
                <p className="text-2xl font-black text-foreground">{metrics.engagement.avgSessionDuration}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Avg Tests/User</p>
                <p className="text-2xl font-black text-foreground">{metrics.engagement.avgTestsPerUser}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Returning</p>
                <p className="text-2xl font-black text-foreground">{metrics.loyalty.returningUsers}</p>
              </div>
            </div>
            
            <div className="p-5 flex-1 bg-background/50 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <Flame className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Active Streaks</p>
                    <p className="text-[10px] uppercase font-bold text-amber-700/70 dark:text-amber-400/70">3+ consecutive days</p>
                  </div>
                </div>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400">{metrics.loyalty.streaks}</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">Top 10% Users</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Average Score</p>
                </div>
                <Badge tone="info" className="text-sm font-black px-3 py-1">{metrics.loyalty.topScore10}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2">
         <Card className="border-border/50 shadow-sm">
           <CardHeader className="p-5 pb-0">
             <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Retention Curve</CardTitle>
           </CardHeader>
           <CardContent className="p-5 flex gap-8">
             <div className="flex-1">
               <p className="text-3xl font-black text-foreground mb-1">{metrics.loyalty.retention7d}</p>
               <p className="text-xs font-bold text-muted-foreground">Day 7 Retention</p>
               <div className="h-1.5 w-full bg-muted rounded-full mt-2 overflow-hidden"><div className="h-full bg-primary w-[42%]" /></div>
             </div>
             <div className="flex-1">
               <p className="text-3xl font-black text-foreground mb-1">{metrics.loyalty.retention30d}</p>
               <p className="text-xs font-bold text-muted-foreground">Day 30 Retention</p>
               <div className="h-1.5 w-full bg-muted rounded-full mt-2 overflow-hidden"><div className="h-full bg-primary w-[24%]" /></div>
             </div>
           </CardContent>
         </Card>

         <Card className="border-border/50 shadow-sm bg-muted/10">
           <CardHeader className="p-5 pb-0">
             <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Quick Insights</CardTitle>
           </CardHeader>
           <CardContent className="p-5 space-y-3">
             <p className="text-sm font-medium text-foreground flex items-start gap-2">
               <span className="text-emerald-500 font-bold mt-0.5">↑</span> 
               Signup to 1st Test activation is strong (78%). Consider adding a small reward to push the "1st to 2nd" metric higher.
             </p>
             <p className="text-sm font-medium text-foreground flex items-start gap-2">
               <span className="text-primary font-bold mt-0.5">!</span> 
               Top users are averaging 7.5 Band. Generating advanced practice materials could drive more premium upgrades.
             </p>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}
