"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function HistorySkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SkeletonCard className="relative z-20 overflow-visible rounded-2xl border-border/50 bg-background p-0 shadow-sm">
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <div className="relative z-10 border-b border-border/40 bg-muted/5 p-5 lg:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-7 w-28 rounded-lg md:h-8" />
              <SkeletonBlock className="h-4 w-[min(25rem,78vw)] rounded-full" />
            </div>
            <SkeletonBlock className="hidden h-10 w-10 shrink-0 rounded-xl md:block" />
          </div>
        </div>

        <div className="relative z-10 grid gap-3 bg-background/50 p-4 lg:px-6 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-md" />
          </div>
          <SkeletonBlock className="h-10 w-full md:w-[240px] rounded-xl" />
        </div>
      </SkeletonCard>

      <SkeletonCard className="overflow-hidden rounded-2xl border-border/50 p-0 shadow-sm">
        <div className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, index) => {
            const isWriting = index === 2;
            return (
              <div
                key={index}
                className="group relative m-2 rounded-xl border border-border/50 bg-background shadow-sm"
              >
                <div className="flex items-center gap-3 rounded-xl px-4 py-4">
                  <SkeletonBlock className={cn("h-4 w-4 shrink-0", isWriting ? "rounded-md" : "rounded-full")} />
                  <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.7fr)_auto_auto_auto_auto] md:items-center">
                    <div className="min-w-0 space-y-2">
                      <SkeletonBlock className="h-4 w-64 max-w-full rounded-md" />
                      <div className="flex flex-wrap items-center gap-2">
                        <SkeletonBlock className="h-5 w-16 rounded-md" />
                        <SkeletonBlock className="h-5 w-28 rounded-md" />
                        <SkeletonBlock className="h-5 w-20 rounded-md" />
                        {!isWriting ? <SkeletonBlock className="h-5 w-20 rounded-md" /> : null}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <SkeletonBlock className="h-3 w-14 rounded-full" />
                      <SkeletonBlock className="h-4 w-16 rounded-md" />
                      <SkeletonBlock className="h-3 w-20 rounded-full" />
                    </div>

                    <div className="space-y-1 text-xs">
                      <SkeletonBlock className="h-3 w-10 rounded-full" />
                      <SkeletonBlock className="h-4 w-14 rounded-md" />
                      <SkeletonBlock className="h-3 w-16 rounded-full" />
                    </div>

                    <div className="space-y-1 text-xs">
                      <SkeletonBlock className="h-3 w-16 rounded-full" />
                      <SkeletonBlock className="h-4 w-12 rounded-md" />
                      <SkeletonBlock className="h-3 w-20 rounded-full" />
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <SkeletonBlock className="h-9 w-24 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SkeletonCard>
    </div>
  );
}
