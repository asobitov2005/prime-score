"use client";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useInView } from "@/hooks/use-in-view";
import { ArrowRight, CheckCircle2, User, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RedeemCodePanel } from "@/components/subscription/redeem-code-panel";
import type { MarketingPlan } from "@/lib/server-plans";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

interface PricingPlanGridProps {
  plans: MarketingPlan[];
  compact?: boolean;
  showStateCard?: boolean;
  showPlanNotes?: boolean;
  denseCards?: boolean;
  mode?: "grid" | "subscription";
  showSubscriptionHeader?: boolean;
  animateInView?: boolean;
  onChoosePlan?: (plan: MarketingPlan) => void;
  paymentBusyPlanId?: string | null;
}

type ViewerState = "guest" | "member" | "premium";
type PlanAction = {
  href: string;
  label: string;
  note: string;
  disabled?: boolean;
};

function resolveViewerState(isAuthenticated: boolean, isPremium: boolean): ViewerState {
  if (isPremium) {
    return "premium";
  }
  return isAuthenticated ? "member" : "guest";
}

function getStateCopy(state: ViewerState) {
  if (state === "premium") {
    return {
      badge: "Premium active",
      title: "Premium access is already active.",
      description: "You already have full access. Come back here later if you want to extend your plan.",
      href: "/dashboard",
      action: "Open dashboard",
      icon: PrimePremiumIcon,
    };
  }

  if (state === "member") {
    return {
      badge: "Signed in",
      title: "Your account is ready.",
      description: "Keep using free tests, or upgrade when you want premium sets and explanations.",
      href: "/dashboard",
      action: "Go to dashboard",
      icon: User,
    };
  }

  return {
    badge: "Start free",
    title: "Start with free tests, then upgrade when you need more.",
    description: "Login with Telegram to save progress, compare plans, and unlock premium practice.",
    href: "/login",
    action: "Login with Telegram",
    icon: User,
  };
}

function getPlanAction(state: ViewerState, isCurrentPlan: boolean): PlanAction {
  if (state === "premium") {
    if (isCurrentPlan) {
      return {
        href: "/subscription",
        label: "Current plan",
        note: "This plan currently matches your active premium access.",
        disabled: true,
      };
    }

    return {
      href: "/subscription",
      label: "Upgrade",
      note: "Choose another plan to extend your premium access.",
    };
  }

  if (state === "member") {
    return {
      href: "/dashboard",
      label: "Upgrade now",
      note: "Upgrade flow continues inside your account.",
    };
  }

  return {
    href: "/login",
    label: "Login to upgrade",
    note: "Pricing unlocks after login so progress stays linked to your account.",
  };
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

function getPlanGridClassName(planCount: number, mode: "grid" | "subscription") {
  if (mode === "subscription") {
    if (planCount <= 1) {
      return "mx-auto max-w-xl grid-cols-1";
    }

    if (planCount === 2) {
      return "mx-auto xl:max-w-5xl md:grid-cols-2";
    }

    if (planCount === 3) {
      return "md:grid-cols-2 2xl:grid-cols-3";
    }

    return "md:grid-cols-2 2xl:grid-cols-3";
  }

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

function resolveActivePlanId(plans: MarketingPlan[], premiumUntil: string | null): string | null {
  if (!premiumUntil) {
    return null;
  }

  const expiry = new Date(premiumUntil).getTime();
  if (!Number.isFinite(expiry)) {
    return null;
  }

  const remainingDays = Math.max(1, Math.ceil((expiry - Date.now()) / 86_400_000));
  const sortedPlans = [...plans].sort((left, right) => left.durationDays - right.durationDays);
  const matchedPlan = sortedPlans.find((plan) => remainingDays <= plan.durationDays) ?? sortedPlans[sortedPlans.length - 1];
  return matchedPlan?.id ?? null;
}

function AnimatedItem({ children, animateInView, index = 0, className }: { children: React.ReactNode, animateInView: boolean, index?: number, className?: string }) {
  const [ref, inView] = useInView({ threshold: 0.1 });
  if (!animateInView) return <div className={className}>{children}</div>;
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        className,
        "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        inView ? "opacity-100 translate-y-0 translate-x-0 scale-100" : "opacity-0 translate-y-12 scale-[0.95]"
      )}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {children}
    </div>
  );
}

