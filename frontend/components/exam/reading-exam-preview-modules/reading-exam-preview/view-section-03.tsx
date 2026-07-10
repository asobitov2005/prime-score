"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { Eraser, Highlighter, cn } from "../dependencies";

export function ReadingExamPreviewSection3({ scope }: { scope: ReadingExamPreviewScope }) {
  const { selectionToolbar, applyHighlight, theme, clearHighlight } = scope;
  return (
    {selectionToolbar ? (
                <div
                  data-selection-toolbar
                  className="fixed z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-2 py-1.5 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.7)] backdrop-blur-xl"
                  style={{ top: selectionToolbar.top, left: selectionToolbar.left }}
                >
                  <button
                    type="button"
                    onClick={applyHighlight}
                    title="Highlight selected text"
                    aria-label="Highlight selected text"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition",
                      theme === "dark"
                        ? "bg-[#facc15] text-slate-950 hover:bg-[#fde047]"
                        : "bg-[#fde047] text-slate-900 hover:bg-[#facc15]"
                    )}
                  >
                    <Highlighter className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={clearHighlight}
                    title="Remove highlight"
                    aria-label="Remove highlight"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
                  >
                    <Eraser className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
  );
}
