"use client";
import type { WritingTaskFormScope } from "./controller";
import { CheckCircle2 } from "../dependencies";

export function WritingTaskFormSection4({ scope }: { scope: WritingTaskFormScope }) {
  const { successMsg } = scope;
  return (
    {successMsg ? (
            <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/8 px-4 py-3 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
              <p className="opacity-90">{successMsg}</p>
            </div>
          ) : null}
  );
}
