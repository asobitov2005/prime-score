"use client";

import Link from "next/link";
import { BookOpenText, Headphones } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAverageBand, useDashboardAnalytics } from "@/components/charts/use-dashboard-analytics";
import type { DashboardAnalytics } from "@/lib/types";

interface DashboardAverageCardsProps {
  initialAnalytics: DashboardAnalytics;
}

function formatBand(value: number | null): string {
  return value === null ? "N/A" : value.toFixed(1);
}

export function DashboardAverageCards({ initialAnalytics }: DashboardAverageCardsProps) {
  const analyticsQuery = useDashboardAnalytics(initialAnalytics);
  const analytics = analyticsQuery.data ?? initialAnalytics;
  const averageReading = getAverageBand(analytics, "reading");
  const averageListening = getAverageBand(analytics, "listening");

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Card className="border-border/40 shadow-sm flex flex-col justify-center rounded-2xl bg-card/40 hover:bg-card/80 transition-colors">
        <CardContent className="p-3.5 md:p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <BookOpenText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Avg Reading</p>
            {averageReading === null ? (
              <Link
                href="/tests?type=reading"
                className="mt-1 inline-flex items-center text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Start Test →
              </Link>
            ) : (
              <p className="mt-0.5 text-[1.75rem] md:text-3xl font-black text-foreground tracking-tighter">
                {formatBand(averageReading)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-sm flex flex-col justify-center rounded-2xl bg-card/40 hover:bg-card/80 transition-colors">
        <CardContent className="p-3.5 md:p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Avg Listening</p>
            {averageListening === null ? (
              <Link
                href="/tests?type=listening"
                className="mt-1 inline-flex items-center text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Start Test →
              </Link>
            ) : (
              <p className="mt-0.5 text-[1.75rem] md:text-3xl font-black text-foreground tracking-tighter">
                {formatBand(averageListening)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
