"use client";

import { cn, useEffect, usePathname, useState } from "./app-loading-placeholder-dependencies";
import { AppLoadingPlaceholderProps } from "./app-loading-placeholder-component-01";
import { skeletonForPath } from "./app-loading-placeholder-component-40";

export function AppLoadingPlaceholder({
  className,
  mode = "inline",
  pathname: pathnameOverride,
}: AppLoadingPlaceholderProps) {
  const currentPathname = usePathname() ?? "";
  const pathname = pathnameOverride ?? currentPathname;
  const [searchKey, setSearchKey] = useState("");
  const isOverlay = mode === "overlay";
  const searchParams = searchKey ? new URLSearchParams(searchKey) : null;

  useEffect(() => {
    setSearchKey(window.location.search);
  }, [currentPathname]);

  return (
    <div
      className={cn(
        isOverlay
          ? "fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-background/72 px-4 backdrop-blur-md"
          : "relative flex min-h-[32vh] w-full items-start justify-center overflow-hidden px-4 py-8",
        className
      )}
      aria-busy
      aria-label="Loading"
    >
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="h-full w-full -translate-x-full bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.055),transparent)] [animation:prime-skeleton-shimmer_1.8s_ease-in-out_infinite]" />
        </div>
        {skeletonForPath(pathname, isOverlay, searchParams)}
      </div>
    </div>
  );
}
