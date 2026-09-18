"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import { trackPlanSelect } from "@/lib/analytics";
import { useAuthStore } from "@/store/auth-store";

export function LandingPricingPlanAction({
  planId,
  planName,
  durationDays,
  numericPrice,
  currency,
  label,
  buttonClassName,
}: {
  planId: string;
  planName: string;
  durationDays: number;
  numericPrice: number;
  currency: string;
  label: string;
  buttonClassName: string;
}) {
  const authenticated = useAuthStore(
    (state) => state.hasHydrated && state.isAuthenticated,
  );

  // The account page validates access; expiry alone cannot identify a purchased plan.
  return (
    <Link
      href={getSubscriptionPageHref(authenticated)}
      prefetch={false}
      className={buttonClassName}
      onClick={() => {
        trackPlanSelect({
          planId,
          planName,
          durationDays,
          value: numericPrice,
          currency,
          location: "pricing_plan_grid",
          authState: authenticated ? "authenticated" : "guest",
        });
      }}
    >
      {label}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}
