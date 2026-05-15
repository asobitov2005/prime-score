"use client";

import { useEffect, useState } from "react";
import { PrimePremiumIcon } from "@/components/ui/prime-premium-icon";
import { getAverageBand, roundToIeltsBand } from "@/components/charts/use-dashboard-analytics";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardHeader } from "@/components/ui/card";
import type { DashboardAnalytics } from "@/lib/types";
import { ChevronLeft, ChevronRight, Layout, Sparkles, Target } from "lucide-react";

interface WelcomeHeaderProps {
  analytics: DashboardAnalytics;
}

export function WelcomeHeader({ analytics }: WelcomeHeaderProps) {
  const { name, isPremium } = useAuthStore();
  const displayName = name?.trim() || "Candidate";
  const [desiredScore, setDesiredScore] = useState(7.5);
  const averageReading = getAverageBand(analytics, "reading");
  const averageListening = getAverageBand(analytics, "listening");
  const averageWriting = getAverageBand(analytics, "writing");
  const validBands = [averageReading, averageListening, averageWriting].filter((band): band is number => band !== null && band > 0);
  const overallBand = validBands.length > 0
    ? roundToIeltsBand(validBands.reduce((sum, band) => sum + band, 0) / validBands.length)
    : 0;
  const gap = overallBand > 0 ? Math.max(0, desiredScore - overallBand) : null;

  useEffect(() => {
    const saved = window.localStorage.getItem("prime-desired-score");
    const parsed = saved ? Number.parseFloat(saved) : Number.NaN;
    if (Number.isFinite(parsed)) {
      setDesiredScore(Math.min(9, Math.max(4, parsed)));
    }
  }, []);

  const adjustScore = (delta: number) => {
    setDesiredScore((current) => {
      const next = Math.min(9, Math.max(4, current + delta));
      window.localStorage.setItem("prime-desired-score", next.toString());
      return next;
    });
  };

  return (
    <Card className="overflow-hidden bg-card/40 border border-border/40 relative rounded-[2rem] shadow-sm group">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20" />
      
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <CardHeader className="space-y-1 relative z-10 p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Welcome, <span className="font-medium text-primary">{displayName}</span>
                {isPremium && (
                  <span className="ml-2 inline-flex align-middle items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-[0.35rem] text-[10px] font-black uppercase tracking-[0.2em] leading-none text-primary shadow-sm">
                    <Sparkles className="h-3 w-3 fill-current" />
                    Premium Member
                  </span>
                )}
              </h1>
            </div>

            <div className="flex w-fit flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-background/55 px-2 py-1.5 shadow-sm">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Goal</span>
              <button
                type="button"
                onClick={() => adjustScore(-0.5)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Lower desired score"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2.25rem] text-center text-sm font-black tabular-nums text-foreground">{desiredScore.toFixed(1)}</span>
              <button
                type="button"
                onClick={() => adjustScore(0.5)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Raise desired score"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <span className="h-4 w-px bg-border" />
              <span className="text-xs font-semibold text-muted-foreground">
                {gap === null ? "baseline needed" : gap === 0 ? "target reached" : `${gap.toFixed(1)} gap`}
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary shrink-0 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            {isPremium ? <PrimePremiumIcon className="h-7 w-7" /> : <Layout className="h-7 w-7" />}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
