"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppLoadingPlaceholderProps {
  className?: string;
  mode?: "inline" | "overlay";
}

type AppSidebarState = "open" | "collapsed";
type FrontendLoadingSection = "app" | "marketing" | "admin" | "generic";

interface RouteLoadingFrameProps {
  className?: string;
  sidebar?: AppSidebarState;
}

function SkeletonBlock({ className, style }: { className: string; style?: CSSProperties }) {
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

function SkeletonCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/45 bg-card/45 p-4 shadow-sm ring-1 ring-primary/[0.025]", className)}>
      {children}
    </div>
  );
}

function TestsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full gap-2 rounded-2xl border border-border/45 bg-muted/35 p-1 md:w-[18rem]">
            <SkeletonBlock className="h-10 flex-1 rounded-xl bg-background/75" />
            <SkeletonBlock className="h-10 flex-1 rounded-xl" />
          </div>
          <SkeletonBlock className="h-11 w-full rounded-xl md:w-96" />
        </div>
        <div className="flex flex-col gap-3 rounded-[2rem] border border-border/40 bg-card/40 p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-2 overflow-hidden">
            {[76, 104, 86, 86, 86].map((width, index) => (
              <SkeletonBlock key={index} className="h-8 shrink-0 rounded-full" style={{ width }} />
            ))}
          </div>
          <SkeletonBlock className="h-9 w-24 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="space-y-5">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-5 w-20 rounded-md" />
              <SkeletonBlock className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-[86%]" />
              <SkeletonBlock className="h-3 w-36" />
            </div>
            <SkeletonBlock className="h-9 w-full rounded-lg" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} className="space-y-4">
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-7 w-20" />
            </div>
          </SkeletonCard>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <SkeletonCard className="space-y-5">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-8 w-24 rounded-full" />
          </div>
          <SkeletonBlock className="h-64 w-full rounded-xl" />
        </SkeletonCard>
        <SkeletonCard className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <SkeletonBlock className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-3 w-[70%]" />
                <SkeletonBlock className="h-2.5 w-[45%]" />
              </div>
            </div>
          ))}
        </SkeletonCard>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-36" />
          <SkeletonBlock className="h-3 w-56" />
        </div>
        <SkeletonBlock className="h-9 w-28 rounded-full" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonCard key={index} className="space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SkeletonBlock className="h-12 w-full rounded-xl" />
            <SkeletonBlock className="h-12 w-full rounded-xl" />
            <SkeletonBlock className="h-12 w-full rounded-xl" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <SkeletonCard className="space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-44" />
            <SkeletonBlock className="h-3 w-64 max-w-full" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[10rem_1fr] md:items-center">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

function MarketingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-4">
          <SkeletonBlock className="h-4 w-32 rounded-full" />
          <SkeletonBlock className="h-10 w-[92%] rounded-lg" />
          <SkeletonBlock className="h-10 w-[74%] rounded-lg" />
          <div className="space-y-2 pt-1">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-[84%]" />
          </div>
          <div className="flex gap-3 pt-2">
            <SkeletonBlock className="h-11 w-32 rounded-xl" />
            <SkeletonBlock className="h-11 w-28 rounded-xl" />
          </div>
        </div>
        <SkeletonBlock className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function GenericSkeleton({ isOverlay }: { isOverlay: boolean }) {
  const skeletonRows = isOverlay ? 3 : 5;

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-2xl border border-border/55 bg-card/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-md",
        isOverlay ? "max-w-md" : "max-w-3xl"
      )}
    >
      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-32 rounded-full" />
            <SkeletonBlock className="h-2.5 w-48 max-w-full rounded-full" />
          </div>
          {!isOverlay ? <SkeletonBlock className="hidden h-8 w-24 rounded-full sm:block" /> : null}
        </div>

        <div className={cn("grid gap-3", isOverlay ? "grid-cols-1" : "sm:grid-cols-2")}>
          {Array.from({ length: skeletonRows }).map((_, index) => (
            <SkeletonCard key={index} className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-4">
                <SkeletonBlock className="h-2.5 w-28 rounded-full" />
                <SkeletonBlock className="h-5 w-12 rounded-full" />
              </div>
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-full rounded-full" />
                <SkeletonBlock className="h-3 w-[82%] rounded-full" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function skeletonForPath(pathname: string, isOverlay: boolean) {
  if (isOverlay) {
    return <GenericSkeleton isOverlay />;
  }
  if (pathname.startsWith("/tests")) {
    return <TestsSkeleton />;
  }
  if (pathname.startsWith("/dashboard")) {
    return <DashboardSkeleton />;
  }
  if (pathname.startsWith("/history")) {
    return <HistorySkeleton />;
  }
  if (pathname.startsWith("/settings") || pathname.startsWith("/writing")) {
    return <FormSkeleton />;
  }
  if (pathname.startsWith("/login")) {
    return <FormSkeleton />;
  }
  if (pathname === "/" || pathname.startsWith("/ielts") || pathname.startsWith("/pricing") || pathname.startsWith("/reviews")) {
    return <MarketingSkeleton />;
  }
  return <GenericSkeleton isOverlay={false} />;
}

function resolveLoadingSection(pathname: string): FrontendLoadingSection {
  if (
    pathname.startsWith("/dashboard")
    || pathname.startsWith("/tests")
    || pathname.startsWith("/attempts")
    || pathname.startsWith("/history")
    || pathname.startsWith("/leaderboard")
    || pathname.startsWith("/subscription")
    || pathname.startsWith("/settings")
    || pathname.startsWith("/writing")
    || pathname.startsWith("/speaking")
    || pathname.startsWith("/articles")
  ) {
    return "app";
  }

  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (
    pathname === "/"
    || pathname.startsWith("/ielts")
    || pathname.startsWith("/pricing")
    || pathname.startsWith("/reviews")
    || pathname.startsWith("/login")
  ) {
    return "marketing";
  }

  return "generic";
}

function SidebarLoadingSkeleton() {
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

function AdminSidebarLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-28 rounded-full" />
        <SkeletonBlock className="h-10 w-full rounded-2xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl px-3 py-3">
            <SkeletonBlock className="h-4 w-4 rounded-md" />
            <SkeletonBlock className={cn("h-3 rounded-full", index % 2 === 0 ? "w-24" : "w-32")} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppRouteLoadingFrame({
  className,
  sidebar = "open",
}: RouteLoadingFrameProps) {
  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-start gap-6 px-4 pb-6 pt-3 md:gap-8 md:px-6 md:pb-8 md:pt-4 lg:flex-row lg:px-8">
      <aside
        className={cn(
          "sticky top-[var(--app-shell-sticky-top,5rem)] hidden w-64 shrink-0 transition-all duration-300 lg:block",
          sidebar === "collapsed" ? "lg:hidden" : "lg:block"
        )}
      >
        <SidebarLoadingSkeleton />
      </aside>

      <main className="w-full min-w-0 flex-1">
        <AppLoadingPlaceholder className={cn("min-h-[50vh] px-0 py-0", className)} />
      </main>
    </div>
  );
}

export function MarketingRouteLoadingFrame({ className }: RouteLoadingFrameProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10 lg:px-8 lg:py-12", className)}>
      <AppLoadingPlaceholder className="min-h-[50vh] px-0 py-0" />
    </div>
  );
}

export function GenericRouteLoadingFrame({ className }: RouteLoadingFrameProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-10 md:px-6 lg:px-8", className)}>
      <AppLoadingPlaceholder className="min-h-[50vh] px-0 py-0" />
    </div>
  );
}

export function AdminRouteLoadingFrame({ className }: RouteLoadingFrameProps) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-72 shrink-0 border-r border-border/50 bg-background/95 p-6 lg:block">
        <AdminSidebarLoadingSkeleton />
      </aside>

      <main className="flex-1 overflow-auto">
        <div className={cn("mx-auto max-w-7xl p-8", className)}>
          <AppLoadingPlaceholder className="min-h-[50vh] px-0 py-0" />
        </div>
      </main>
    </div>
  );
}

export function FrontendRouteLoadingFrame({
  className,
  sidebar = "open",
}: RouteLoadingFrameProps) {
  const pathname = usePathname() ?? "";
  const section = resolveLoadingSection(pathname);

  if (section === "app") {
    return <AppRouteLoadingFrame className={className} sidebar={sidebar} />;
  }

  if (section === "marketing") {
    return <MarketingRouteLoadingFrame className={className} />;
  }

  if (section === "admin") {
    return <AdminRouteLoadingFrame className={className} />;
  }

  return <GenericRouteLoadingFrame className={className} />;
}

export function AppLoadingPlaceholder({
  className,
  mode = "inline",
}: AppLoadingPlaceholderProps) {
  const pathname = usePathname() ?? "";
  const isOverlay = mode === "overlay";

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
        {skeletonForPath(pathname, isOverlay)}
      </div>
    </div>
  );
}
