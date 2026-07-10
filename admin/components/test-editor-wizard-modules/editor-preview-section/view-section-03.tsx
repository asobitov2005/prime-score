"use client";
import type { EditorPreviewSectionScope } from "./controller";
import { cn } from "../dependencies";
import { renderBraceBoldText } from "../shared";

export function EditorPreviewSectionSection3({ scope }: { scope: EditorPreviewSectionScope }) {
  const { compact, draftType, renderListeningTranscriptPreview, paragraphs, section, previewId, matchingHeadingLabels, matchingHeadingExamples } = scope;
  return (
    <div className={cn(compact ? "space-y-4" : "space-y-5")}>
            {draftType === "listening" ? renderListeningTranscriptPreview() : null}
            {draftType !== "listening" && paragraphs.length > 0 ? (
              paragraphs.map((paragraph, paragraphIndex) => {
                const paragraphId = paragraph.label || `block-${paragraphIndex}`;
    
                return (
                  <div
                    key={`${section.id}-${paragraphIndex}`}
                    id={`${previewId}-${section.id}-paragraph-${paragraphId}`}
                    className="space-y-2"
                  >
                    {paragraph.label ? (
                      <div className={cn("flex items-center justify-center rounded border bg-muted font-bold text-primary", compact ? "h-5 w-5 text-[11px]" : "h-6 w-6 text-[12px]")}>
                        {paragraph.label}
                      </div>
                    ) : null}
                    {paragraph.label && matchingHeadingLabels.has(paragraph.label) ? (
                      <div className={cn("flex items-center rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3.5 font-semibold text-muted-foreground", compact ? "min-h-[32px] text-[11px]" : "min-h-[38px] text-[13px]")}>
                        Drop heading here
                      </div>
                    ) : null}
                    {paragraph.label && matchingHeadingExamples.has(paragraph.label) ? (
                      <div className={cn("flex items-center rounded-xl border border-success/30 bg-success/5 px-3.5 font-semibold text-foreground", compact ? "min-h-[32px] text-[11px]" : "min-h-[38px] text-[13px]")}>
                        {matchingHeadingExamples.get(paragraph.label)}
                      </div>
                    ) : null}
                    <p
                      className={cn(
                        "whitespace-pre-wrap font-sans text-foreground",
                        compact ? "text-[13px] leading-[1.4]" : "text-[14px] leading-[1.45]",
                        paragraph.center && "text-center",
                        paragraph.italic && "italic",
                        paragraph.bold && "font-bold"
                      )}
                    >
                      {renderBraceBoldText(paragraph.text, `${previewId}-${section.id}-paragraph-${paragraphIndex}`)}
                    </p>
                  </div>
                );
              })
            ) : null}
          </div>
  );
}
