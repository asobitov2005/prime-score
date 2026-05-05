"use client";

import { cn } from "@/lib/utils";

interface AppLoadingPlaceholderProps {
  className?: string;
  mode?: "inline" | "overlay";
}

export function AppLoadingPlaceholder({
  className,
  mode = "inline",
}: AppLoadingPlaceholderProps) {
  const isOverlay = mode === "overlay";

  return (
    <div
      className={cn(
        isOverlay
          ? "fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-background/72 px-4 backdrop-blur-md"
          : "relative flex min-h-[32vh] w-full items-center justify-center overflow-hidden px-4 py-14",
        className
      )}
      aria-busy
      aria-label="Loading"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-48 w-48 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        {isOverlay ? (
          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:32px_32px]" />
        ) : null}
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-2xl border border-border/70 bg-card/70 px-5 py-4 shadow-[0_16px_44px_rgba(0,0,0,0.18)] backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/75 animate-pulse [animation-delay:140ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/45 animate-pulse [animation-delay:280ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
