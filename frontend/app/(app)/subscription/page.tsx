import { Clock3, Lock, ShieldAlert, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockPlans } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function SubscriptionPage() {
  const sub_icon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        
        <CardHeader className="space-y-2 relative z-10 p-6 lg:px-10 lg:pt-10 lg:pb-6 border-b border-border/40 bg-muted/10">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Premium Access</CardTitle>
              <CardDescription className="text-muted-foreground text-base font-medium mt-1">
                Unlock full access to all authentic IELTS practice tests and detailed performance analytics.
              </CardDescription>
            </div>
            <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              {sub_icon}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] p-6 lg:px-10 lg:py-6 relative z-10 bg-background/50">
          <div className="flex items-center gap-3">
             <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 w-fit px-3 py-1 font-black uppercase tracking-widest text-[10px] rounded-md shadow-sm border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-1.5">
                Payments Paused
             </div>
             <p className="text-sm font-semibold text-muted-foreground">Select a plan to explore future features.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-10 px-4 text-xs font-bold rounded-xl border-border/60 bg-muted/30">
              <Gift className="h-4 w-4 mr-2" />
              Redeem Code
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {mockPlans.map((plan) => (
          <Card key={plan.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm rounded-2xl flex flex-col">
            <CardHeader className="p-6 border-b border-border/40 bg-muted/10">
              <div className="flex items-center justify-between gap-3 mb-2">
                <CardTitle className="text-xl font-black tracking-tight">{plan.title}</CardTitle>
                <Badge tone="outline" className="bg-primary/10 text-primary border-none font-bold">{plan.discountLabel}</Badge>
              </div>
              <p className="text-3xl font-black text-foreground">{plan.price}</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between bg-background/50">
              <ul className="space-y-3">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-3 text-sm font-medium text-muted-foreground leading-snug">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    {perk}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full h-12 font-bold rounded-xl border-border/60 bg-muted/20" disabled>
                <Lock className="h-4 w-4 mr-2" />
                Checkout Paused
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
