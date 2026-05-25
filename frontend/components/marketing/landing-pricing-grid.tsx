import { CheckCircle2, Sparkles } from "lucide-react";
import { LandingPricingPlanAction, LandingPricingStateCard } from "@/components/marketing/landing-pricing-auth";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketingPlan } from "@/lib/server-plans";
import { cn } from "@/lib/utils";

function getPlanGridClassName(planCount: number) {
  if (planCount <= 1) {
    return "mx-auto max-w-xl grid-cols-1";
  }

  if (planCount === 2) {
    return "mx-auto md:max-w-5xl md:grid-cols-2";
  }

  if (planCount === 3) {
    return "md:grid-cols-2 xl:grid-cols-3";
  }

  return "md:grid-cols-2 xl:grid-cols-4";
}

function calculateSavingsPercent(plan: MarketingPlan, baselinePlan: MarketingPlan | null): number {
  if (!baselinePlan || baselinePlan.id === plan.id) {
    return 0;
  }

  const baselineMonthlyCost = (baselinePlan.numericPrice / baselinePlan.durationDays) * 30;
  const currentMonthlyCost = (plan.numericPrice / plan.durationDays) * 30;
  if (!Number.isFinite(baselineMonthlyCost) || baselineMonthlyCost <= 0) {
    return 0;
  }

  return Math.max(0, Math.round((1 - currentMonthlyCost / baselineMonthlyCost) * 100));
}

function calculateSavingsAmount(plan: MarketingPlan, baselinePlan: MarketingPlan | null): number {
  if (!baselinePlan || baselinePlan.id === plan.id || baselinePlan.durationDays <= 0) {
    return 0;
  }

  const compareAtPrice = (baselinePlan.numericPrice / baselinePlan.durationDays) * plan.durationDays;
  if (!Number.isFinite(compareAtPrice) || compareAtPrice <= plan.numericPrice) {
    return 0;
  }

  return Math.round(compareAtPrice - plan.numericPrice);
}

function formatPlanMoney(value: number, currency: string): string {
  if (currency === "UZS") {
    return `${Math.round(value).toLocaleString("en-US").replace(/,/g, " ")} sum`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function LandingPricingEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/15 px-5 py-7 text-center shadow-none">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-background/70 text-primary shadow-inner">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-foreground">Premium plans are not configured yet</p>
      <p className="mt-1 max-w-sm text-xs font-medium leading-relaxed text-muted-foreground">
        Plans will appear here as soon as they are available. If you need access now, contact support.
      </p>
    </div>
  );
}

export function LandingPricingGrid({ plans }: { plans: MarketingPlan[] }) {
  const baselinePlan = [...plans].sort((left, right) => left.durationDays - right.durationDays)[0] ?? null;
  const planGridClassName = getPlanGridClassName(plans.length);
  const planSummaries = plans.map((plan) => ({ id: plan.id, durationDays: plan.durationDays }));

  return (
    <div className="space-y-6">
      <LandingPricingStateCard />

      {plans.length === 0 ? (
        <LandingPricingEmptyState />
      ) : (
        <div className={cn("grid gap-5", planGridClassName)}>
          {plans.map((plan) => {
            const isFeatured = plan.isFeatured;
            const savings = calculateSavingsPercent(plan, baselinePlan);
            const savingsAmount = calculateSavingsAmount(plan, baselinePlan);
            const compareAtPrice = savingsAmount > 0 ? plan.numericPrice + savingsAmount : 0;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-[2rem] border-border/50 bg-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl",
                  isFeatured && "border-primary/30 shadow-[0_24px_50px_-24px_rgba(217,75,4,0.45)]",
                )}
              >
                <div className={cn(
                  "absolute inset-x-0 top-0 h-1",
                  isFeatured ? "bg-gradient-to-r from-primary/40 via-primary to-primary/40" : "bg-gradient-to-r from-transparent via-primary/25 to-transparent",
                )} />
                <CardHeader className="space-y-4 border-b border-border/20 bg-muted/5 p-5">
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <div className="flex items-center justify-self-start">
                      <Badge tone={isFeatured ? "default" : "outline"} className={cn("w-max font-semibold", isFeatured && "bg-primary text-primary-foreground")}>
                        {plan.badgeLabel}
                      </Badge>
                    </div>
                    <CardTitle className="text-center text-lg md:text-xl font-semibold tracking-tight text-foreground">
                      {plan.title}
                    </CardTitle>
                    <div className="flex items-center justify-self-end gap-2">
                      {savings > 0 ? (
                        <Badge tone="secondary" className="bg-emerald-500/10 text-emerald-700">
                          Save {savings}%
                        </Badge>
                      ) : null}
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner",
                        isFeatured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}>
                        {isFeatured ? <PrimePremiumIcon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-center">
                    {compareAtPrice > 0 ? (
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-red-500/90 decoration-red-500 line-through">
                        {formatPlanMoney(compareAtPrice, plan.currency)}
                      </p>
                    ) : null}
                    <p className="text-[1.7rem] md:text-3xl font-semibold tracking-tight text-foreground leading-none">
                      {plan.priceLabel}
                    </p>
                    {savingsAmount > 0 ? (
                      <p className="text-xs font-semibold text-primary">
                        Save {formatPlanMoney(savingsAmount, plan.currency)}
                      </p>
                    ) : null}
                    {plan.monthlyLabel ? (
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {plan.monthlyLabel}
                      </p>
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col space-y-5 p-5">
                  <ul className="flex-1 space-y-3">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 text-[13px] md:text-sm font-medium leading-relaxed text-muted-foreground">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto space-y-3 pt-1">
                    <LandingPricingPlanAction
                      planId={plan.id}
                      planName={plan.title}
                      durationDays={plan.durationDays}
                      numericPrice={plan.numericPrice}
                      currency={plan.currency}
                      isFeatured={isFeatured}
                      plans={planSummaries}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
