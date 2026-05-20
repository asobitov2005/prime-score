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
    <div className="mx-auto w-full max-w-6xl space-y-4">
      {/* Filters Container */}
      <div className="space-y-4 bg-background pb-4 pt-2 sticky top-[var(--app-shell-sticky-top,5.5rem)] z-40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex gap-1.5 bg-muted/40 p-1 rounded-2xl border border-border/50 shadow-inner w-full md:w-max">
             <SkeletonBlock className="h-10 w-full md:w-36 rounded-xl" />
             <SkeletonBlock className="h-10 w-full md:w-36 rounded-xl" />
           </div>
           <SkeletonBlock className="h-10 w-full rounded-xl md:w-[24rem]" />
        </div>
        <div className="flex flex-col gap-3 bg-card/40 border border-border/40 rounded-[2rem] p-1 shadow-sm sm:flex-row sm:items-center sm:justify-between">
           <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1">
             {[50, 70, 70, 70, 70].map((w, i) => (
                <SkeletonBlock key={i} className="h-8 shrink-0 rounded-full" style={{ width: w }} />
             ))}
           </div>
           <SkeletonBlock className="h-10 w-24 rounded-full mx-1" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 pt-4 pb-8">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="flex h-full flex-col p-5 pb-5">
            <div className="flex items-center justify-between mb-4">
              <SkeletonBlock className="h-5 w-20 rounded-md" />
              <SkeletonBlock className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2 mt-1">
              <SkeletonBlock className="h-5 w-[85%]" />
              <SkeletonBlock className="h-4 w-32" />
            </div>
            <div className="mt-8 pt-3 border-t border-border/5">
               <SkeletonBlock className="h-10 w-full rounded-xl" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 mx-auto w-full max-w-6xl pb-12">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="space-y-2">
           <SkeletonBlock className="h-8 w-64 rounded-lg" />
           <SkeletonBlock className="h-4 w-48 rounded-md" />
        </div>

        {/* Top Row */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-stretch">
           <SkeletonCard className="h-[220px] p-5 flex flex-col justify-between">
              <div className="space-y-3">
                 <SkeletonBlock className="h-5 w-32 rounded-full" />
                 <SkeletonBlock className="h-8 w-64 rounded-lg" />
                 <SkeletonBlock className="h-4 w-48 rounded-md" />
              </div>
              <SkeletonBlock className="h-10 w-32 rounded-lg" />
           </SkeletonCard>
           
           <div className="grid gap-3 sm:grid-cols-2 h-full">
             {Array.from({ length: 4 }).map((_, i) => (
               <SkeletonCard key={i} className="p-4 flex flex-col justify-center">
                 <SkeletonBlock className="h-8 w-8 rounded-lg mb-3" />
                 <SkeletonBlock className="h-6 w-20 mb-1" />
                 <SkeletonBlock className="h-3 w-24" />
               </SkeletonCard>
             ))}
           </div>
        </div>

        {/* Activity Row */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-stretch">
           <SkeletonCard className="h-64">{null}</SkeletonCard>
           <SkeletonCard className="h-64">{null}</SkeletonCard>
        </div>

        {/* Second Row Widgets */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
           <div className="space-y-4">
              <SkeletonCard className="h-32">{null}</SkeletonCard>
              <SkeletonCard className="h-40">{null}</SkeletonCard>
           </div>
           <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} className="h-20 flex items-center p-4">
                  <SkeletonBlock className="h-10 w-10 rounded-xl mr-3" />
                  <div className="space-y-2 flex-1">
                    <SkeletonBlock className="h-4 w-32" />
                    <SkeletonBlock className="h-3 w-24" />
                  </div>
                </SkeletonCard>
              ))}
           </div>
        </div>
      </div>
      
      {/* Charts */}
      <SkeletonCard className="h-80 w-full mt-6">{null}</SkeletonCard>

      {/* Recent Activity & Quick Tests */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 mt-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <SkeletonBlock className="h-6 w-32" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
          <SkeletonCard className="p-0">
             {Array.from({ length: 3 }).map((_, i) => (
               <div key={i} className="p-5 flex items-center gap-4 border-b border-border/40 last:border-0">
                  <SkeletonBlock className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                     <SkeletonBlock className="h-4 w-48" />
                     <SkeletonBlock className="h-3 w-32" />
                  </div>
               </div>
             ))}
          </SkeletonCard>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <SkeletonBlock className="h-6 w-32" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
          <div className="space-y-3">
             {Array.from({ length: 3 }).map((_, i) => (
               <SkeletonCard key={i} className="p-4 flex items-center gap-4">
                  <SkeletonBlock className="h-11 w-11 rounded-xl" />
                  <div className="space-y-2 flex-1">
                     <SkeletonBlock className="h-4 w-32" />
                     <SkeletonBlock className="h-3 w-24" />
                  </div>
               </SkeletonCard>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6 mx-auto w-full max-w-5xl">
      <SkeletonCard className="p-5 lg:px-6">
        <div className="flex items-start justify-between mb-4">
           <div className="space-y-2">
             <SkeletonBlock className="h-7 w-32 rounded-lg" />
             <SkeletonBlock className="h-4 w-64 rounded-md" />
           </div>
           <SkeletonBlock className="h-10 w-10 rounded-xl hidden md:block" />
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <SkeletonBlock className="h-10 w-full rounded-lg" />
          <SkeletonBlock className="h-10 w-full md:w-[240px] rounded-xl" />
        </div>
      </SkeletonCard>

      <SkeletonCard className="p-0 overflow-hidden divide-y divide-border/60">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-4 m-2 rounded-xl">
             <SkeletonBlock className="h-4 w-4 shrink-0" />
             <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.7fr)_auto_auto_auto_auto] md:items-center">
                <div className="space-y-2">
                   <SkeletonBlock className="h-4 w-48 rounded-md" />
                   <div className="flex gap-2">
                     <SkeletonBlock className="h-4 w-16 rounded-md" />
                     <SkeletonBlock className="h-4 w-24 rounded-md" />
                   </div>
                </div>
                <div className="space-y-2"><SkeletonBlock className="h-3 w-12" /><SkeletonBlock className="h-4 w-16" /></div>
                <div className="space-y-2"><SkeletonBlock className="h-3 w-12" /><SkeletonBlock className="h-4 w-16" /></div>
                <div className="space-y-2"><SkeletonBlock className="h-3 w-12" /><SkeletonBlock className="h-4 w-16" /></div>
                <SkeletonBlock className="h-8 w-24 rounded-lg" />
             </div>
          </div>
        ))}
      </SkeletonCard>
    </div>
  );
}

