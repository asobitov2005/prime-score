import { Clock3, Lock, ShieldAlert, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockPlans } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function SubscriptionPage() {
  const sub_icon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        
        <CardHeader className="space-y-1 relative z-10 p-5 lg:px-6 border-b border-border/40 bg-muted/5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Premium Access</CardTitle>
              <CardDescription className="text-muted-foreground text-sm font-medium">
                Unlock full access to all authentic IELTS practice tests and detailed performance analytics.
              </CardDescription>
            </div>
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              {sub_icon}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] p-4 lg:px-6 relative z-10 bg-background/50">
          <div className="flex items-center gap-3">
             <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 font-bold uppercase tracking-wider text-[9px] rounded-md border border-amber-200 dark:border-amber-800/50 flex items-center gap-1">
                Payments Paused
             </span>
             <p className="text-xs font-semibold text-muted-foreground">Select a plan to explore future features.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-bold rounded-lg border-border/60 bg-muted/20 hover:bg-muted/40">
              <Gift className="h-3.5 w-3.5 mr-2" />
              Redeem Code
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {mockPlans.map((plan) => (
          <Card key={plan.id} className="group overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-300 border-border/50 bg-card rounded-2xl flex flex-col">
            <CardHeader className="p-5 border-b border-border/10 bg-muted/5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <CardTitle className="text-lg font-bold tracking-tight">{plan.title}</CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 border-none font-bold text-[10px] px-2 py-0.5">
                  {plan.discountLabel}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{plan.price}</p>
            </CardHeader>
            <CardContent className="p-5 space-y-5 flex-1 flex flex-col justify-between bg-background/40">
              <ul className="space-y-2.5">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-xs font-medium text-muted-foreground leading-snug">
                    <div className="mt-0.5 shrink-0 rounded-full bg-primary/10 p-0.5 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    {perk}
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full h-10 text-xs font-bold rounded-lg border-border/60 bg-muted/20" disabled>
                <Lock className="h-3.5 w-3.5 mr-2" />
                Checkout Paused
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
