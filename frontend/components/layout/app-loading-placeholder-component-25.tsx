"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function SettingsSkeleton() {
  return (
    <div className="space-y-4 pb-6">
      <SkeletonCard className="relative overflow-visible rounded-2xl p-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-muted/70" />
        <div className="border-b border-border/40 bg-muted/10 p-4 lg:px-5">
          <div className="flex items-start gap-4">
            <SkeletonBlock className="hidden h-10 w-10 rounded-xl md:block" />
            <div className="space-y-2">
              <SkeletonBlock className="h-7 w-56 rounded-lg" />
              <SkeletonBlock className="h-4 w-[min(34rem,84vw)] rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-4 p-4 lg:p-5">
          <SkeletonCard className="overflow-hidden rounded-xl p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/10 p-4">
              <SkeletonBlock className="h-5 w-40 rounded-md" />
              <SkeletonBlock className="h-7 w-36 rounded-full" />
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <SkeletonBlock className="h-20 w-20 rounded-2xl" />
              <div className="space-y-3">
                <SkeletonBlock className="h-5 w-48 rounded-md" />
                <SkeletonBlock className="h-4 w-40 rounded-full" />
                <SkeletonBlock className="h-4 w-52 rounded-full" />
              </div>
              <SkeletonBlock className="h-10 w-32 rounded-xl" />
            </div>
          </SkeletonCard>
          <SkeletonCard className="overflow-hidden rounded-xl p-0">
            <div className="flex items-center justify-between border-b border-border/40 bg-muted/10 p-4">
              <SkeletonBlock className="h-5 w-36 rounded-md" />
              <SkeletonBlock className="h-9 w-32 rounded-xl" />
            </div>
            <div className="divide-y divide-border/40">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-4">
                  <SkeletonBlock className="h-10 w-10 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-48 max-w-full rounded-md" />
                    <SkeletonBlock className="h-3 w-64 max-w-full rounded-full" />
                  </div>
                  <SkeletonBlock className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </SkeletonCard>
    </div>
  );
}