function WritingSkeleton() {
  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-6xl">
      <SkeletonCard className="p-5 lg:px-6">
         <div className="flex items-start justify-between">
            <div className="space-y-2">
               <SkeletonBlock className="h-7 w-32 rounded-lg" />
               <SkeletonBlock className="h-4 w-64 rounded-md" />
            </div>
            <SkeletonBlock className="h-10 w-10 rounded-xl hidden md:block" />
         </div>
      </SkeletonCard>

      <div className="-mt-3 space-y-3">
         <div className="flex gap-3 p-1.5 border border-border/50 rounded-2xl">
           <SkeletonBlock className="h-10 flex-1 rounded-xl" />
           <SkeletonBlock className="h-10 flex-1 rounded-xl" />
         </div>
         <SkeletonBlock className="h-14 w-full rounded-2xl" />
         <SkeletonCard className="p-0">
           <div className="p-3 border-b flex justify-between items-center">
             <SkeletonBlock className="h-6 w-48" />
             <SkeletonBlock className="h-7 w-24" />
           </div>
           <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-[78px] rounded-xl" />
              ))}
           </div>
         </SkeletonCard>
      </div>

      <SkeletonCard className="h-64">{null}</SkeletonCard>

      <div className="space-y-3 mt-6">
        <SkeletonBlock className="h-6 w-48 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-72 p-0 flex flex-col">
              <SkeletonBlock className="h-40 w-full rounded-b-none" />
              <div className="p-5 flex-1 flex flex-col gap-3">
                <SkeletonBlock className="h-4 w-20" />
                <SkeletonBlock className="h-5 w-full" />
                <SkeletonBlock className="h-4 w-full mt-auto" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
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
  if (pathname.startsWith("/writing")) {
    return <WritingSkeleton />;
  }
  if (pathname.startsWith("/settings")) {
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
    <div className="relative flex w-full flex-1 flex-col items-start gap-5 px-4 pb-6 pt-3 md:gap-6 md:px-6 md:pb-8 md:pt-4 lg:flex-row lg:px-4">
      <aside
        className={cn(
          "sticky top-[calc(var(--app-shell-sticky-top,5rem)+0.5rem)] hidden w-[16rem] shrink-0 transition-all duration-300 lg:block",
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
