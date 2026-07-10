"use client";
import type { WritingTasksPageScope } from "./controller";
import { ChevronLeft, ChevronRight, buttonClassName } from "../dependencies";

export function WritingTasksPageSection7({ scope }: { scope: WritingTasksPageScope }) {
  const { totalPages, page, setPage } = scope;
  return (
    {totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={buttonClassName({ variant: "outline", size: "sm" })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={buttonClassName({ variant: "outline", size: "sm" })}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
  );
}
