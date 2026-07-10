"use client";
import type { EditorPreviewSectionScope } from "./controller";
import { cn } from "../dependencies";
import { renderBraceBoldText, shouldRenderSectionTitle } from "../shared";

export function EditorPreviewSectionSection2({ scope }: { scope: EditorPreviewSectionScope }) {
  const { compact, draftType, logicalIndex, showSectionIntro, intro, previewId, section } = scope;
  return (
    <div className={cn(compact ? "space-y-1.5" : "space-y-2")}>
            <p className={cn("font-bold text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
              {draftType === "reading" ? `Reading Passage ${logicalIndex + 1}` : `Listening Section ${logicalIndex + 1}`}
            </p>
            {showSectionIntro ? (
              <p className={cn("border-l-2 border-primary/40 pl-3 py-0.5 font-medium italic text-muted-foreground", compact ? "text-[12px] leading-[1.45]" : "text-[13px] leading-[1.55]")}>
                {renderBraceBoldText(intro, `${previewId}-${section.id}-intro`)}
              </p>
            ) : null}
            {shouldRenderSectionTitle(draftType, section.title) ? (
              <p className={cn("text-center font-black tracking-tight text-foreground", compact ? "pt-1 text-[19px]" : "pt-1.5 text-[22px]")}>
                {renderBraceBoldText(section.title, `${previewId}-${section.id}-title`)}
              </p>
            ) : null}
          </div>
  );
}
