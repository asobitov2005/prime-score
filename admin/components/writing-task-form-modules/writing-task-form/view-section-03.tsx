"use client";
import type { WritingTaskFormScope } from "./controller";
import { AlertCircle } from "../dependencies";

export function WritingTaskFormSection3({ scope }: { scope: WritingTaskFormScope }) {
  const { submitError } = scope;
  return (
    {submitError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 text-danger shrink-0" />
              <div>
                <p className="font-semibold text-danger">Something went wrong</p>
                <p className="opacity-90">{submitError}</p>
              </div>
            </div>
          ) : null}
  );
}
