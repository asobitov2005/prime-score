"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppLoadingPlaceholderProps {
  className?: string;
  mode?: "inline" | "overlay";
  pathname?: string;
}

type AppSidebarState = "open" | "collapsed";
type FrontendLoadingSection = "app" | "marketing" | "admin" | "exam" | "generic";

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

function SkeletonCard({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/45 bg-card/45 p-4 shadow-sm ring-1 ring-primary/[0.025]", className)}>
      {children}
    </div>
  );
}

function SkeletonLineStack({
  lines = 2,
  className,
  widths = ["w-48", "w-64"],
}: {
  lines?: number;
  className?: string;
  widths?: string[];
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className={cn(
            "h-3 max-w-full rounded-full",
            widths[index] ?? widths[widths.length - 1] ?? "w-full"
          )}
        />
      ))}
    </div>
  );
}

function PageHeadingSkeleton({
  action = false,
  compact = false,
}: {
  action?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className={cn("space-y-3", compact && "space-y-2")}>
        <SkeletonBlock className="h-6 w-28 rounded-full" />
        <SkeletonBlock className={cn("rounded-lg", compact ? "h-7 w-48" : "h-9 w-64")} />
        <SkeletonBlock className="h-4 w-[min(34rem,88vw)] rounded-full" />
      </div>
      {action ? <SkeletonBlock className="h-11 w-36 rounded-2xl" /> : null}
    </div>
  );
}

function StatStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonCard className="p-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex h-20 items-center gap-3 px-3 py-3",
              index > 0 && "xl:border-l xl:border-border/45",
              index > 1 && "sm:border-t sm:border-border/45 xl:border-t-0"
            )}
          >
            <SkeletonBlock className="h-12 w-12 rounded-2xl" />
            <div className="min-w-0 space-y-2">
              <SkeletonBlock className="h-6 w-14 rounded-md" />
              <SkeletonBlock className="h-3 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

function TableSkeleton({
  rows = 5,
  columns = "grid-cols-[48px_minmax(0,1.4fr)_88px_78px] md:grid-cols-[56px_minmax(0,1.6fr)_110px_88px_110px_138px]",
}: {
  rows?: number;
  columns?: string;
}) {
  return (
    <SkeletonCard className="overflow-hidden p-0">
      <div className={cn("grid gap-3 border-b border-border/50 bg-muted/20 px-4 py-4 md:px-6", columns)}>
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className={cn("h-3 rounded-full", index > 3 && "hidden md:block")} />
        ))}
      </div>
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className={cn("grid items-center gap-3 px-4 py-4 md:px-6", columns)}>
            <SkeletonBlock className="h-5 w-7 rounded-md justify-self-center" />
            <div className="flex min-w-0 items-center gap-3">
              <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-44 max-w-full rounded-full" />
                <SkeletonBlock className="h-3 w-32 max-w-full rounded-full" />
              </div>
            </div>
            <SkeletonBlock className="h-5 w-16 rounded-md justify-self-end md:justify-self-center" />
            <SkeletonBlock className="h-7 w-16 rounded-full justify-self-end md:justify-self-center" />
            <SkeletonBlock className="hidden h-5 w-12 rounded-md justify-self-center md:block" />
            <SkeletonBlock className="hidden h-10 w-16 rounded-xl justify-self-center md:block" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

function TestsOverviewSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-[82rem] flex-col gap-4 pb-10">
        <section className="-mb-2 -mt-4 px-6 pb-0 pt-1 sm:-mt-5 sm:px-7 sm:pb-0 sm:pt-0 lg:-mb-3">
          <div className="flex translate-y-2 items-start justify-between gap-6 sm:translate-y-3">
            <div className="max-w-2xl space-y-3 pt-4">
              <SkeletonBlock className="h-8 w-56 rounded-lg md:h-9" />
              <SkeletonBlock className="h-5 w-[min(34rem,86vw)] rounded-full" />
            </div>
            <SkeletonBlock className="hidden h-36 w-64 shrink-0 rounded-2xl lg:block" />
          </div>
        </section>

        <StatStripSkeleton count={5} />

        <SkeletonCard className="rounded-2xl p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
              <SkeletonBlock className="h-[4.25rem] w-14 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-3">
                <SkeletonBlock className="h-5 w-80 max-w-full rounded-md" />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <SkeletonBlock className="h-4 w-36 rounded-full" />
                  <SkeletonBlock className="h-4 w-44 rounded-full" />
                </div>
                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
            </div>
            <SkeletonBlock className="h-11 w-full rounded-xl xl:w-36" />
          </div>
        </SkeletonCard>

        <section className="space-y-4">
          <SkeletonBlock className="h-7 w-40 rounded-lg" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonCard key={index} className="flex min-h-[12.5rem] flex-col rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-12 w-12 rounded-2xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-5 w-24 rounded-md" />
                    <SkeletonBlock className="h-4 w-20 rounded-full" />
                  </div>
                </div>
                <SkeletonLineStack className="mt-4" widths={["w-full", "w-3/4"]} />
                <SkeletonBlock className="mt-auto h-10 w-full rounded-xl" />
              </SkeletonCard>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SkeletonBlock className="h-7 w-48 rounded-lg" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonCard key={index} className="flex h-[6.5rem] items-center gap-4 rounded-2xl p-5">
                <SkeletonBlock className="h-[4.5rem] w-[3.375rem] shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-44 max-w-full rounded-md" />
                  <SkeletonBlock className="h-4 w-28 rounded-full" />
                </div>
                <SkeletonBlock className="h-5 w-5 rounded-md" />
              </SkeletonCard>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <SkeletonBlock className="h-7 w-36 rounded-lg" />
              <SkeletonBlock className="h-3 w-64 rounded-full" />
            </div>
            <SkeletonBlock className="h-10 w-48 rounded-full" />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15.75rem),1fr))] gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} className="flex min-h-[12.75rem] flex-col rounded-[14px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-36 rounded-md" />
                    <SkeletonBlock className="h-4 w-28 rounded-md" />
                  </div>
                  <SkeletonBlock className="h-9 w-9 rounded-xl" />
                </div>
                <SkeletonBlock className="mt-3 h-3 w-40 rounded-full" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <SkeletonBlock className="h-6 w-16 rounded-full" />
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                </div>
                <SkeletonBlock className="mt-auto h-10 w-full rounded-lg" />
              </SkeletonCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TestCatalogCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} className="flex min-h-[11rem] flex-col rounded-[14px] p-4">
          <div className="min-h-[2.5rem] min-w-0">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-5 w-44 max-w-full rounded-md" />
                <SkeletonBlock className="h-4 w-28 max-w-full rounded-md" />
              </div>
              <SkeletonBlock className="h-6 w-16 shrink-0 rounded-full" />
            </div>
            <div className="mt-1 flex min-h-8 items-center justify-between gap-2">
              <SkeletonBlock className="h-4 w-28 rounded-full" />
              <SkeletonBlock className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="mt-auto h-10 w-full rounded-lg" />
        </SkeletonCard>
      ))}
    </section>
  );
}

