"use client";
import type { ContentPanelScope } from "./controller";
import { Card, CardContent, CardHeader } from "../dependencies";
import { EditorUserPreview } from "../shared";

export function ContentPanelPreviewColumn({ scope }: { scope: ContentPanelScope }) {
  const { draft, resolveLogicalIndex, getIeltsIntroStr } = scope;
  return (
    <div className="space-y-6">
            <h3 className="text-xl font-bold">User View Simulator</h3>
            <Card className="h-fit sticky top-6 border-border shadow-md overflow-hidden">
              <CardHeader className="bg-muted py-3 px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-red-400"></div>
                     <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                     <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preview</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-12 max-h-[75vh] overflow-y-auto pt-8 px-6 pb-16">
                <EditorUserPreview
                  draft={draft}
                  previewId="content"
                  resolveLogicalIndex={resolveLogicalIndex}
                  getIeltsIntroStr={getIeltsIntroStr}
                  compact
                  showSectionIntro
                />
              </CardContent>
            </Card>
          </div>
  );
}
