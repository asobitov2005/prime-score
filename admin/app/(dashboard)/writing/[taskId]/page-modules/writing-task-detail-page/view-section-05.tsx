"use client";
import type { WritingTaskDetailPageScope } from "./controller";
import { CheckCircle2 } from "../dependencies";

export function WritingTaskDetailPageSection5({ scope }: { scope: WritingTaskDetailPageScope }) {
  const { actionSuccess } = scope;
  return (
    {actionSuccess ? (
            <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/8 px-4 py-3 text-sm">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
              <p>{actionSuccess}</p>
            </div>
          ) : null}
  );
}
