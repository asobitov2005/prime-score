"use client";

import { cn } from "@/lib/utils";

interface AppLoadingPlaceholderProps {
  className?: string;
  mode?: "inline" | "overlay";
  title?: string;
  description?: string;
}

export function AppLoadingPlaceholder({
  className,
  mode = "inline"
}: AppLoadingPlaceholderProps) {
  const isOverlay = mode === "overlay";

  return (
    <div
      className={cn(
        isOverlay
          ? "fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-background/80 px-4 backdrop-blur-xl"
          : "relative flex min-h-[42vh] w-full items-center justify-center overflow-hidden px-4 py-16",
        className
      )}
      aria-busy
      aria-label="Loading"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[12%] top-[22%] h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <div className="relative flex w-full max-w-lg flex-col items-center justify-center gap-4 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-[3px] border-primary/15 border-t-primary shadow-[0_0_35px_rgba(255,145,0,0.16)] animate-spin" />
          <span
            className="absolute inset-[11px] rounded-full border-2 border-sky-400/15 border-r-sky-400/80"
            style={{ animation: "spin 1.35s linear infinite reverse" }}
          />
          <span className="absolute inset-[26px] rounded-full bg-gradient-to-br from-primary via-orange-300 to-amber-200 shadow-[0_14px_40px_-16px_rgba(255,145,0,0.95)] [animation:prime-loader-breathe_1.8s_ease-in-out_infinite]" />
          <span className="absolute h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.8)]" />
        </div>

        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-muted-foreground/75">
          Loading
        </p>
      </div>
    </div>
  );
}
