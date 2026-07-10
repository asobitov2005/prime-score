"use client";
import type { WritingTasksPageScope } from "./controller";
import { AlertCircle } from "../dependencies";

export function WritingTasksPageSection5({ scope }: { scope: WritingTasksPageScope }) {
  const { error } = scope;
  return (
    {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 text-danger shrink-0" />
              <div>
                <p className="font-semibold text-danger">Failed to load</p>
                <p className="opacity-90">{error}</p>
              </div>
            </div>
          ) : null}
  );
}
