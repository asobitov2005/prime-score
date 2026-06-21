"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackCtaClick } from "@/lib/analytics";
import { getSubscriptionPageHref } from "@/lib/subscription-navigation";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

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
    <Card
      className={cn(
        "group relative overflow-hidden rounded-[1.125rem] border shadow-[0_8px_22px_-20px_rgba(15,23,42,0.18)]",
        isPremium
          ? "border-amber-200/70 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 dark:border-amber-500/20 dark:from-slate-900 dark:via-amber-950/25 dark:to-slate-900"
          : "border-amber-200/70 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10",
      )}
    >
      <CardContent className="relative flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner",
              isPremium
                ? "border-amber-200 bg-white text-amber-600 shadow-amber-500/10 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
                : "border-amber-200 bg-white text-amber-600 shadow-amber-500/10 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
            )}
          >
            <PrimePremiumIcon className={cn("h-6 w-6", isPremium ? "text-amber-600 dark:text-amber-300" : "text-amber-600 dark:text-amber-300")} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p
                className={cn(
                  "min-w-0 whitespace-nowrap font-semibold leading-5 text-slate-950 dark:text-slate-50",
                  isPremium ? "text-[15px]" : "text-base",
                )}
              >
                {isPremium ? "Premium Active" : "Go Premium"}
              </p>
              {isPremium ? (
                <span className="inline-flex items-center rounded-full bg-amber-500/12 px-2 py-1 leading-none dark:bg-amber-400/15">
                  <span className="premium-live-dot" />
                </span>
              ) : null}
            </div>
            {isPremium && expiryLabel ? (
              <p className="mt-1 text-[11px] font-medium leading-4 text-amber-900/70 dark:text-amber-100/70">
                {`Expires ${expiryLabel}`}
              </p>
            ) : !isPremium ? (
              <p className="mt-1 text-[11px] font-medium leading-4 text-amber-900/70 dark:text-amber-100/70">
                {"Unlock tests, feedback and analytics."}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-center pt-0.5">
          <Button
            asChild
            className={cn(
              "h-10 w-full rounded-xl border-0 px-4 font-semibold shadow-none transition-colors",
              isPremium
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                : "bg-orange-500 text-white hover:bg-orange-600",
            )}
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
