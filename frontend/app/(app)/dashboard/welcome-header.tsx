"use client";

import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { useAuthStore } from "@/store/auth-store";
import type { DashboardAnalytics } from "@/lib/types";
import { TrendingUp } from "lucide-react";

interface WelcomeHeaderProps {
  analytics: DashboardAnalytics;
}

function getLearnerPercentile(analytics: DashboardAnalytics): number {
  const percentChange = analytics.improvementRate.percentChange;

  if (typeof percentChange === "number" && Number.isFinite(percentChange)) {
    return Math.min(96, Math.max(58, Math.round(72 + percentChange)));
  }

  const streak = analytics.personalBests.currentStreak;
  return Math.min(92, Math.max(68, 68 + streak * 3));
}

export function WelcomeHeader({ analytics }: WelcomeHeaderProps) {
  const { name, isPremium } = useAuthStore();
  const displayName = name?.trim() || "Candidate";
  const learnerPercentile = getLearnerPercentile(analytics);
  const currentStreak = analytics.personalBests.currentStreak;

  return (
    <section className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--card))_52%,rgba(251,191,36,0.09)_100%)] shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.16)_1px,transparent_0)] [background-size:28px_28px] opacity-25" />

      <div className="relative z-10 flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between lg:p-6">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-foreground/80">Welcome back,</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.85rem]">
                {displayName}
              </h1>
              {isPremium && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase leading-none tracking-[0.18em] text-amber-700 shadow-sm dark:text-amber-300">
                  <PrimePremiumIcon className="h-4 w-4 text-amber-500" />
                  Premium Member
                </span>
              )}
            </div>
          </div>

          <p className="flex max-w-2xl items-start gap-2 text-sm font-medium leading-6 text-muted-foreground">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              You're improving faster than <span className="font-bold text-foreground">{learnerPercentile}%</span> of learners. Keep it up!
            </span>
          </p>
        </div>

        <div className="w-full rounded-2xl border border-border/60 bg-background/75 px-3.5 py-3 shadow-lg shadow-slate-900/5 backdrop-blur md:w-[158px]">
          <div className="flex items-center gap-2.5">
            <svg className="h-10 w-10 shrink-0" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path
                d="M24.7 43.5c-8.2 0-14.8-5.8-14.8-14.2 0-5 2.7-9.4 6.5-12.8 2.8-2.5 4.5-5.3 4.7-9.2 0-.8.9-1.2 1.5-.7 3.8 3.1 6.6 7.2 7.2 12.2 1.4-1.2 2.5-2.7 3.2-4.3.3-.8 1.4-.9 1.8-.1 2.1 3.5 3.4 7.3 3.4 11.6 0 10.1-6.3 17.5-13.5 17.5Z"
                fill="url(#day-streak-flame)"
              />
              <path
                d="M25 39.5c-4.3 0-7.7-3.1-7.7-7.7 0-3.3 2-5.8 4.6-8 .6-.5 1.5-.1 1.5.7.1 2.4 1 4.3 2.9 5.8.9-.9 1.5-1.9 1.9-3 .3-.8 1.4-.9 1.8-.2 1.2 1.9 1.9 3.8 1.9 5.9 0 3.9-3 6.5-6.9 6.5Z"
                fill="#FFF3B0"
              />
              <defs>
                <linearGradient id="day-streak-flame" x1="24" x2="24" y1="6.35" y2="43.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FACC15" />
                  <stop offset="0.52" stopColor="#F97316" />
                  <stop offset="1" stopColor="#EF4444" />
                </linearGradient>
              </defs>
            </svg>
            <div className="flex min-h-10 flex-col justify-center">
              <p className="text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">{currentStreak}</p>
              <p className="mt-1 text-sm font-semibold leading-none text-muted-foreground">Day streak</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
