"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { Button, Lightbulb, ListeningTranscriptPanel, MoveHorizontal, cn } from "../dependencies";
import { parseBinaryInstructionLayout, parsePassageBlockStyle, questionRangeLabelForGroup, sectionKeyForParagraph, softenInstructionText } from "../shared";
import { ReadingExamPreviewSection13 } from "./view-section-13";
import { ReadingExamPreviewSection14 } from "./view-section-14";
import { ReadingExamPreviewSection15 } from "./view-section-15";

export function ReadingExamPreviewSection12({ scope }: { scope: ReadingExamPreviewScope }) {
  const { containerRef, layoutStyle, isSinglePaneListeningMode, theme, readingPaneRef, handlePaneWheel, isAttemptPreview, examData, currentSection, isListeningPreview, isReviewMode, showListeningTranscript, setShowListeningTranscript, currentTranscriptQuestionLocations, showTranscriptAnswerLocations, setShowTranscriptAnswerLocations, listeningAudioRef, currentTranscriptSegments, currentParagraphs, renderFormattedText, renderMatchingHeadingDropArea, bodyFontSize, textBlockRefs, handleTextBlockMouseUp, renderHighlightedText, questionPaneRef, currentQuestionGroups, renderInstructionText, renderDiagramBlock, renderCustomGroupTitle, renderGroupQuestionList, renderOptionBank, optionBankWidthForGroup, splitRatio, startSplitDrag, isDraggingSplit } = scope;
  return (
    <main
                ref={containerRef}
                style={layoutStyle}
                className="relative mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col overflow-hidden lg:flex-row"
              >
                <ReadingExamPreviewSection13 scope={scope} />
    
                <ReadingExamPreviewSection14 scope={scope} />
    
                <ReadingExamPreviewSection15 scope={scope} />
              </main>
  );
}