function SkillTestsSkeleton({ skill = "reading" }: { skill?: "reading" | "listening" }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-[82rem] pb-10">
        <section className="pt-1">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <SkeletonBlock className="h-4 w-24 rounded-full" />
              <SkeletonBlock className="h-3.5 w-3.5 rounded-md" />
              <SkeletonBlock className={cn("h-4 rounded-full", skill === "listening" ? "w-20" : "w-16")} />
            </div>
            <SkeletonBlock className="mt-4 h-9 w-64 rounded-lg" />
            {skill === "listening" ? <SkeletonBlock className="mt-3 h-5 w-[min(34rem,88vw)] rounded-full" /> : null}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} className="flex min-h-[6.25rem] items-center gap-4 rounded-[14px] p-4">
              <SkeletonBlock className="h-[4.25rem] w-[3.2rem] shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-36 max-w-full rounded-md" />
                <SkeletonBlock className="h-4 w-24 rounded-full" />
              </div>
              <SkeletonBlock className="h-4 w-4 rounded-md" />
            </SkeletonCard>
          ))}
        </section>

        <section className="mt-8 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="flex min-w-0 items-end gap-6 overflow-hidden border-b border-slate-200 dark:border-slate-800">
            {(skill === "listening" ? [72, 72, 72, 72, 72] : [72, 96, 72, 72, 72]).map((width, index) => (
              <SkeletonBlock key={index} className="h-10 shrink-0 rounded-t-md" style={{ width }} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[31rem]">
            <SkeletonBlock className="h-10 w-full rounded-xl" />
            <SkeletonBlock className="h-10 w-full rounded-xl" />
            <SkeletonBlock className="h-10 w-full rounded-xl" />
          </div>
        </section>

        <TestCatalogCardSkeleton />
      </div>
    </div>
  );
}

function ReadingTestsSkeleton() {
  return <SkillTestsSkeleton skill="reading" />;
}

function ListeningTestsSkeleton() {
  return <SkillTestsSkeleton skill="listening" />;
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[82rem] space-y-5 pb-12">
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-9 w-64 rounded-lg" />
          <SkeletonBlock className="h-4 w-[min(30rem,86vw)] rounded-full" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_340px_210px] xl:items-stretch">
          <SkeletonCard className="min-h-[176px] rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <SkeletonBlock className="h-4 w-32 rounded-full" />
                <SkeletonBlock className="h-10 w-32 rounded-lg" />
                <SkeletonLineStack widths={["w-[min(24rem,70vw)]", "w-[min(18rem,60vw)]"]} />
              </div>
              <SkeletonBlock className="h-14 w-14 rounded-2xl" />
            </div>
            <SkeletonBlock className="mt-6 h-3 w-full rounded-full" />
          </SkeletonCard>
          <SkeletonCard className="min-h-[176px] rounded-3xl p-5">
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="mt-7 h-16 w-28 rounded-lg" />
            <SkeletonBlock className="mt-4 h-4 w-40 rounded-full" />
          </SkeletonCard>
          <SkeletonCard className="min-h-[176px] rounded-3xl p-5">
            <SkeletonBlock className="h-4 w-28 rounded-full" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <SkeletonBlock className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-3 w-24 rounded-full" />
                    <SkeletonBlock className="h-3 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[580px_minmax(0,1fr)] xl:items-stretch">
          <SkeletonCard className="min-h-[228px] max-w-[580px] rounded-2xl p-4 md:p-5">
            <SkeletonBlock className="h-5 w-40 rounded-full" />
            <SkeletonBlock className="mt-4 h-8 w-72 max-w-full rounded-lg" />
            <SkeletonLineStack className="mt-3" widths={["w-[min(28rem,82vw)]", "w-[min(18rem,70vw)]"]} />
            <SkeletonBlock className="mt-8 h-9 w-36 rounded-lg" />
          </SkeletonCard>
          <SkeletonCard className="min-h-[176px] rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <SkeletonLineStack widths={["w-40", "w-56"]} />
              <SkeletonBlock className="h-11 w-11 rounded-xl" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          </SkeletonCard>
        </div>

        <SkeletonCard className="rounded-3xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <SkeletonLineStack widths={["w-44", "w-64"]} />
            <SkeletonBlock className="h-9 w-28 rounded-xl" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/45 bg-muted/20 p-4">
                <SkeletonBlock className="h-10 w-10 rounded-xl" />
                <SkeletonBlock className="mt-4 h-5 w-24 rounded-md" />
                <SkeletonBlock className="mt-3 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard className="h-[300px] rounded-3xl" />

        <SkeletonCard className="rounded-3xl p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="h-11 w-11 rounded-2xl" />
              <SkeletonLineStack widths={["w-44", "w-[min(34rem,80vw)]"]} />
            </div>
            <SkeletonBlock className="h-7 w-28 rounded-full" />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
            <SkeletonCard className="rounded-3xl p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between gap-3">
                    <SkeletonBlock className="h-5 w-40 rounded-md" />
                    <SkeletonBlock className="h-5 w-12 rounded-md" />
                  </div>
                  <SkeletonBlock className="mt-2 h-2 w-full rounded-full" />
                </div>
              ))}
            </SkeletonCard>
            <SkeletonCard className="rounded-3xl p-4">
              <div className="grid grid-cols-2 gap-2">
                <SkeletonBlock className="h-20 rounded-2xl" />
                <SkeletonBlock className="h-20 rounded-2xl" />
              </div>
              <SkeletonLineStack className="mt-5" widths={["w-40", "w-52", "w-36"]} lines={3} />
              <SkeletonBlock className="mt-5 h-9 w-full rounded-xl" />
            </SkeletonCard>
          </div>
        </SkeletonCard>

        <section className="grid items-stretch gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <SkeletonBlock className="h-6 w-36 rounded-lg" />
              <SkeletonBlock className="h-4 w-16 rounded-full" />
            </div>
            <SkeletonCard className="overflow-hidden rounded-3xl p-0">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 border-b border-border/40 p-5 last:border-b-0">
                  <SkeletonBlock className="h-12 w-12 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-48 max-w-full rounded-md" />
                    <SkeletonBlock className="h-3 w-32 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-8 w-24 rounded-lg" />
                </div>
              ))}
            </SkeletonCard>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <SkeletonBlock className="h-6 w-32 rounded-lg" />
              <SkeletonBlock className="h-4 w-16 rounded-full" />
            </div>
            <SkeletonCard className="overflow-hidden rounded-3xl p-0">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 border-b border-border/40 p-5 last:border-b-0">
                  <SkeletonBlock className="h-11 w-11 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-36 max-w-full rounded-md" />
                    <SkeletonBlock className="h-3 w-24 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-9 w-9 rounded-full" />
                </div>
              ))}
            </SkeletonCard>
          </div>
        </section>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SkeletonCard className="relative z-20 overflow-visible rounded-2xl border-border/50 bg-background p-0 shadow-sm">
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <div className="relative z-10 border-b border-border/40 bg-muted/5 p-5 lg:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-7 w-28 rounded-lg md:h-8" />
              <SkeletonBlock className="h-4 w-[min(25rem,78vw)] rounded-full" />
            </div>
            <SkeletonBlock className="hidden h-10 w-10 shrink-0 rounded-xl md:block" />
          </div>
        </div>

        <div className="relative z-10 grid gap-3 bg-background/50 p-4 lg:px-6 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-md" />
          </div>
          <SkeletonBlock className="h-10 w-full md:w-[240px] rounded-xl" />
        </div>
      </SkeletonCard>

      <SkeletonCard className="overflow-hidden rounded-2xl border-border/50 p-0 shadow-sm">
        <div className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, index) => {
            const isWriting = index === 2;
            return (
              <div
                key={index}
                className="group relative m-2 rounded-xl border border-border/50 bg-background shadow-sm"
              >
                <div className="flex items-center gap-3 rounded-xl px-4 py-4">
                  <SkeletonBlock className={cn("h-4 w-4 shrink-0", isWriting ? "rounded-md" : "rounded-full")} />
                  <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.7fr)_auto_auto_auto_auto] md:items-center">
                    <div className="min-w-0 space-y-2">
                      <SkeletonBlock className="h-4 w-64 max-w-full rounded-md" />
                      <div className="flex flex-wrap items-center gap-2">
                        <SkeletonBlock className="h-5 w-16 rounded-md" />
                        <SkeletonBlock className="h-5 w-28 rounded-md" />
                        <SkeletonBlock className="h-5 w-20 rounded-md" />
                        {!isWriting ? <SkeletonBlock className="h-5 w-20 rounded-md" /> : null}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <SkeletonBlock className="h-3 w-14 rounded-full" />
                      <SkeletonBlock className="h-4 w-16 rounded-md" />
                      <SkeletonBlock className="h-3 w-20 rounded-full" />
                    </div>

                    <div className="space-y-1 text-xs">
                      <SkeletonBlock className="h-3 w-10 rounded-full" />
                      <SkeletonBlock className="h-4 w-14 rounded-md" />
                      <SkeletonBlock className="h-3 w-16 rounded-full" />
                    </div>

                    <div className="space-y-1 text-xs">
                      <SkeletonBlock className="h-3 w-16 rounded-full" />
                      <SkeletonBlock className="h-4 w-12 rounded-md" />
                      <SkeletonBlock className="h-3 w-20 rounded-full" />
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <SkeletonBlock className="h-9 w-24 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SkeletonCard>
    </div>
  );
}

function WritingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-56 rounded-lg" />
          <SkeletonBlock className="h-4 w-[min(38rem,88vw)] rounded-full" />
        </div>
        <SkeletonBlock className="h-11 w-36 rounded-xl" />
      </div>

      <SkeletonCard className="overflow-hidden rounded-[18px] p-0">
        <div className="px-6 pb-3 pt-6 md:px-8 md:pb-4 md:pt-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex gap-4 sm:items-center">
              <SkeletonBlock className="h-20 w-20 shrink-0 rounded-2xl" />
              <div className="min-w-0 space-y-3">
                <SkeletonBlock className="h-7 w-52 rounded-lg" />
                <SkeletonLineStack widths={["w-[min(34rem,78vw)]", "w-[min(24rem,68vw)]"]} />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <SkeletonBlock className="h-11 w-full rounded-xl sm:w-36" />
              <SkeletonBlock className="h-11 w-full rounded-xl sm:w-32" />
              <SkeletonBlock className="h-11 w-full rounded-xl sm:w-36" />
            </div>
          </div>
          <div className="-mx-6 mt-6 flex flex-col gap-2 border-t border-border/45 px-6 pt-3 sm:flex-row sm:items-center sm:justify-between md:-mx-8 md:px-8">
            <SkeletonBlock className="h-4 w-64 rounded-full" />
            <SkeletonBlock className="h-4 w-48 rounded-full" />
          </div>
        </div>
      </SkeletonCard>

      <SkeletonCard className="rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SkeletonBlock className="h-5 w-48 rounded-md" />
          <SkeletonBlock className="h-4 w-36 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl border border-border/45 bg-muted/20 p-3 lg:border-0">
              <SkeletonBlock className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-16 rounded-md" />
                <SkeletonBlock className="h-3 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard className="rounded-3xl p-4">
        <div className="inline-flex rounded-xl bg-muted/40 p-1 shadow-inner">
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <SkeletonBlock className="h-11 w-full rounded-xl" />
          <SkeletonBlock className="h-11 w-36 rounded-xl" />
        </div>
      </SkeletonCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="flex min-h-[18rem] flex-col overflow-hidden rounded-3xl p-0">
            <SkeletonBlock className="h-40 w-full rounded-none" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex gap-2">
                <SkeletonBlock className="h-6 w-16 rounded-full" />
                <SkeletonBlock className="h-4 w-20 rounded-full" />
              </div>
              <SkeletonBlock className="h-5 w-4/5 rounded-md" />
              <SkeletonLineStack lines={2} widths={["w-full", "w-2/3"]} />
              <SkeletonBlock className="mt-auto h-10 w-full rounded-xl" />
            </div>
          </SkeletonCard>
        ))}
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

function TestDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <SkeletonBlock className="h-9 w-32 rounded-xl" />
      <SkeletonCard className="relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-muted/70" />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <SkeletonBlock className="h-5 w-16 rounded-md" />
            <SkeletonBlock className="h-5 w-20 rounded-md" />
            <SkeletonBlock className="h-5 w-20 rounded-md" />
          </div>
          <SkeletonBlock className="h-8 w-[min(34rem,86vw)] rounded-lg" />
          <SkeletonLineStack lines={2} widths={["w-[min(42rem,90vw)]", "w-[min(28rem,78vw)]"]} />
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <SkeletonBlock className="h-11 w-full rounded-xl sm:w-40" />
            <SkeletonBlock className="h-11 w-full rounded-xl sm:w-36" />
          </div>
        </div>
      </SkeletonCard>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} className="p-4">
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <SkeletonBlock className="mt-3 h-3 w-20 rounded-full" />
            <SkeletonBlock className="mt-2 h-6 w-24 rounded-md" />
          </SkeletonCard>
        ))}
      </div>

      <SkeletonCard className="overflow-hidden p-0">
        <div className="border-b border-border/40 bg-muted/10 p-5">
          <SkeletonBlock className="h-5 w-36 rounded-md" />
        </div>
        <div className="space-y-2 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-xl border border-border/55 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-52 max-w-full rounded-md" />
                <SkeletonBlock className="h-3 w-72 max-w-full rounded-full" />
              </div>
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