function PricingStateCard({
  compact,
  stateCopy,
}: {
  compact: boolean;
  stateCopy: ReturnType<typeof getStateCopy>;
}) {
  const StateIcon = stateCopy.icon;

  return (
    <Card className={cn(
      "overflow-hidden rounded-[2rem] border border-border/50 bg-card/80 backdrop-blur-xl shadow-sm",
      compact ? "p-0" : "p-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]",
    )}>
      <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      <div className={cn(
        "grid items-center gap-5",
        compact ? "px-5 py-5 md:grid-cols-[1fr_auto]" : "px-6 py-6 md:grid-cols-[1fr_auto]",
      )}>
        <div className="space-y-2">
          <Badge tone="secondary" className="bg-primary/10 text-primary">
            {stateCopy.badge}
          </Badge>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <StateIcon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className={cn("font-semibold tracking-tight text-foreground leading-tight", compact ? "text-lg" : "text-lg md:text-xl")}>
                {stateCopy.title}
              </p>
              <p className="max-w-2xl text-[13px] md:text-sm font-medium leading-relaxed text-muted-foreground">
                {stateCopy.description}
              </p>
            </div>
          </div>
        </div>

        <Button asChild className="h-12 rounded-xl px-6 text-sm font-semibold shadow-lg shadow-primary/15">
          <Link href={stateCopy.href}>
            {stateCopy.action}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export function PricingPlanGrid({
  plans,
  compact = false,
  showStateCard = true,
  showPlanNotes = false,
  denseCards = false,
  mode = "grid",
  showSubscriptionHeader = true,
  animateInView = false,
  onChoosePlan,
  paymentBusyPlanId = null,
}: PricingPlanGridProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isPremium = useAuthStore((state) => state.isPremium);
  const premiumUntil = useAuthStore((state) => state.premiumUntil);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const viewerState = mounted ? resolveViewerState(isAuthenticated, isPremium) : "guest";
  const stateCopy = getStateCopy(viewerState);

  const baselinePlan = useMemo(
    () => [...plans].sort((left, right) => left.durationDays - right.durationDays)[0] ?? null,
    [plans],
  );
  const planGridClassName = getPlanGridClassName(plans.length, mode);
  const activePlanId = useMemo(
    () => (viewerState === "premium" ? resolveActivePlanId(plans, premiumUntil) : null),
    [plans, premiumUntil, viewerState],
  );
  const revealViewport = { once: true, amount: 0.42 } as const;

  const emptyState = (
    <EmptyState
      icon="gem"
      title="Premium plans are not configured yet"
      description="Plans will appear here as soon as they are available. If you need access now, contact support."
      secondaryAction={{ href: "/dashboard", label: "Back to dashboard" }}
      compact
    />
  );

  if (mode === "subscription") {
    return (
      <div className="space-y-4">
        {showStateCard ? (
          <AnimatedItem animateInView={animateInView}>
            <PricingStateCard compact={compact} stateCopy={stateCopy} />
          </AnimatedItem>
        ) : null}

        {showSubscriptionHeader ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge tone="secondary" className="w-max bg-primary/10 text-primary">
                Premium plans
              </Badge>
              <CardTitle className="text-2xl font-semibold tracking-tight">Choose a Premium plan.</CardTitle>
            </div>

            <RedeemCodePanel />
          </div>
        ) : null}

        {plans.length === 0 ? emptyState : (
        <div className={cn("grid gap-4", planGridClassName)}>
          {plans.map((plan, index) => {
            const isFeatured = plan.isFeatured;
            const isCurrentPlan = activePlanId === plan.id;
            const action = getPlanAction(viewerState, isCurrentPlan);
            const savings = calculateSavingsPercent(plan, baselinePlan);
            const savingsAmount = calculateSavingsAmount(plan, baselinePlan);
            const compareAtPrice = savingsAmount > 0 ? plan.numericPrice + savingsAmount : 0;
            const isInvoiceAction = mode === "subscription" && Boolean(onChoosePlan) && viewerState !== "guest" && !action.disabled;
            const ctaLabel = isInvoiceAction
              ? paymentBusyPlanId === plan.id
                ? "Creating..."
                : viewerState === "member"
                  ? "Continue to payment"
                  : "Upgrade"
              : action.label;

            const card = (
              <Card
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-[2rem] border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                  denseCards && "rounded-[1.4rem]",
                  isFeatured && "border-primary/30 shadow-[0_24px_50px_-24px_rgba(217,75,4,0.45)]",
                )}
              >
                <div className={cn(
                  "absolute inset-x-0 top-0 h-1",
                  isFeatured ? "bg-gradient-to-r from-primary/40 via-primary to-primary/40" : "bg-gradient-to-r from-transparent via-primary/25 to-transparent",
                )} />
                <CardHeader className={cn(
                  "space-y-4 border-b border-border/20 bg-muted/5 p-5",
                  denseCards && "space-y-1.5 p-3",
                )}>
                  {denseCards ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={isFeatured ? "default" : "outline"} className={cn(
                          "shrink-0 font-semibold px-2 py-0.5 text-[9px] tracking-[0.12em]",
                          isFeatured && "bg-primary text-primary-foreground",
                        )}>
                          {plan.badgeLabel}
                        </Badge>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {savings > 0 ? (
                            <Badge tone="secondary" className="bg-emerald-500/10 px-2 py-0.5 text-[9px] tracking-[0.12em] text-emerald-700">
                              Save {savings}%
                            </Badge>
                          ) : null}
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg shadow-inner",
                            isFeatured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                          )}>
                            {isFeatured ? <PrimePremiumIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>
                      <CardTitle className="min-h-[1.25rem] text-center text-sm font-semibold tracking-tight text-foreground leading-tight md:text-[15px]">
                        {plan.title}
                      </CardTitle>
                    </>
                  ) : (
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <div className="flex justify-self-start">
                        <Badge tone={isFeatured ? "default" : "outline"} className={cn(
                          "shrink-0 font-semibold",
                          isFeatured && "bg-primary text-primary-foreground",
                        )}>
                          {plan.badgeLabel}
                        </Badge>
                      </div>
                      <CardTitle className="text-center text-lg md:text-xl font-semibold tracking-tight text-foreground leading-tight">
                        {plan.title}
                      </CardTitle>
                      <div className="flex shrink-0 items-center justify-self-end gap-2">
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
                  )}
                  <div className={cn("space-y-1 text-center", denseCards && "min-h-[4.75rem]")}>
                    <p className={cn(
                      "text-[11px] font-medium uppercase tracking-[0.14em] text-red-500/90 decoration-red-500 line-through",
                      denseCards && "min-h-[0.9rem] text-[11px] tracking-[0.1em]",
                      compareAtPrice <= 0 && "invisible",
                    )}>
                      {compareAtPrice > 0 ? formatPlanMoney(compareAtPrice, plan.currency) : plan.priceLabel}
                    </p>
                    <p className={cn(
                      "font-semibold tracking-tight text-foreground leading-none",
                      denseCards ? "text-[1.12rem] md:text-[1.24rem]" : "text-[1.7rem] md:text-3xl",
                    )}>
                      {plan.priceLabel}
                    </p>
                    <p className={cn(
                      "text-xs font-semibold text-primary",
                      denseCards && "min-h-[0.9rem] text-[11px]",
                      savingsAmount <= 0 && "invisible",
                    )}>
                      {savingsAmount > 0 ? `Save ${formatPlanMoney(savingsAmount, plan.currency)}` : plan.priceLabel}
                    </p>
                    <p className={cn(
                      "text-xs md:text-sm font-semibold tracking-[0.08em] text-muted-foreground leading-relaxed",
                      denseCards && "min-h-[0.75rem] text-[9px] md:text-[10px] tracking-[0.06em]",
                      !plan.monthlyLabel && "invisible",
                    )}>
                      {plan.monthlyLabel || plan.priceLabel}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className={cn(
                  "flex flex-1 flex-col space-y-5 p-5",
                  denseCards && "space-y-2.5 p-3",
                )}>
                  <ul className={cn("flex-1 space-y-3", denseCards && "space-y-1.5")}>
                    {plan.perks.map((perk) => (
                      <li key={perk} className={cn(
                        "flex items-start gap-2.5 text-[13px] md:text-sm font-medium leading-relaxed text-muted-foreground",
                        denseCards && "gap-1.5 text-[12px] md:text-[13px] leading-[1.3]",
                      )}>
                        <span className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
                          denseCards && "h-4 w-4",
                        )}>
                          <CheckCircle2 className={cn("h-3.5 w-3.5", denseCards && "h-3 w-3")} />
                        </span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto space-y-2 pt-1">
                    {action.disabled ? (
                      <div className={cn(
                        "flex h-12 w-full items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-sm font-semibold text-primary",
                        denseCards && "h-9 text-[11px]",
                      )}>
                        {action.label}
                      </div>
                    ) : isInvoiceAction ? (
                      <Button
                        type="button"
                        disabled={paymentBusyPlanId === plan.id}
                        onClick={() => onChoosePlan?.(plan)}
                        variant={isFeatured ? "default" : "outline"}
                        className={cn(
                          "h-12 w-full rounded-xl text-sm font-medium transition-all",
                          denseCards && "h-9 text-[11px]",
                          !isFeatured && "border-border/60 bg-muted/20 hover:bg-muted/40",
                        )}
                      >
                        {ctaLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant={isFeatured ? "default" : "outline"}
                        className={cn(
                          "h-12 w-full rounded-xl text-sm transition-all",
                          compact ? "font-semibold" : "font-black",
                          denseCards && "h-9 text-[11px]",
                          !isFeatured && "border-border/60 bg-muted/20 hover:bg-muted/40",
                        )}
                      >
                        <Link href={action.href}>
                          {action.label}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}

                    {showPlanNotes ? (
                      <div className="rounded-2xl border border-border/40 bg-background/70 px-3 py-3 text-[10px] md:text-[11px] font-medium leading-relaxed text-muted-foreground/85">
                        {action.note}
                        {" One-time payment, no auto-renew."}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );

            return (
              <AnimatedItem key={plan.id} index={index} animateInView={animateInView}>
                {card}
              </AnimatedItem>
            );
          })}
        </div>
        )}
      </div>
    );
  }
 
  return (
    <div className="space-y-6">
      {showStateCard ? (
        <AnimatedItem animateInView={animateInView}>
          <PricingStateCard compact={compact} stateCopy={stateCopy} />
        </AnimatedItem>
      ) : null}

      {plans.length === 0 ? emptyState : (
      <div className={cn("grid gap-5", planGridClassName)}>
        {plans.map((plan, index) => {
          const isFeatured = plan.isFeatured;
          const isCurrentPlan = activePlanId === plan.id;
          const action = getPlanAction(viewerState, isCurrentPlan);
          const savings = calculateSavingsPercent(plan, baselinePlan);
          const savingsAmount = calculateSavingsAmount(plan, baselinePlan);
          const compareAtPrice = savingsAmount > 0 ? plan.numericPrice + savingsAmount : 0;
          const isInvoiceAction = Boolean(onChoosePlan) && viewerState !== "guest" && !action.disabled;
          const ctaLabel = isInvoiceAction
            ? paymentBusyPlanId === plan.id
              ? "Creating..."
              : viewerState === "member"
                ? "Continue to payment"
                : "Upgrade"
            : action.label;

          const card = (
            <Card
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-[2rem] border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                denseCards && "rounded-[1.4rem]",
                isFeatured && "border-primary/30 shadow-[0_24px_50px_-24px_rgba(217,75,4,0.45)]",
              )}
            >
              <div className={cn(
                "absolute inset-x-0 top-0 h-1",
                isFeatured ? "bg-gradient-to-r from-primary/40 via-primary to-primary/40" : "bg-gradient-to-r from-transparent via-primary/25 to-transparent",
              )} />
              <CardHeader className={cn(
                "space-y-4 border-b border-border/20 bg-muted/5 p-5",
                denseCards && "space-y-2.5 p-3.5",
              )}>
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
                      denseCards && "h-9 w-9 rounded-lg",
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
                  <p className={cn(
                    "text-[1.7rem] md:text-3xl font-semibold tracking-tight text-foreground leading-none",
                    denseCards && "text-[1.2rem] md:text-[1.4rem]",
                  )}>
                    {plan.priceLabel}
                  </p>
                  {savingsAmount > 0 ? (
                    <p className="text-xs font-semibold text-primary">
                      Save {formatPlanMoney(savingsAmount, plan.currency)}
                    </p>
                  ) : null}
                  {plan.monthlyLabel ? (
                    <p className={cn(
                      "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
                      denseCards && "text-[9px]",
                    )}>
                      {plan.monthlyLabel}
                    </p>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className={cn(
                "flex flex-1 flex-col space-y-5 p-5",
                denseCards && "space-y-3 p-3.5",
              )}>
                <ul className={cn("flex-1 space-y-3", denseCards && "space-y-2")}>
                  {plan.perks.map((perk) => (
                    <li key={perk} className={cn(
                      "flex items-start gap-2.5 text-[13px] md:text-sm font-medium leading-relaxed text-muted-foreground",
                      denseCards && "gap-2 text-[11px] md:text-[12px] leading-snug",
                    )}>
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-3 pt-1">
                  {action.disabled ? (
                    <div className="flex h-12 w-full items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-sm font-semibold text-primary">
                      {action.label}
                    </div>
                  ) : isInvoiceAction ? (
                    <Button
                      type="button"
                      disabled={paymentBusyPlanId === plan.id}
                      onClick={() => onChoosePlan?.(plan)}
                      variant={isFeatured ? "default" : "outline"}
                      className={cn(
                        "h-12 w-full rounded-xl text-sm font-medium transition-all",
                        denseCards && "h-10 text-[12px]",
                        !isFeatured && "border-border/60 bg-muted/20 hover:bg-muted/40",
                      )}
                    >
                      {ctaLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant={isFeatured ? "default" : "outline"}
                      className={cn(
                        "h-12 w-full rounded-xl text-sm font-medium transition-all",
                        denseCards && "h-10 text-[12px]",
                        !isFeatured && "border-border/60 bg-muted/20 hover:bg-muted/40",
                      )}
                    >
                      <Link href={action.href}>
                        {action.label}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}

                  {showPlanNotes ? (
                    <div className="rounded-2xl border border-border/40 bg-background/70 px-3 py-3 text-[10px] md:text-[11px] font-medium leading-relaxed text-muted-foreground/85">
                      {action.note}
                      {" One-time payment, no auto-renew."}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );

          return (
            <AnimatedItem key={plan.id} index={index} animateInView={animateInView}>
              {card}
            </AnimatedItem>
          );
        })}
      </div>
      )}
    </div>
  );
}
