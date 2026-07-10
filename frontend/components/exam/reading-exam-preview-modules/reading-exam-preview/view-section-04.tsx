"use client";
import type { ReadingExamPreviewScope } from "./controller";

export function ReadingExamPreviewSection4({ scope }: { scope: ReadingExamPreviewScope }) {
  const { isCalculatingResults } = scope;
  return (
    {isCalculatingResults ? (
                <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-xs rounded-[1.5rem] border border-border/80 bg-card px-6 py-5 text-center shadow-[0_40px_120px_-30px_rgba(15,23,42,0.55)]">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground/80" />
                    <p className="text-sm font-semibold text-foreground">Calculating your results…</p>
                  </div>
                </div>
              ) : null}
  );
}
