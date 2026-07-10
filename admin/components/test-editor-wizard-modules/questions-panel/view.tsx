"use client";
import type { QuestionsPanelScope } from "./controller";
import { CSSProperties, Card, CardContent, cn } from "../dependencies";
import { EditorUserPreview } from "../shared";
import { QuestionSectionGroups } from "./question-section-groups";
export function QuestionsPanelView({ scope }: { scope: QuestionsPanelScope }) {
  const { questionsLayoutRef, questionsGridColumns, draft, resolveLogicalIndex, getIeltsIntroStr, editorWidthPercent, dividerViewportLeft, isDraggingPanelSplit, setIsDraggingPanelSplit } = scope;
  return (
    (
        <div className="relative">
          <div
            ref={questionsLayoutRef}
            className="grid gap-4 xl:gap-0 xl:[grid-template-columns:var(--questions-grid-cols)]"
            style={{ "--questions-grid-cols": questionsGridColumns } as CSSProperties}
          >
            <div className="min-w-0 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Questions Inventory</h3>
                <p className="text-sm text-muted-foreground">Manage question groups, then drag them between passages to fix order and numbering.</p>
              </div>
            </div>
    
            <QuestionSectionGroups scope={scope} />
            </div>
    
            <div className="min-w-0 space-y-4">
              <h3 className="text-lg font-bold">Preview</h3>
              <Card className="h-fit min-w-0 sticky top-6 border-border shadow-md overflow-hidden bg-background">
                <CardContent className="space-y-8 max-h-[72vh] overflow-x-hidden overflow-y-auto p-4">
                  <EditorUserPreview
                    draft={draft}
                    previewId="questions"
                    resolveLogicalIndex={resolveLogicalIndex}
                    getIeltsIntroStr={getIeltsIntroStr}
                    showSectionIntro
                  />
                </CardContent>
              </Card>
            </div>
          </div>
    
          <div
            className="pointer-events-none hidden xl:block absolute inset-y-0 z-20"
            style={{ left: `${editorWidthPercent}%` }}
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/80" />
          </div>
    
          {dividerViewportLeft !== null ? (
            <button
              type="button"
              className={cn(
                "hidden xl:flex fixed top-1/2 z-30 h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border border-border bg-background font-mono text-[10px] font-black text-foreground shadow-sm transition",
                isDraggingPanelSplit ? "cursor-ew-resize bg-muted" : "cursor-ew-resize hover:bg-muted"
              )}
              style={{ left: `${dividerViewportLeft}px` }}
              onPointerDown={(event) => {
                event.preventDefault();
                setIsDraggingPanelSplit(true);
              }}
              title="Drag to resize panels"
              aria-label="Drag to resize panels"
            >
              {"<->"}
            </button>
          ) : null}
        </div>
      )
  );
}