function TestStartSkeleton() {
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

function BookmarksSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[82rem] pb-10">
      <section className="pt-1">
        <div className="flex items-center gap-1.5">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="h-3.5 w-3.5 rounded-md" />
          <SkeletonBlock className="h-4 w-20 rounded-full" />
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-9 w-52 rounded-lg" />
            <SkeletonBlock className="h-4 w-[min(34rem,88vw)] rounded-full" />
          </div>
          <SkeletonBlock className="h-10 w-32 rounded-full" />
        </div>
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="relative flex min-h-[12.75rem] flex-col rounded-[14px] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                  <SkeletonBlock className="h-6 w-16 rounded-full" />
                </div>
                <SkeletonBlock className="mt-4 h-4 w-48 max-w-full rounded-md" />
                <SkeletonBlock className="mt-2 h-4 w-36 max-w-full rounded-md" />
              </div>
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
            </div>
            <SkeletonBlock className="mt-4 h-3 w-44 rounded-full" />
            <SkeletonBlock className="mt-4 h-3 w-28 rounded-full" />
            <SkeletonBlock className="mt-auto h-10 w-full rounded-lg" />
          </SkeletonCard>
        ))}
      </section>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <SkeletonCard className="relative overflow-hidden rounded-3xl p-5 lg:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-muted/70" />
        <div className="flex items-start justify-between gap-4">
          <SkeletonBlock className="h-8 w-48 rounded-lg" />
          <SkeletonBlock className="hidden h-12 w-12 shrink-0 rounded-2xl md:block" />
        </div>
        <div className="mt-4 flex w-full items-center overflow-hidden rounded-[1.25rem] border border-border/50 bg-muted/40 p-1.5 md:w-max">
          {[92, 82, 88].map((width, index) => (
            <SkeletonBlock key={index} className="h-10 rounded-xl" style={{ width }} />
          ))}
        </div>
      </SkeletonCard>
      <TableSkeleton rows={8} />
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className="-mt-1 space-y-6 pb-10 md:-mt-2">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-44 rounded-lg" />
        <SkeletonBlock className="h-4 w-[min(34rem,88vw)] rounded-full" />
      </div>

      <SkeletonCard className="rounded-[18px] border-orange-200/70 p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)_auto] lg:items-center">
          <div className="flex items-start gap-3">
            <SkeletonBlock className="h-[52px] w-[52px] shrink-0 rounded-full" />
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-24 rounded-full" />
              <SkeletonBlock className="h-6 w-40 rounded-md" />
              <SkeletonBlock className="h-4 w-56 rounded-full" />
            </div>
          </div>
          <div className="grid gap-0 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center gap-2 px-3 py-2">
                <SkeletonBlock className="h-8 w-8 rounded-full" />
                <SkeletonBlock className="h-4 w-20 rounded-full" />
                <SkeletonBlock className="h-4 w-16 rounded-full" />
              </div>
            ))}
          </div>
          <SkeletonBlock className="h-10 w-full rounded-xl lg:w-32" />
        </div>
      </SkeletonCard>

      <section className="space-y-5">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-64 rounded-lg" />
          <SkeletonBlock className="h-4 w-[min(30rem,84vw)] rounded-full" />
        </div>
        <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-[1.12fr_repeat(3,minmax(0,1fr))]">
          <SkeletonCard className="min-h-[31rem] rounded-[20px] p-6">
            <SkeletonBlock className="h-7 w-56 rounded-lg" />
            <SkeletonLineStack className="mt-5" lines={3} widths={["w-full", "w-5/6", "w-4/6"]} />
            <div className="mt-7 space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <SkeletonBlock className="h-7 w-7 rounded-full" />
                  <SkeletonBlock className="h-4 w-40 rounded-full" />
                </div>
              ))}
            </div>
          </SkeletonCard>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} className="flex min-h-[31rem] flex-col rounded-[20px] p-6">
              <SkeletonBlock className="mx-auto h-12 w-12 rounded-full" />
              <SkeletonBlock className="mx-auto mt-6 h-7 w-28 rounded-lg" />
              <SkeletonBlock className="mx-auto mt-3 h-4 w-32 rounded-full" />
              <SkeletonBlock className="mx-auto mt-7 h-8 w-32 rounded-lg" />
              <SkeletonBlock className="mt-7 h-12 w-full rounded-xl" />
              <div className="mt-7 space-y-4 border-t border-border/45 pt-6">
                {Array.from({ length: 3 }).map((_, itemIndex) => (
                  <SkeletonBlock key={itemIndex} className="h-4 w-full rounded-full" />
                ))}
              </div>
            </SkeletonCard>
          ))}
        </div>
      </section>

      <SkeletonCard className="rounded-[18px] p-5">
        <SkeletonBlock className="h-6 w-48 rounded-lg" />
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3">
              <SkeletonBlock className="h-14 w-14 shrink-0 rounded-full" />
              <SkeletonLineStack widths={["w-32", "w-44"]} />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard className="rounded-[18px] p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:items-center">
          <div className="flex items-start gap-3">
            <SkeletonBlock className="h-12 w-12 rounded-2xl" />
            <SkeletonLineStack widths={["w-52", "w-64"]} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <SkeletonBlock className="h-12 w-full rounded-xl" />
            <SkeletonBlock className="h-12 w-32 rounded-xl" />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4 pb-6">
      <SkeletonCard className="relative overflow-visible rounded-2xl p-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-muted/70" />
        <div className="border-b border-border/40 bg-muted/10 p-4 lg:px-5">
          <div className="flex items-start gap-4">
            <SkeletonBlock className="hidden h-10 w-10 rounded-xl md:block" />
            <div className="space-y-2">
              <SkeletonBlock className="h-7 w-56 rounded-lg" />
              <SkeletonBlock className="h-4 w-[min(34rem,84vw)] rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-4 p-4 lg:p-5">
          <SkeletonCard className="overflow-hidden rounded-xl p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/10 p-4">
              <SkeletonBlock className="h-5 w-40 rounded-md" />
              <SkeletonBlock className="h-7 w-36 rounded-full" />
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <SkeletonBlock className="h-20 w-20 rounded-2xl" />
              <div className="space-y-3">
                <SkeletonBlock className="h-5 w-48 rounded-md" />
                <SkeletonBlock className="h-4 w-40 rounded-full" />
                <SkeletonBlock className="h-4 w-52 rounded-full" />
              </div>
              <SkeletonBlock className="h-10 w-32 rounded-xl" />
            </div>
          </SkeletonCard>
          <SkeletonCard className="overflow-hidden rounded-xl p-0">
            <div className="flex items-center justify-between border-b border-border/40 bg-muted/10 p-4">
              <SkeletonBlock className="h-5 w-36 rounded-md" />
              <SkeletonBlock className="h-9 w-32 rounded-xl" />
            </div>
            <div className="divide-y divide-border/40">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-4">
                  <SkeletonBlock className="h-10 w-10 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-48 max-w-full rounded-md" />
                    <SkeletonBlock className="h-3 w-64 max-w-full rounded-full" />
                  </div>
                  <SkeletonBlock className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>
      </SkeletonCard>
    </div>
  );
}

function WritingTasksSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeadingSkeleton />
      <SkeletonCard className="rounded-3xl p-4">
        <div className="inline-flex rounded-xl bg-muted/40 p-1 shadow-inner">
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
      </SkeletonCard>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="flex min-h-[18rem] flex-col overflow-hidden rounded-3xl p-0">
            <SkeletonBlock className="h-44 w-full rounded-none" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex gap-2">
                <SkeletonBlock className="h-6 w-16 rounded-full" />
                <SkeletonBlock className="h-4 w-20 rounded-full" />
              </div>
              <SkeletonBlock className="h-5 w-4/5 rounded-md" />
              <SkeletonLineStack lines={2} widths={["w-full", "w-2/3"]} />
              <div className="mt-auto flex items-center justify-between">
                <SkeletonBlock className="h-4 w-32 rounded-full" />
                <SkeletonBlock className="h-4 w-16 rounded-full" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

function WritingHistorySkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeadingSkeleton action />
      <div className="flex flex-wrap items-center gap-2">
        <SkeletonBlock className="h-8 w-20 rounded-full" />
        <SkeletonBlock className="h-8 w-20 rounded-full" />
        <SkeletonBlock className="h-8 w-20 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonCard key={index} className="rounded-2xl p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <SkeletonBlock className="h-12 w-12 shrink-0 rounded-2xl" />
                <div className="min-w-0 space-y-2">
                  <SkeletonBlock className="h-4 w-56 max-w-full rounded-md" />
                  <SkeletonBlock className="h-3 w-72 max-w-full rounded-full" />
                </div>
              </div>
              <SkeletonBlock className="h-8 w-24 rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

function WritingResultSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <SkeletonCard className="rounded-3xl p-8 sm:p-10">
        <div className="mb-2 flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-2xl" />
          <SkeletonBlock className="h-7 w-24 rounded-full" />
        </div>
        <SkeletonBlock className="h-9 w-64 rounded-lg" />
        <SkeletonLineStack className="mt-3" widths={["w-[min(42rem,90vw)]", "w-[min(28rem,80vw)]"]} />
        <div className="mt-8 grid grid-cols-1 gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-2xl border border-border/45 bg-muted/20 px-4 py-3">
              <SkeletonBlock className="h-8 w-8 rounded-xl" />
              <SkeletonBlock className="h-4 w-48 max-w-full rounded-md" />
            </div>
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard className="h-28 rounded-3xl" />
    </div>
  );
}

function AttemptResultSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-[min(36rem,88vw)] rounded-lg" />
          <SkeletonBlock className="h-4 w-72 max-w-full rounded-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-32 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.62fr)_minmax(0,1.38fr)]">
        <SkeletonCard className="min-h-[22rem] rounded-3xl p-5">
          <SkeletonBlock className="mx-auto h-44 w-44 rounded-full" />
          <SkeletonBlock className="mx-auto mt-6 h-8 w-24 rounded-lg" />
          <SkeletonBlock className="mx-auto mt-3 h-4 w-40 rounded-full" />
        </SkeletonCard>
        <SkeletonCard className="min-h-[22rem] rounded-3xl p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/45 bg-muted/20 p-4">
                <SkeletonBlock className="h-3 w-24 rounded-full" />
                <SkeletonBlock className="mt-3 h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
      <SkeletonCard className="h-40 rounded-3xl" />
      <SkeletonCard className="h-64 rounded-3xl" />
    </div>
  );
}

function AttemptReviewSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard className="p-6">
        <SkeletonBlock className="h-7 w-32 rounded-full" />
        <SkeletonBlock className="mt-4 h-8 w-[min(36rem,88vw)] rounded-lg" />
        <SkeletonLineStack className="mt-3" widths={["w-[min(42rem,90vw)]", "w-[min(24rem,76vw)]"]} />
        <div className="mt-4 flex flex-wrap gap-3">
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-36 rounded-full" />
          <SkeletonBlock className="h-6 w-28 rounded-full" />
        </div>
      </SkeletonCard>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} className="p-5">
            <div className="flex flex-wrap gap-2">
              <SkeletonBlock className="h-6 w-14 rounded-full" />
              <SkeletonBlock className="h-6 w-20 rounded-full" />
              <SkeletonBlock className="h-6 w-28 rounded-full" />
            </div>
            <SkeletonBlock className="mt-4 h-5 w-4/5 rounded-md" />
            <SkeletonBlock className="mt-2 h-3 w-64 max-w-full rounded-full" />
            <div className="mt-4 space-y-3">
              <SkeletonBlock className="h-16 w-full rounded-lg" />
              <SkeletonBlock className="h-16 w-full rounded-lg" />
              <SkeletonBlock className="h-20 w-full rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

