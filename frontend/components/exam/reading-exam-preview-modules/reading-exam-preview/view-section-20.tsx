"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { Badge, Button, Check, CheckCircle2, Eraser, Expand, GripVertical, Highlighter, Lightbulb, ListeningTranscriptPanel, ListeningWaveformPlayer, LogIn, Minus, Moon, MoveHorizontal, Plus, Radio, SendHorizontal, Shrink, SunMedium, cn } from "../dependencies";
import { answeredQuestionWeight, isMcqMultiple, isQuestionFullyAnswered, mcMultipleQuestionWeight, parseBinaryInstructionLayout, parsePassageBlockStyle, questionRangeLabelForGroup, sectionKeyForParagraph, softenInstructionText } from "../shared";
import { ReadingExamPreviewSection2 } from "./view-section-02";
import { ReadingExamPreviewSection3 } from "./view-section-03";
import { ReadingExamPreviewSection4 } from "./view-section-04";
import { ReadingExamPreviewSection5 } from "./view-section-05";
import { ReadingExamPreviewSection6 } from "./view-section-06";
import { ReadingExamPreviewSection7 } from "./view-section-11";
import { ReadingExamPreviewSection12 } from "./view-section-15";
import { ReadingExamPreviewSection16 } from "./view-section-20";

export function ReadingExamPreviewView1({ scope }: { scope: ReadingExamPreviewScope }) {
  const { theme, examToneStyle, draggingHeading, draggingWordBank, dragPreviewPosition, headingOptionLookup, selectionToolbar, applyHighlight, clearHighlight, isCalculatingResults, activeDialog, dismissActiveDialogFromBackdrop, unansweredCount, fullscreenDialogStage, fullscreenExitCountdown, updateActiveDialog, confirmSubmit, setFullscreenDialogStage, confirmFullscreenExit, recoverFullscreen, submitAttempt, confirmLeave, showGuestLoginModal, setShowGuestLoginModal, examData, router, isSinglePaneListeningMode, syncState, candidateName, isStrictListeningExam, strictListeningAudioSection, currentSection, showStrictListeningTransferTimer, startStrictListeningAudio, strictListeningPlaybackBlocked, strictListeningIsPlaying, listeningAudioRef, strictListeningAutoPlayDelayMs, setStrictListeningIsPlaying, setStrictListeningPlaybackBlocked, setStrictListeningPhase, updateStrictListeningTimeSnapshot, handleStrictListeningAudioEnded, isLastMinute, isLastFiveMinutes, strictListeningTimerDisplay, timerDisplay, headerControlClass, updateTheme, isFullscreen, toggleFullscreen, setFontScale, fontScale, isReviewMode, handleSubmit, submitDisabled, isSubmitted, isSubmitting, containerRef, layoutStyle, readingPaneRef, handlePaneWheel, isAttemptPreview, isListeningPreview, showListeningTranscript, setShowListeningTranscript, currentTranscriptQuestionLocations, showTranscriptAnswerLocations, setShowTranscriptAnswerLocations, currentTranscriptSegments, currentParagraphs, renderFormattedText, renderMatchingHeadingDropArea, bodyFontSize, textBlockRefs, handleTextBlockMouseUp, renderHighlightedText, questionPaneRef, currentQuestionGroups, renderInstructionText, renderDiagramBlock, renderCustomGroupTitle, renderGroupQuestionList, renderOptionBank, optionBankWidthForGroup, splitRatio, startSplitDrag, isDraggingSplit, previewSections, answers, selectSection, showPassageQuestionNav, activeQuestionId, navigateToQuestion, currentAnsweredCount, currentTotalQuestions, currentQuestions } = scope;
  return (
    (
            <div
              className={cn(
                "fixed inset-0 flex flex-col overflow-hidden font-sans text-foreground",
                theme === "light" ? "bg-[#FBFCFD]" : "bg-background"
              )}
              style={examToneStyle}
            >
              <ReadingExamPreviewSection2 scope={scope} />
    
              <ReadingExamPreviewSection3 scope={scope} />
    
              <ReadingExamPreviewSection4 scope={scope} />
    
              <ReadingExamPreviewSection5 scope={scope} />
    
              <ReadingExamPreviewSection6 scope={scope} />
    
              <ReadingExamPreviewSection7 scope={scope} />
    
              <ReadingExamPreviewSection12 scope={scope} />
    
              <ReadingExamPreviewSection16 scope={scope} />
            </div>
          )
  );
}
