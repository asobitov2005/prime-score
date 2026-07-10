"use client";

import { ReactNode, cn } from "./app-loading-placeholder-dependencies";

export function SkeletonCard({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/45 bg-card/45 p-4 shadow-sm ring-1 ring-primary/[0.025]", className)}>
      {children}
    </div>
  );
}
