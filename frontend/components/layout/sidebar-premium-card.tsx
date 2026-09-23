"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackCtaClick } from "@/lib/analytics";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { useAuthStore } from "@/store/auth-store";

export function SidebarPremiumCard() {
  const isPremium = useAuthStore((state) => state.isPremium);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const premiumUntil = useAuthStore((state) => state.premiumUntil);
  const subscriptionHref = getSubscriptionPageHref(isAuthenticated);
  const expiryLabel = isPremium && premiumUntil
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(premiumUntil))
    : null;

  return (
    <Card className="group relative overflow-hidden rounded-xl border-border bg-card shadow-none">
      <CardContent className="relative flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-accent text-primary">
            <PrimePremiumIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="min-w-0 whitespace-nowrap text-sm font-semibold leading-5 text-foreground">
                {isPremium ? "Premium Active" : "Go Premium"}
              </p>
              {isPremium ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-1 text-[9px] font-semibold leading-none text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Active
                </span>
              ) : null}
            </div>
            {isPremium && expiryLabel ? (
              <p className="mt-1 text-[11px] font-medium leading-4 text-muted-foreground">
                {`Expires ${expiryLabel}`}
              </p>
            ) : !isPremium ? (
              <p className="mt-1 text-[11px] font-medium leading-4 text-muted-foreground">
                {"Unlock tests, feedback and analytics."}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-center pt-0.5">
          <Button
            asChild
            className="h-9 w-full rounded-md border-0 bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-none transition-opacity hover:opacity-90"
          >
            <Link
              href={subscriptionHref}
              onClick={() => {
                trackCtaClick({
                  ctaName: isPremium ? "manage_subscription" : "upgrade_now",
                  ctaLabel: isPremium ? "Manage Subscription" : "Upgrade now",
                  ctaLocation: "sidebar_premium_card",
                  destination: subscriptionHref,
                  authState: isAuthenticated ? "authenticated" : "guest",
                });
              }}
              className="flex w-full items-center justify-center gap-2 text-center"
            >
              <span>{isPremium ? "Manage Subscription" : "Upgrade Now"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
