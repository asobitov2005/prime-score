"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpenText, Headphones } from "lucide-react";
import type { LandingFeaturedTest } from "@/components/marketing/landing-types";
import { cn } from "@/lib/utils";

const tabs = ["All", "Reading", "Listening"] as const;

function getDisplayedTests(activeTab: string, sourceTests: LandingFeaturedTest[]) {
  if (activeTab !== "All") {
    return sourceTests.filter((test) => test.type.toLowerCase() === activeTab.toLowerCase()).slice(0, 4);
  }

  const readingTests = sourceTests.filter((test) => test.type === "reading").slice(0, 2);
  const listeningTests = sourceTests.filter((test) => test.type === "listening").slice(0, 2);

  return [...readingTests, ...listeningTests].slice(0, 4);
}

function LandingTestsEmptyState({ activeTab }: { activeTab: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 bg-muted/15 px-5 py-7 text-center shadow-none">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-background/70 text-muted-foreground shadow-inner">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-foreground">
        {activeTab === "All" ? "No tests found" : `No ${activeTab.toLowerCase()} tests found`}
      </p>
      <p className="mt-1 max-w-xs text-xs font-medium leading-relaxed text-muted-foreground">
        Published IELTS tests will appear here as soon as they are available.
      </p>
    </div>
  );
}

export function LandingFeaturedTests({ initialTests }: { initialTests: LandingFeaturedTest[] }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("All");
  const displayedTests = getDisplayedTests(activeTab, initialTests);

  return (
    <>
      <div className="bg-muted/30 p-1.5 rounded-[1.25rem] flex items-center justify-between overflow-x-auto no-scrollbar border border-border/10 shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-4 py-2.5 text-[13px] md:text-[14px] font-medium rounded-xl transition-[background-color,color,box-shadow,border-color,transform] duration-200 whitespace-nowrap",
              activeTab === tab
                ? "bg-background text-foreground shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12)] border border-border/50 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {displayedTests.length > 0 ? (
          displayedTests.map((test) => {
            const isReading = test.type === "reading";
            const isListening = test.type === "listening";

            const cardBg = isReading ? "bg-orange-50/50 dark:bg-orange-950/10" : isListening ? "bg-blue-50/50 dark:bg-blue-950/10" : "bg-purple-50/50 dark:bg-purple-950/10";
            const cardBorder = isReading ? "border-orange-100 dark:border-orange-900/30" : isListening ? "border-blue-100 dark:border-blue-900/30" : "border-purple-100 dark:border-purple-900/30";
            const iconBgColor = isReading ? "bg-orange-100 dark:bg-orange-900/40" : isListening ? "bg-blue-100 dark:bg-blue-900/40" : "bg-purple-100 dark:bg-purple-900/40";
            const iconColor = isReading ? "text-[#e86c27] dark:text-orange-400" : isListening ? "text-[#2e7ddb] dark:text-blue-400" : "text-[#7c5cdb] dark:text-purple-400";
            const badgeBg = test.isPremiumLocked ? "bg-orange-100 dark:bg-orange-900/40" : "bg-emerald-100 dark:bg-emerald-900/40";
            const badgeText = test.isPremiumLocked ? "text-[#c25010] dark:text-orange-400" : "text-[#059669] dark:text-emerald-400";
            const badgeLabel = test.isPremiumLocked ? "Pro" : "Free";

            return (
              <Link
                key={test.id}
                href={`/tests/${test.slug}`}
                className={cn(
                  "group relative overflow-hidden flex items-center justify-between gap-4 p-3 md:p-4 rounded-2xl border transition-[background-color,border-color,box-shadow,transform] duration-150 hover:scale-[1.01] hover:shadow-md cursor-pointer",
                  cardBg,
                  cardBorder,
                )}
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className={cn("flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 relative z-10", iconBgColor, iconColor)}>
                    {isReading ? (
                      <BookOpenText className="h-5 w-5 md:h-6 md:w-6" />
                    ) : isListening ? (
                      <Headphones className="h-5 w-5 md:h-6 md:w-6" />
                    ) : (
                      <span className="font-serif font-semibold text-base md:text-lg">W</span>
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 relative z-10">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[14px] md:text-[15px] text-foreground leading-tight truncate">{test.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] md:text-[12px] font-medium text-muted-foreground/80">
                      <span className="uppercase tracking-wider font-medium">{test.source.replace("Official", "").trim()}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span>{test.questionCount} questions</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span>{test.estimatedMinutes} min</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pl-1">
                  <span className={cn("hidden sm:flex px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm", badgeBg, badgeText)}>
                    {badgeLabel}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center text-[#0a1b3f] dark:text-foreground/80 transition-[color,transform] duration-200 group-hover:scale-125 group-hover:text-[#d94b04] dark:group-hover:text-primary">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-sm" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path
                        d="M18.4452 11.0253C19.1837 11.4554 19.1837 12.5446 18.4452 12.9747L7.66492 19.2598C6.9264 19.6899 6 19.1504 6 18.2851L6 5.71493C6 4.8496 6.9264 4.31012 7.66492 4.74021L18.4452 11.0253Z"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <LandingTestsEmptyState activeTab={activeTab} />
        )}
      </div>
    </>
  );
}
