"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { AlertCircle } from "../dependencies";

export function WritingTaskDetailPageSection4({ scope }: { scope: WritingTaskDetailPageScope }) {
  const { actionError } = scope;
  return (
    {actionError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 text-danger shrink-0" />
              <p>{actionError}</p>
            </div>
          ) : null}
  );
}
