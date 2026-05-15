import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { RedeemCodePanel } from "@/components/subscription/redeem-code-panel";
import { SubscriptionHeroStatus } from "@/components/subscription/subscription-hero-status";
import { SubscriptionWorkspace } from "@/components/subscription/subscription-workspace";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyPayments } from "@/lib/server-payments";
import { getPublicPlans } from "@/lib/server-plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubscriptionPage() {
  const [plans, payments] = await Promise.all([getPublicPlans(), getMyPayments()]);

  return (
    <div className="-mt-1 space-y-3 animate-in fade-in duration-500 md:-mt-2">
      <Card className="relative overflow-hidden rounded-xl border border-border/50 bg-background shadow-sm">
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <CardHeader className="relative z-10 space-y-1 bg-muted/5 p-3.5 lg:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-semibold tracking-tight text-foreground md:text-lg">
                  Subscription
                </CardTitle>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
                  1
                </span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground md:text-xs">
                Choose a plan, transfer the amount, then send the receipt screenshot to Telegram support.
              </p>
              <SubscriptionHeroStatus />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PrimePremiumIcon className="h-4 w-4" />
              </div>
              <RedeemCodePanel buttonClassName="h-9 rounded-lg px-3.5 text-[12px] font-semibold" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <SubscriptionWorkspace plans={plans} initialPayments={payments} />
    </div>
  );
}
