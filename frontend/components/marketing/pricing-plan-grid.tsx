"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Crown, Lock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketingPlan } from "@/lib/server-plans";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

interface PricingPlanGridProps {
  plans: MarketingPlan[];
  compact?: boolean;
  showStateCard?: boolean;
  showPlanNotes?: boolean;
  denseCards?: boolean;
}

type ViewerState = "guest" | "member" | "premium";

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
      title: "Your account already has premium access.",
      description: "Keep practicing with full access now, then return here later if you want to extend your prep window.",
      href: "/dashboard",
      action: "Open dashboard",
      icon: Crown,
    };
  }

  if (state === "member") {
    return {
      badge: "Signed in",
      title: "You are already inside PrimeScore.",
      description: "Keep using free tests today and move to premium when you want explanations, premium sets, and a longer prep cycle.",
      href: "/dashboard",
      action: "Go to dashboard",
      icon: ShieldCheck,
    };
  }

  return {
    badge: "Start free",
    title: "Use public IELTS tests first, then upgrade when you need more depth.",
    description: "Login with Telegram to keep progress, compare plans, and unlock premium Reading and Listening preparation.",
    href: "/login",
    action: "Login with Telegram",
    icon: Lock,
  };
}

function getPlanAction(state: ViewerState, paymentPaused: boolean) {
  if (state === "premium") {
    return {
      href: "/dashboard",
      label: "Upgrade Now",
      note: "Your plan is already active.",
    };
  }

  if (state === "member") {
    return {
      href: "/dashboard",
      label: "Upgrade Now",
      note: paymentPaused
        ? "Checkout will reopen later. Keep using public tests now."
        : "Upgrade flow continues inside your account.",
    };
  }

  return {
    href: "/login",
    label: "Upgrade Now",
    note: paymentPaused
      ? "Public tests stay open while checkout is paused."
      : "Pricing unlocks after login so progress stays linked to your account.",
  };
}

export function PricingPlanGrid({
  plans,
  compact = false,
  showStateCard = true,
  showPlanNotes = false,
  denseCards = false,
}: PricingPlanGridProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isPremium = useAuthStore((state) => state.isPremium);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const viewerState = mounted ? resolveViewerState(isAuthenticated, isPremium) : "guest";
  const stateCopy = getStateCopy(viewerState);
  const StateIcon = stateCopy.icon;

  return (
    <div className="space-y-6">
      {showStateCard ? (
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
                {(stateCopy.title || stateCopy.description) ? (
                  <div className="space-y-1">
                    {stateCopy.title ? (
                      <p className={cn("font-black tracking-tight text-foreground leading-tight", compact ? "text-lg" : "text-lg md:text-xl")}>
                        {stateCopy.title}
                      </p>
                    ) : null}
                    {stateCopy.description ? (
                      <p className="max-w-2xl text-[13px] md:text-sm font-medium leading-relaxed text-muted-foreground">
                        {stateCopy.description}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <Button asChild className="h-12 rounded-xl px-6 text-sm font-black shadow-lg shadow-primary/15">
              <Link href={stateCopy.href}>
                {stateCopy.action}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      ) : null}

      <div className={cn(
        "grid gap-5",
        compact ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-4",
      )}>
        {plans.map((plan) => {
          const isFeatured = plan.durationDays === 180;
          const action = getPlanAction(viewerState, plan.paymentPaused);

          return (
            <Card
              key={plan.id}
              className={cn(
                "group relative overflow-hidden rounded-[2rem] border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
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
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Badge tone={isFeatured ? "default" : "outline"} className={cn("font-black", isFeatured && "bg-primary text-primary-foreground")}>
                      {plan.badgeLabel}
                    </Badge>
                    <CardTitle className="text-lg md:text-xl font-black tracking-tight text-foreground">
                      {plan.title}
                    </CardTitle>
                  </div>
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner",
                    denseCards && "h-9 w-9 rounded-lg",
                    isFeatured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}>
                    {isFeatured ? <Crown className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className={cn(
                    "text-[1.7rem] md:text-3xl font-black tracking-tight text-foreground leading-none",
                    denseCards && "text-[1.2rem] md:text-[1.4rem]",
                  )}>
                    {plan.priceLabel}
                  </p>
                  <p className={cn(
                    "text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground",
                    denseCards && "text-[9px]",
                  )}>
                    {plan.monthlyLabel}
                  </p>
                </div>
              </CardHeader>

              <CardContent className={cn(
                "space-y-5 p-5",
                denseCards && "space-y-3 p-3.5",
              )}>
                <ul className={cn("space-y-3", denseCards && "space-y-2")}>
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

                <div className="space-y-3 pt-1">
                  <Button
                    asChild
                    variant={isFeatured ? "default" : "outline"}
                    className={cn(
                      "h-12 w-full rounded-xl text-sm font-black transition-all",
                      denseCards && "h-10 text-[12px]",
                      !isFeatured && "border-border/60 bg-muted/20 hover:bg-muted/40",
                    )}
                  >
                    <Link href={action.href}>
                      {action.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  {showPlanNotes ? (
                    <div className="rounded-2xl border border-border/40 bg-background/70 px-3 py-3 text-[10px] md:text-[11px] font-medium leading-relaxed text-muted-foreground/85">
                      {action.note}
                      {plan.paymentPaused ? " Plan checkout is currently paused." : " One-time payment, no auto-renew."}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
