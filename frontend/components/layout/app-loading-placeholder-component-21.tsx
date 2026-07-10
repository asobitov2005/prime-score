"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function TestStartSkeleton() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <SkeletonBlock className="mb-4 h-4 w-28 rounded-full" />
        <SkeletonCard className="overflow-hidden rounded-2xl p-0 shadow-xl">
          <div className="h-1.5 bg-muted/70" />
          <div className="border-b border-border/40 bg-muted/10 p-6 text-center">
            <div className="mb-3 flex justify-center gap-2">
              <SkeletonBlock className="h-5 w-16 rounded-md" />
              <SkeletonBlock className="h-5 w-20 rounded-md" />
            </div>
            <SkeletonBlock className="mx-auto h-6 w-64 max-w-full rounded-lg" />
            <SkeletonBlock className="mx-auto mt-2 h-3 w-48 rounded-full" />
          </div>
          <div className="space-y-3 p-5">
            {Array.from({ length: 2 }).map((_, index) => (
              <SkeletonCard key={index} className="flex items-center gap-4 rounded-xl p-4">
                <SkeletonBlock className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-32 rounded-md" />
                  <SkeletonBlock className="h-3 w-44 max-w-full rounded-full" />
                </div>
              </SkeletonCard>
            ))}
            <SkeletonBlock className="mx-auto mt-2 h-3 w-56 max-w-full rounded-full" />
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
