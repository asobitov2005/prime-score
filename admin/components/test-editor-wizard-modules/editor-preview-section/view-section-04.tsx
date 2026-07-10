"use client";
import type { EditorPreviewSectionScope } from "./controller";
import { Badge, cn } from "../dependencies";
import { formatQuestionRange, getMatchingOptionPreview, isBracketCompletionType, isFixedMatchingHeadingExample, isMultipleChoiceMultipleType, previewTypeLabel, questionRangeAtIndex, renderAdminPreviewAnswer, renderBraceBoldText, renderInstructionPreviewText, shouldRenderSectionTitle, totalQuestionSlots } from "../shared";
import { EditorPreviewSectionSection2 } from "./view-section-02";
import { EditorPreviewSectionSection3 } from "./view-section-03";
import { EditorPreviewSectionSection4 } from "./view-section-04";

export function EditorPreviewSectionView1({ scope }: { scope: EditorPreviewSectionScope }) {
  const { compact, draftType, logicalIndex, showSectionIntro, intro, previewId, section, renderListeningTranscriptPreview, paragraphs, matchingHeadingLabels, matchingHeadingExamples, groups, formatPreviewGroupHeading, renderDiagramPreview, optionPanelTitle, renderCompletionPreview, activeQuestionId, setActiveQuestionId, formatPreviewQuestionHeading, navQuestions, scrollToPreviewQuestion } = scope;
  return (
    (
          <div className={cn("overflow-hidden border border-border/70 bg-background/55 shadow-sm", compact ? "space-y-4 rounded-[1.2rem] p-4" : "space-y-6 rounded-[1.5rem] p-5")}>
          <EditorPreviewSectionSection2 scope={scope} />
    
          <EditorPreviewSectionSection3 scope={scope} />
    
          <EditorPreviewSectionSection4 scope={scope} />
        </div>
      )
  );
}