function RedirectSkeleton() {
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

function ExamWorkspaceSkeleton({ kind }: { kind: "reading" | "listening" | "writing" }) {
  const isWriting = kind === "writing";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      <header className="z-40 shrink-0 border-b border-border/80 bg-background/95 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mx-auto grid min-h-[68px] max-w-[1800px] grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonBlock className="h-8 w-32 rounded-md" />
            <div className="min-w-0 border-l border-border pl-3">
              <SkeletonBlock className="h-3 w-24 rounded-full" />
              <SkeletonBlock className="mt-2 h-4 w-40 rounded-full" />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <SkeletonBlock className="h-8 w-28 rounded-lg" />
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <SkeletonBlock className="h-9 w-9 rounded-xl" />
            <SkeletonBlock className="h-9 w-9 rounded-xl" />
            {!isWriting ? <SkeletonBlock className="h-9 w-28 rounded-xl" /> : <SkeletonBlock className="h-9 w-36 rounded-xl" />}
          </div>
        </div>
      </header>

      <main className={cn("relative mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 overflow-hidden", isWriting ? "lg:grid-cols-[minmax(320px,43%)_minmax(0,57%)]" : "lg:grid-cols-[minmax(320px,52%)_minmax(0,48%)]")}>
        <section className="min-h-0 overflow-hidden border-b border-border/80 bg-background lg:border-b-0 lg:border-r">
          <div className="h-full min-h-0 overflow-hidden px-5 py-5 lg:px-8">
            {kind === "listening" ? (
              <SkeletonCard className="mb-5 h-24 rounded-[1.4rem]" />
            ) : null}
            <div className="space-y-5">
              <SkeletonBlock className="h-8 w-72 max-w-full rounded-lg" />
              <SkeletonBlock className="h-4 w-[min(42rem,84vw)] rounded-full" />
              {isWriting ? (
                <>
                  <SkeletonCard className="h-40 rounded-lg" />
                  <SkeletonCard className="h-[32rem] rounded-lg" />
                </>
              ) : (
                Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <SkeletonBlock className="h-4 w-full rounded-full" />
                    <SkeletonBlock className="h-4 w-[92%] rounded-full" />
                    <SkeletonBlock className="h-4 w-[86%] rounded-full" />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="min-h-0 overflow-hidden bg-muted/10">
          <div className="h-full min-h-0 overflow-hidden px-4 py-5 lg:px-6 lg:py-6">
            <div className="space-y-8">
              {isWriting ? (
                <>
                  <div className="flex items-center justify-between">
                    <SkeletonBlock className="h-5 w-32 rounded-full" />
                    <SkeletonBlock className="h-5 w-24 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-[34rem] w-full rounded-lg" />
                </>
              ) : (
                Array.from({ length: 3 }).map((_, groupIndex) => (
                  <div key={groupIndex} className="space-y-5">
                    <div className="border-l-2 border-primary/50 pl-3">
                      <SkeletonBlock className="h-5 w-40 rounded-md" />
                      <SkeletonLineStack className="mt-3" widths={["w-full", "w-5/6"]} />
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem] md:items-center">
                          <SkeletonBlock className="h-5 w-full rounded-md" />
                          <SkeletonBlock className="h-10 w-full rounded-xl" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function AnalyticsSkeleton({ variant = "overview" }: { variant?: "overview" | "skill" } = {}) {
  if (variant === "skill") {
    return (
      <div className="analytics-night space-y-5 pb-10 text-[#0F172A]">
        <main className="space-y-5">
          <SkeletonBlock className="h-5 w-36 rounded-full" />

          <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <SkeletonBlock className="h-16 w-16 shrink-0 rounded-[14px]" />
              <div className="space-y-3">
                <SkeletonBlock className="h-9 w-72 max-w-full rounded-lg" />
                <SkeletonBlock className="h-5 w-[min(34rem,82vw)] rounded-full" />
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
            <SkeletonCard className="rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <div className="grid h-full gap-5 md:grid-cols-[150px_minmax(0,1fr)]">
                <div>
                  <SkeletonBlock className="h-4 w-28 rounded-full" />
                  <SkeletonBlock className="mt-4 h-14 w-24 rounded-lg" />
                  <SkeletonBlock className="mt-4 h-7 w-28 rounded-full" />
                  <SkeletonBlock className="mt-3 h-4 w-36 rounded-full" />
                </div>
                <div className="flex h-[150px] items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  {[68, 86, 58, 96, 72, 104, 80].map((height, index) => (
                    <SkeletonBlock key={index} className="flex-1 rounded-t-lg" style={{ height }} />
                  ))}
                </div>
              </div>
            </SkeletonCard>

            <SkeletonCard className="min-h-[190px] overflow-hidden rounded-[18px] border-[#E5E7EB] bg-white p-0 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <div className="grid h-full sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={cn("p-5", index > 0 && "border-t border-slate-100 sm:border-l sm:border-t-0")}>
                    <SkeletonBlock className="h-10 w-10 rounded-xl" />
                    <SkeletonBlock className="mt-4 h-3 w-28 rounded-full" />
                    <SkeletonBlock className="mt-3 h-7 w-20 rounded-lg" />
                    <SkeletonBlock className="mt-2 h-3 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
            <SkeletonCard className="rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <SkeletonBlock className="h-5 w-40 rounded-md" />
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {Array.from({ length: 2 }).map((_, cardIndex) => (
                  <div key={cardIndex} className="rounded-2xl bg-slate-50 p-4">
                    <SkeletonBlock className="h-5 w-28 rounded-md" />
                    <div className="mt-5 space-y-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index}>
                          <SkeletonBlock className="h-4 w-40 max-w-full rounded-md" />
                          <SkeletonBlock className="mt-2 h-2 w-full rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SkeletonCard>

            <SkeletonCard className="rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <SkeletonBlock className="h-5 w-40 rounded-md" />
              <div className="mt-4 flex h-[310px] items-end gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                {[72, 118, 92, 134, 98, 150, 126].map((height, index) => (
                  <SkeletonBlock key={index} className="flex-1 rounded-t-lg" style={{ height }} />
                ))}
              </div>
              <div className="mt-3 flex justify-center gap-5">
                <SkeletonBlock className="h-3 w-24 rounded-full" />
                <SkeletonBlock className="h-3 w-24 rounded-full" />
              </div>
            </SkeletonCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
            <SkeletonCard className="overflow-hidden rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
              <SkeletonBlock className="h-5 w-48 rounded-md" />
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.75fr)_96px] gap-6 bg-slate-50 px-5 py-3.5">
                  <SkeletonBlock className="h-3 w-24 rounded-full" />
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                  <SkeletonBlock className="h-3 w-16 justify-self-end rounded-full" />
                </div>
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.75fr)_96px] items-center gap-6 px-5 py-5">
                      <SkeletonBlock className="h-4 w-44 max-w-full rounded-md" />
                      <div className="flex items-center gap-4">
                        <SkeletonBlock className="h-4 w-12 rounded-md" />
                        <SkeletonBlock className="h-2.5 flex-1 rounded-full" />
                      </div>
                      <SkeletonBlock className="h-4 w-10 justify-self-end rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </SkeletonCard>

            <div className="grid gap-4">
              {Array.from({ length: 2 }).map((_, cardIndex) => (
                <SkeletonCard key={cardIndex} className="rounded-[18px] border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.45)]">
                  <SkeletonBlock className="h-5 w-44 rounded-md" />
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                        <SkeletonBlock className="h-9 w-9 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <SkeletonBlock className="h-4 w-40 max-w-full rounded-md" />
                          <SkeletonBlock className="h-3 w-52 max-w-full rounded-full" />
                        </div>
                        <SkeletonBlock className="h-4 w-16 rounded-md" />
                      </div>
                    ))}
                  </div>
                </SkeletonCard>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="analytics-night analytics-overview -mx-1 space-y-5 bg-[#F8FAFC] pb-10 text-slate-950 sm:mx-0">
      <div>
        <SkeletonBlock className="h-9 w-72 max-w-full rounded-lg" />
        <SkeletonBlock className="mt-3 h-5 w-[min(34rem,86vw)] rounded-full" />
      </div>

      <SkeletonCard className="overflow-hidden rounded-[1.125rem] border-slate-200 bg-white p-0 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.42)]">
        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={cn("relative min-h-[150px] p-5", index > 0 && "border-t border-slate-100 sm:border-l sm:border-t-0")}>
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-xl" />
                <SkeletonBlock className="h-4 w-28 rounded-md" />
              </div>
              <div className="ml-[52px] mt-3 space-y-3">
                <SkeletonBlock className="h-8 w-24 rounded-lg" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <SkeletonBlock className="h-4 w-20 rounded-md" />
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SkeletonCard className="rounded-[1.125rem] border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <SkeletonBlock className="h-6 w-44 rounded-md" />
          <SkeletonBlock className="mt-2 h-4 w-72 max-w-full rounded-full" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex min-h-[258px] flex-col justify-between rounded-[1.1rem] border border-slate-100 bg-white p-3.5 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-9 w-9 rounded-xl" />
                    <SkeletonBlock className="h-5 w-24 rounded-md" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-9 w-14 rounded-lg" />
                    <SkeletonBlock className="h-6 w-24 rounded-full" />
                  </div>
                  <div className="flex h-11 items-end gap-2">
                    {[18, 28, 22, 34, 30].map((height, barIndex) => (
                      <SkeletonBlock key={barIndex} className="flex-1 rounded-t-md" style={{ height }} />
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <SkeletonLineStack widths={["w-16", "w-10"]} />
                    <SkeletonLineStack widths={["w-14", "w-8"]} />
                  </div>
                </div>
                <SkeletonBlock className="mt-2 h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard className="rounded-[1.125rem] border-slate-200 bg-white p-0 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <div className="p-5 pb-0">
            <SkeletonBlock className="h-6 w-40 rounded-md" />
            <SkeletonBlock className="mt-2 h-4 w-28 rounded-full" />
          </div>
          <div className="mx-[5px] mb-5 mt-4 flex h-[306px] items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/60">
            <SkeletonBlock className="h-56 w-56 rounded-full" />
          </div>
        </SkeletonCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
        <SkeletonCard className="rounded-[1.125rem] border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <SkeletonBlock className="h-6 w-40 rounded-md" />
            <SkeletonBlock className="h-9 w-28 rounded-xl" />
          </div>
          <div className="mt-4 flex h-[286px] items-end gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
            {[68, 110, 92, 132, 98, 150, 126, 166].map((height, index) => (
              <SkeletonBlock key={index} className="flex-1 rounded-t-lg" style={{ height }} />
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard className="rounded-[1.125rem] border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between gap-3">
            <SkeletonBlock className="h-6 w-36 rounded-md" />
            <SkeletonBlock className="h-4 w-16 rounded-full" />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 space-y-2">
                    <SkeletonBlock className="h-4 w-36 max-w-full rounded-md" />
                    <SkeletonBlock className="h-3 w-24 rounded-full" />
                  </div>
                </div>
                <div className="shrink-0 space-y-2 text-right">
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                  <SkeletonBlock className="h-3 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}
function AchievementsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-44 rounded-lg" />
        <SkeletonBlock className="h-4 w-[min(42rem,90vw)] rounded-full" />
      </div>
      <SkeletonCard className="rounded-[18px] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
            <SkeletonBlock className="h-[76px] w-[70px] shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-3 w-28 rounded-full" />
              <div className="mt-2 max-w-[360px]">
                <div className="flex items-end justify-between gap-4">
                  <SkeletonBlock className="h-8 w-28 rounded-lg" />
                  <div className="space-y-2">
                    <SkeletonBlock className="h-5 w-20 rounded-md" />
                    <SkeletonBlock className="h-3 w-24 rounded-full" />
                  </div>
                </div>
                <SkeletonBlock className="mt-3 h-3 w-full rounded-full" />
              </div>
            </div>
          </div>
          <div className="hidden h-[60px] w-px shrink-0 bg-border/60 lg:block" />
          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center xl:gap-8">
            <div className="flex items-center gap-3 rounded-2xl border border-border/45 p-4 xl:border-0 xl:p-0">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <SkeletonLineStack widths={["w-24", "w-28"]} />
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/45 p-4 xl:border-0 xl:p-0">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <SkeletonLineStack widths={["w-10", "w-32"]} />
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-border/45 p-4 sm:col-span-2 xl:border-0 xl:p-0">
              <SkeletonBlock className="h-[76px] w-[96px] rounded-2xl" />
              <SkeletonLineStack widths={["w-28", "w-36"]} />
            </div>
          </div>
        </div>
      </SkeletonCard>
      {["w-44", "w-48", "w-40"].map((titleWidth, rowIndex) => (
        <section key={rowIndex} className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <SkeletonBlock className={cn("h-6 rounded-lg", titleWidth)} />
            <div className="flex gap-2">
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
            </div>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonCard key={index} className="w-[200px] flex-none rounded-2xl p-3">
                <SkeletonBlock className="mx-auto h-16 w-28 rounded-2xl" />
                <SkeletonBlock className="mx-auto mt-4 h-4 w-32 rounded-md" />
                <SkeletonLineStack className="mt-3" widths={["w-full", "w-3/4"]} />
                <SkeletonBlock className="mt-5 h-8 w-full rounded-md" />
              </SkeletonCard>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ReservedSectionSkeleton({ variant = "generic" }: { variant?: "generic" | "speaking" | "articles" } = {}) {
  const isArticles = variant === "articles";
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-6 w-36 rounded-full" />
          <SkeletonBlock className="h-4 w-4 rounded-md" />
        </div>
        <SkeletonBlock className="h-8 w-36 rounded-lg" />
        <SkeletonBlock className="h-4 w-[min(36rem,88vw)] rounded-full" />
      </div>
      <SkeletonCard className="rounded-3xl p-6">
        <SkeletonBlock className="h-11 w-11 rounded-2xl" />
        <SkeletonBlock className="mt-4 h-6 w-40 rounded-lg" />
        <SkeletonLineStack
          className="mt-4"
          lines={isArticles ? 2 : 3}
          widths={isArticles ? ["w-full", "w-2/3"] : ["w-full", "w-5/6", "w-2/3"]}
        />
        {isArticles ? null : (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <SkeletonBlock className="h-10 w-full rounded-xl sm:w-44" />
            <SkeletonBlock className="h-10 w-full rounded-xl sm:w-36" />
          </div>
        )}
      </SkeletonCard>
    </div>
  );
}

function AdminPanelSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeadingSkeleton compact />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <SkeletonCard className="h-72 rounded-2xl" />
    </div>
  );
}

function LoginOverlaySkeleton() {
  return (
    <SkeletonCard className="w-full max-w-sm space-y-5 rounded-3xl p-6">
      <div className="mx-auto space-y-3 text-center">
        <SkeletonBlock className="mx-auto h-12 w-12 rounded-2xl" />
        <SkeletonBlock className="mx-auto h-6 w-44 rounded-lg" />
        <SkeletonBlock className="mx-auto h-3 w-56 rounded-full" />
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-12 w-full rounded-xl" />
        <SkeletonBlock className="h-12 w-full rounded-xl" />
      </div>
      <SkeletonBlock className="h-11 w-full rounded-xl" />
    </SkeletonCard>
  );
}

function MarketingSkeleton({ variant = "landing" }: { variant?: "landing" | "pricing" | "reviews" | "seo" }) {
  if (variant === "pricing") {
    return (
      <div className="relative mx-auto w-full max-w-7xl space-y-16">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-8">
            <SkeletonBlock className="h-8 w-56 rounded-full" />
            <div className="space-y-4">
              <SkeletonBlock className="h-12 w-[min(34rem,90vw)] rounded-lg" />
              <SkeletonBlock className="h-12 w-[min(26rem,76vw)] rounded-lg" />
              <SkeletonLineStack widths={["w-[min(32rem,84vw)]", "w-[min(24rem,72vw)]"]} />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <SkeletonBlock className="h-14 w-full rounded-2xl sm:w-40" />
              <SkeletonBlock className="h-14 w-full rounded-2xl sm:w-44" />
            </div>
          </div>
          <div className="flex w-full flex-col gap-4">
            <SkeletonCard className="h-36 rounded-[2rem]" />
            <SkeletonCard className="h-36 rounded-[2rem]" />
            <SkeletonCard className="h-36 rounded-[2rem]" />
          </div>
        </section>
        <section className="space-y-8 border-t border-border/30 pt-16">
          <SkeletonBlock className="h-8 w-44 rounded-full" />
          <SkeletonBlock className="h-12 w-[min(42rem,90vw)] rounded-lg" />
          <div className="grid gap-5 md:grid-cols-3">
            <SkeletonCard className="h-96 rounded-[2rem]" />
            <SkeletonCard className="h-96 rounded-[2rem]" />
            <SkeletonCard className="h-96 rounded-[2rem]" />
          </div>
        </section>
      </div>
    );
  }

  if (variant === "reviews") {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <PageHeadingSkeleton action />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <SkeletonCard key={index} className="min-h-[12rem] rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-11 w-11 rounded-full" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-32 rounded-md" />
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                </div>
              </div>
              <SkeletonLineStack className="mt-5" lines={3} widths={["w-full", "w-11/12", "w-3/4"]} />
            </SkeletonCard>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "seo") {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-5">
            <SkeletonBlock className="h-7 w-44 rounded-full" />
            <SkeletonBlock className="h-12 w-[min(36rem,88vw)] rounded-lg" />
            <SkeletonBlock className="h-12 w-[min(28rem,76vw)] rounded-lg" />
            <SkeletonLineStack widths={["w-[min(36rem,88vw)]", "w-[min(30rem,80vw)]"]} />
            <div className="flex gap-3">
              <SkeletonBlock className="h-12 w-36 rounded-xl" />
              <SkeletonBlock className="h-12 w-32 rounded-xl" />
            </div>
          </div>
          <SkeletonBlock className="h-80 w-full rounded-[2rem]" />
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard className="h-44 rounded-2xl" />
          <SkeletonCard className="h-44 rounded-2xl" />
          <SkeletonCard className="h-44 rounded-2xl" />
        </div>
      </div>
    );
  }

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

        <div className={cn("grid gap-3", isOverlay ? "grid-cols-1" : "grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]")}>
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

function skeletonForPath(
  pathname: string,
  isOverlay: boolean,
  searchParams: { get(name: string): string | null } | null
) {
  if (isOverlay) {
    if (pathname.startsWith("/login") || pathname.startsWith("/telegram")) {
      return <LoginOverlaySkeleton />;
    }
    return <GenericSkeleton isOverlay />;
  }

  if (pathname.startsWith("/exam-preview/writing")) {
    return <ExamWorkspaceSkeleton kind="writing" />;
  }
  if (pathname.startsWith("/exam-preview/listening")) {
    return <ExamWorkspaceSkeleton kind="listening" />;
  }
  if (pathname.startsWith("/exam-preview/reading")) {
    return <ExamWorkspaceSkeleton kind="reading" />;
  }

  if (pathname.match(/^\/tests\/[^/]+\/start\/?$/)) {
    return <TestStartSkeleton />;
  }
  if (pathname.match(/^\/tests\/[^/]+\/?$/)) {
    return <TestDetailSkeleton />;
  }
  if (pathname.startsWith("/tests")) {
    const requestedType = searchParams?.get("type");
    if (requestedType === "listening") {
      return <ListeningTestsSkeleton />;
    }
    const readingView = searchParams?.get("type") === "reading"
      || Boolean(searchParams?.get("source"))
      || Boolean(searchParams?.get("format"))
      || Boolean(searchParams?.get("access"))
      || Boolean(searchParams?.get("sort"));
    return readingView ? <ReadingTestsSkeleton /> : <TestsOverviewSkeleton />;
  }

  if (pathname.match(/^\/attempts\/[^/]+\/result\/?$/)) {
    return <AttemptResultSkeleton />;
  }
  if (pathname.match(/^\/attempts\/[^/]+\/review\/?$/)) {
    return <AttemptReviewSkeleton />;
  }
  if (pathname.match(/^\/attempts\/[^/]+\/reading\/?$/)) {
    return <ExamWorkspaceSkeleton kind="reading" />;
  }
  if (pathname.match(/^\/attempts\/[^/]+\/listening\/?$/)) {
    return <ExamWorkspaceSkeleton kind="listening" />;
  }
  if (pathname.startsWith("/attempts")) {
    return <RedirectSkeleton />;
  }

  if (pathname.startsWith("/dashboard")) {
    return <DashboardSkeleton />;
  }
  if (pathname.match(/^\/analytics\/(reading|listening|writing|speaking)\/?$/)) {
    return <AnalyticsSkeleton variant="skill" />;
  }
  if (pathname.startsWith("/analytics")) {
    return <AnalyticsSkeleton />;
  }
  if (pathname.startsWith("/history")) {
    return <HistorySkeleton />;
  }
  if (pathname.startsWith("/bookmarks")) {
    return <BookmarksSkeleton />;
  }
  if (pathname.startsWith("/leaderboard")) {
    return <LeaderboardSkeleton />;
  }
  if (pathname.startsWith("/achievements") || pathname.startsWith("/rewards")) {
    return <AchievementsSkeleton />;
  }
  if (pathname.startsWith("/subscription")) {
    return <SubscriptionSkeleton />;
  }
  if (pathname.startsWith("/writing/submissions")) {
    return <WritingResultSkeleton />;
  }
  if (pathname.startsWith("/writing/history")) {
    return <WritingHistorySkeleton />;
  }
  if (pathname.match(/^\/writing\/tasks\/[^/]+\/?$/)) {
    return <RedirectSkeleton />;
  }
  if (pathname.startsWith("/writing/tasks")) {
    return <WritingTasksSkeleton />;
  }
  if (pathname.startsWith("/writing")) {
    return <WritingSkeleton />;
  }
  if (pathname.startsWith("/speaking")) {
    return <ReservedSectionSkeleton variant="speaking" />;
  }
  if (pathname.startsWith("/articles")) {
    return <ReservedSectionSkeleton variant="articles" />;
  }
  if (pathname.startsWith("/settings")) {
    return <SettingsSkeleton />;
  }
  if (pathname.startsWith("/admin")) {
    return <AdminPanelSkeleton />;
  }
  if (pathname.startsWith("/login") || pathname.startsWith("/telegram")) {
    return <LoginOverlaySkeleton />;
  }
  if (pathname === "/") {
    return <MarketingSkeleton />;
  }
  return <GenericSkeleton isOverlay={false} />;
}

function resolveLoadingSection(pathname: string): FrontendLoadingSection {
  if (pathname.startsWith("/exam-preview")) {
    return "exam";
  }

  if (
    pathname.startsWith("/dashboard")
    || pathname.startsWith("/tests")
    || pathname.startsWith("/attempts")
    || pathname.startsWith("/history")
    || pathname.startsWith("/bookmarks")
    || pathname.startsWith("/leaderboard")
    || pathname.startsWith("/achievements")
    || pathname.startsWith("/rewards")
    || pathname.startsWith("/analytics")
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

export function ExamRouteLoadingFrame({ className }: RouteLoadingFrameProps) {
  return (
    <div className={cn("fixed inset-0 z-[130] bg-background", className)}>
      <AppLoadingPlaceholder className="h-full min-h-dvh items-stretch justify-start px-0 py-0" />
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

  if (section === "exam") {
    return <ExamRouteLoadingFrame className={className} />;
  }

  return <GenericRouteLoadingFrame className={className} />;
}

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
