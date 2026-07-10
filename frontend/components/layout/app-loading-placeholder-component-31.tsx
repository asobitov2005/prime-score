"use client";

import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";

export function RedirectSkeleton() {
  return (
    <div className="mx-auto flex min-h-[18rem] w-full max-w-md items-center justify-center">
      <SkeletonCard className="w-full space-y-4 p-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-44 rounded-md" />
            <SkeletonBlock className="h-3 w-56 max-w-full rounded-full" />
          </div>
        </div>
        <SkeletonBlock className="h-2 w-full rounded-full" />
      </SkeletonCard>
    </div>
  );
}
