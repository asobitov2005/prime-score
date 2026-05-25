"use client";

import Link from "next/link";
import { ArrowRight, User } from "lucide-react";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SUBSCRIPTION_PATH, getSubscriptionPageHref } from "@/lib/subscription-navigation";
import { trackPlanSelect } from "@/lib/analytics";
import { useAuthStore } from "@/store/auth-store";

type ViewerState = "guest" | "member" | "premium";
type PlanSummary = {
  id: string;
  durationDays: number;
};

function resolveViewerState(isAuthenticated: boolean, isPremium: boolean): ViewerState {
  if (isPremium) {
    return "premium";
  }

  return isAuthenticated ? "member" : "guest";
}

function resolveActivePlanId(plans: PlanSummary[], premiumUntil: string | null): string | null {
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

function getStateCopy(state: ViewerState, subscriptionHref: string) {
  if (state === "premium") {
    return {
      badge: "Premium active",
      title: "Premium access is already active.",
      description: "You already have full access. Come back here later if you want to extend your plan.",
      href: SUBSCRIPTION_PATH,
      action: "Manage subscription",
      Icon: PrimePremiumIcon,
    };
  }

  if (state === "member") {
    return {
      badge: "Signed in",
      title: "Your account is ready.",
      description: "Keep using free tests, or upgrade when you want premium sets and explanations.",
      href: subscriptionHref,
      action: "Go to subscription",
      Icon: User,
    };
  }

  return {
    badge: "Start free",
    title: "Start with free tests, then upgrade when you need more.",
    description: "Login with Telegram to save progress, compare plans, and unlock premium practice.",
    href: subscriptionHref,
    action: "Login with Telegram",
    Icon: User,
  };
}

export function LandingPricingStateCard() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isPremium = useAuthStore((state) => state.isPremium);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const viewerState = hasHydrated ? resolveViewerState(isAuthenticated, isPremium) : "guest";
  const subscriptionHref = hasHydrated ? getSubscriptionPageHref(isAuthenticated) : getSubscriptionPageHref(false);
  const stateCopy = getStateCopy(viewerState, subscriptionHref);
  const StateIcon = stateCopy.Icon;

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-border/50 bg-card/80 shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      <div className="grid items-center gap-5 px-5 py-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Badge tone="secondary" className="bg-primary/10 text-primary">
            {stateCopy.badge}
          </Badge>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <StateIcon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold tracking-tight text-foreground leading-tight">
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

export function LandingPricingPlanAction({
  planId,
  planName,
  durationDays,
  numericPrice,
  currency,
  isFeatured,
  plans,
}: {
  planId: string;
  planName: string;
  durationDays: number;
  numericPrice: number;
  currency: string;
  isFeatured: boolean;
  plans: PlanSummary[];
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isPremium = useAuthStore((state) => state.isPremium);
  const premiumUntil = useAuthStore((state) => state.premiumUntil);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const viewerState = hasHydrated ? resolveViewerState(isAuthenticated, isPremium) : "guest";
  const subscriptionHref = hasHydrated ? getSubscriptionPageHref(isAuthenticated) : getSubscriptionPageHref(false);
  const activePlanId = viewerState === "premium" ? resolveActivePlanId(plans, premiumUntil) : null;
  const isCurrentPlan = activePlanId === planId;

  if (viewerState === "premium" && isCurrentPlan) {
    return (
      <div className="flex h-12 w-full items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-sm font-semibold text-primary">
        Current plan
      </div>
    );
  }

  const href = viewerState === "premium" ? SUBSCRIPTION_PATH : subscriptionHref;
  const label = viewerState === "premium" ? "Upgrade" : viewerState === "member" ? "Upgrade now" : "Login to upgrade";

  return (
    <Button
      asChild
      variant={isFeatured ? "default" : "outline"}
      className={!isFeatured ? "h-12 w-full rounded-xl border-border/60 bg-muted/20 text-sm font-medium transition-colors hover:bg-muted/40" : "h-12 w-full rounded-xl text-sm font-semibold transition-colors"}
    >
      <Link
        href={href}
        onClick={() => {
          trackPlanSelect({
            planId,
            planName,
            durationDays,
            value: numericPrice,
            currency,
            location: "pricing_plan_grid",
            authState: viewerState === "guest" ? "guest" : "authenticated",
          });
        }}
      >
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );
}
