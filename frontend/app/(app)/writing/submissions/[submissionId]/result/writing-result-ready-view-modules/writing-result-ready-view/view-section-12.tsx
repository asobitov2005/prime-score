"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { CATEGORY_STYLE, Card, CardContent, CardHeader, CardTitle, Copy, Sparkles, buildAnnotationTooltip, categoryStyle, cn } from "../dependencies";
import { WritingResultReadyViewSection8 } from "./view-section-08";
import { WritingResultReadyViewSection9 } from "./view-section-12";

export function WritingResultReadyViewSection7({ scope }: { scope: WritingResultReadyViewScope }) {
  const { errorCount, annotatedRef, segments, focusedAnnotationIndex, annotations, setActiveAnnotation, activeAnnotation, activeAnno, activeAnnoSentencePreview, copyText, copiedAnnotation } = scope;
  return (
    <Card className="rounded-3xl border-border/60 bg-card/40 mt-2">
                <WritingResultReadyViewSection8 scope={scope} />
                <WritingResultReadyViewSection9 scope={scope} />
              </Card>
  );
}
