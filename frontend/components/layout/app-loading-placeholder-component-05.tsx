"use client";

import { CSSProperties, cn } from "./app-loading-placeholder-dependencies";

export function SkeletonBlock({ className, style }: { className: string; style?: CSSProperties }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60 after:absolute after:inset-0 after:-translate-x-full after:bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.1),transparent)] after:[animation:prime-skeleton-shimmer_1.9s_ease-in-out_infinite]",
        className
      )}
      style={style}
    />
  );
}
