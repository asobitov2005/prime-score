"use client";
import type { WritingAnalyticsContentScope } from "./controller";
import { ArrowLeft, Link } from "../dependencies";

export function WritingAnalyticsContentSection3({ scope }: { scope: WritingAnalyticsContentScope }) {
  return (
    <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-violet-600">
              <ArrowLeft className="h-4 w-4 text-violet-600" />
              Back to Analytics
            </Link>
  );
}
