"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="group relative overflow-hidden rounded-xl border-0 bg-[linear-gradient(160deg,hsl(var(--card))_0%,hsl(var(--card))_48%,hsl(var(--primary)/0.14)_100%)] shadow-[0_14px_34px_-22px_rgba(0,0,0,0.55)] dark:bg-[linear-gradient(160deg,rgba(18,24,38,0.98)_0%,rgba(16,22,35,0.98)_52%,rgba(245,158,11,0.16)_100%)]">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/12 blur-3xl dark:bg-primary/20" />
      <CardContent className="relative flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-inner shadow-primary/10 dark:border-primary/30 dark:bg-primary/12">
            <PrimePremiumIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="whitespace-nowrap text-base font-semibold tracking-[0.02em] text-foreground">
                {isPremium ? "Premium Active" : "Go Premium"}
              </p>
              {isPremium ? (
                <span className="inline-flex items-center rounded-full bg-emerald-500/12 px-2.5 py-1 leading-none">
                  <span className="premium-live-dot" />
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] leading-none text-primary">
                  Premium
                </span>
              )}
            </div>
            {!isPremium ? null : null}
          </div>
        </div>

        {isPremium && expiryLabel ? (
          <div className="px-1 text-[11px] font-medium leading-5 text-muted-foreground">
            Expiry date: {expiryLabel}
          </div>
        ) : null}

        <div className="flex justify-center pt-0.5">
          <Button
            asChild
            variant={isPremium ? "secondary" : "default"}
            className={isPremium
              ? "h-10 w-full rounded-2xl border border-primary/20 bg-background/90 px-4 font-medium text-foreground shadow-sm transition-all duration-200 hover:border-primary/35 hover:bg-background dark:border-white/10 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
              : "h-10 w-full rounded-2xl border border-primary/20 bg-background/90 px-4 font-medium text-foreground shadow-sm transition-all duration-200 hover:border-primary/35 hover:bg-background dark:border-white/10 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"}
          >
            <Link href={subscriptionHref} className="flex w-full items-center justify-center gap-2 text-center">
              <span>{isPremium ? "Manage Subscription" : "Upgrade now"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
