"use client";

import { MarketingPlan, PrimePremiumIcon, SUBSCRIPTION_PATH, User, cn, useInView } from "./dependencies";



export interface PricingPlanGridProps {
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

export type ViewerState = "guest" | "member" | "premium";

export type PlanAction = {
  href: string;
  label: string;
  note: string;
  disabled?: boolean;
};

export function resolveViewerState(isAuthenticated: boolean, isPremium: boolean): ViewerState {
  if (isPremium) {
    return "premium";
  }
  return isAuthenticated ? "member" : "guest";
}

export function getStateCopy(state: ViewerState, subscriptionHref: string) {
  if (state === "premium") {
    return {
      badge: "Premium active",
      title: "Premium access is already active.",
      description: "You already have full access. Come back here later if you want to extend your plan.",
      href: SUBSCRIPTION_PATH,
      action: "Manage subscription",
      icon: PrimePremiumIcon,
    };
  }

  if (state === "member") {
    return {
      badge: "Signed in",
      title: "Your account is ready.",
      description: "Keep using free tests, or upgrade when you want premium sets and explanations.",
      href: subscriptionHref,
      action: "Go to subscription",
      icon: User,
    };
  }

  return {
    badge: "Start free",
    title: "Start with free tests, then upgrade when you need more.",
    description: "Login with Telegram to save progress, compare plans, and unlock premium practice.",
    href: subscriptionHref,
    action: "Login with Telegram",
    icon: User,
  };
}

export function getPlanAction(state: ViewerState, isCurrentPlan: boolean, subscriptionHref: string): PlanAction {
  if (state === "premium") {
    if (isCurrentPlan) {
      return {
        href: SUBSCRIPTION_PATH,
        label: "Current plan",
        note: "This plan currently matches your active premium access.",
        disabled: true,
      };
    }

    return {
      href: SUBSCRIPTION_PATH,
      label: "Upgrade",
      note: "Choose another plan to extend your premium access.",
    };
  }

  if (state === "member") {
    return {
      href: subscriptionHref,
      label: "Upgrade now",
      note: "Upgrade flow continues inside your account.",
    };
  }

  return {
    href: subscriptionHref,
    label: "Login to upgrade",
    note: "Pricing unlocks after login so progress stays linked to your account.",
  };
}

export function calculateSavingsPercent(plan: MarketingPlan, baselinePlan: MarketingPlan | null): number {
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

export function formatPlanMoney(value: number, currency: string): string {
  if (currency === "UZS") {
    return `${Math.round(value).toLocaleString("en-US").replace(/,/g, " ")} sum`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function calculateSavingsAmount(plan: MarketingPlan, baselinePlan: MarketingPlan | null): number {
  if (!baselinePlan || baselinePlan.id === plan.id || baselinePlan.durationDays <= 0) {
    return 0;
  }

  const compareAtPrice = (baselinePlan.numericPrice / baselinePlan.durationDays) * plan.durationDays;
  if (!Number.isFinite(compareAtPrice) || compareAtPrice <= plan.numericPrice) {
    return 0;
  }

  return Math.round(compareAtPrice - plan.numericPrice);
}

export function getPlanGridClassName(planCount: number, mode: "grid" | "subscription") {
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

export function resolveActivePlanId(plans: MarketingPlan[], premiumUntil: string | null): string | null {
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

export function AnimatedItem({ children, animateInView, index = 0, className }: { children: React.ReactNode, animateInView: boolean, index?: number, className?: string }) {
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
