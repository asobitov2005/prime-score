"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";

export function SidebarLoadingSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3 shadow-sm backdrop-blur-md">
      <SkeletonBlock className="mb-3 h-3 w-24 rounded-full" />
      <div className="space-y-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <SkeletonBlock className="h-4 w-4 rounded-md" />
            <SkeletonBlock className={cn("h-3 rounded-full", index % 3 === 0 ? "w-24" : index % 3 === 1 ? "w-20" : "w-28")} />
          </div>
        ))}
      </div>
    </div>
  );
}
