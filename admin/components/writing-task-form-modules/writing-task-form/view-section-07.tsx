"use client";
import type { WritingTaskFormScope } from "./controller";
import { Card, CardContent, CardHeader, CardTitle, cn } from "../dependencies";

export function WritingTaskFormSection7({ scope }: { scope: WritingTaskFormScope }) {
  const { state, patchState } = scope;
  return (
    <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {(["draft", "published"] as const).map((s) => {
                  const active = state.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => patchState({ status: s })}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left transition-all",
                        active
                          ? s === "published"
                            ? "border-success bg-success/8 ring-1 ring-success/30"
                            : "border-warning bg-warning/8 ring-1 ring-warning/30"
                          : "border-border bg-card hover:bg-muted"
                      )}
                    >
                      <div className="text-sm font-bold text-foreground">
                        {s === "draft" ? "Draft" : "Published"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s === "draft" ? "Not visible to students." : "Visible to students."}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
  );
}
