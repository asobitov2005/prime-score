"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { ChevronLeft, Link } from "../dependencies";

export function WritingTaskDetailPageSection2({ scope }: { scope: WritingTaskDetailPageScope }) {
  return (
    <Link
            href="/writing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to writing tasks
          </Link>
  );
}
