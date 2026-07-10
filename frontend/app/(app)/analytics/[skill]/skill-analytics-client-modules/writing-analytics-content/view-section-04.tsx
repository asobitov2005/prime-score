"use client";
import type { WritingAnalyticsContentScope } from "./controller";
import { PencilLine } from "../dependencies";

export function WritingAnalyticsContentSection4({ scope }: { scope: WritingAnalyticsContentScope }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-violet-100 bg-violet-50 text-violet-600">
                  <PencilLine className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Writing Analytics</h1>
                  <p className="mt-2 text-sm font-medium text-[#64748B] sm:text-base">
                    Track your Writing performance and find areas to improve
                  </p>
                </div>
              </div>
            </header>
  );
}
