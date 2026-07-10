"use client";
import type { BaseScope } from "./base";
import { EmptyState, getSubscriptionPageHref, useAuthStore, useEffect, useMemo, useState } from "../dependencies";
import { getPlanGridClassName, getStateCopy, resolveActivePlanId, resolveViewerState } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { plans, mode } = scope;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const isPremium = useAuthStore((state) => state.isPremium);

  const premiumUntil = useAuthStore((state) => state.premiumUntil);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
      setMounted(true);
    }, []);

  const viewerState = mounted ? resolveViewerState(isAuthenticated, isPremium) : "guest";

  const subscriptionHref = mounted ? getSubscriptionPageHref(isAuthenticated) : getSubscriptionPageHref(false);

  const stateCopy = getStateCopy(viewerState, subscriptionHref);

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

  return { isAuthenticated, isPremium, premiumUntil, mounted, setMounted, viewerState, subscriptionHref, stateCopy, baselinePlan, planGridClassName, activePlanId, revealViewport, emptyState };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
