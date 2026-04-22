import { Gift, ShieldCheck } from "lucide-react";
import { PricingPlanGrid } from "@/components/marketing/pricing-plan-grid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPublicPlans } from "@/lib/server-plans";

export default async function SubscriptionPage() {
  const plans = await getPublicPlans();

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <Card className="overflow-hidden rounded-[2rem] border border-border/50 bg-card/80 shadow-sm backdrop-blur-xl">
        <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <div className="grid gap-5 px-5 py-5 md:grid-cols-[1fr_auto] md:items-center lg:px-6 lg:py-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              <ShieldCheck className="h-3 w-3" />
              Premium Access
            </div>
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Choose a PrimeScore plan that fits your IELTS timeline.
              </h1>
            </div>
          </div>

          <Button variant="outline" className="h-11 rounded-xl border-border/60 bg-muted/20 px-5 text-sm font-bold hover:bg-muted/40">
            <Gift className="mr-2 h-4 w-4" />
            Redeem Code
          </Button>
        </div>
      </Card>

      <PricingPlanGrid plans={plans} showStateCard={false} showPlanNotes={false} denseCards={true} />
    </div>
  );
}
