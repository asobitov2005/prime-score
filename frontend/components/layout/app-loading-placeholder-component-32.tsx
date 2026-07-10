"use client";

import { cn } from "./app-loading-placeholder-dependencies";
import { SkeletonBlock } from "./app-loading-placeholder-component-05";
import { SkeletonCard } from "./app-loading-placeholder-component-06";
import { SkeletonLineStack } from "./app-loading-placeholder-component-07";

export function ExamWorkspaceSkeleton({ kind }: { kind: "reading" | "listening" | "writing" }) {
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
