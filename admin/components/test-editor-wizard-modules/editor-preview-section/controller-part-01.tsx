"use client";
import type { BaseScope } from "./base";
import { AdminTestDraftState, Button, cn, useEffect, useMemo, useRef, useState } from "../dependencies";
import { analyzeMatchingHeadingsGroup, formatQuestionRange, formatTranscriptTimestamp, isMatchingInformationType, isMultipleChoiceMultipleType, paragraphLabelFromPrompt, parsePassageContentBlocks, questionRangeAtIndex, renderBraceBoldText } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { previewId, draftType, section, groups, compact } = scope;
  const formatPreviewGroupHeading = (group: AdminTestDraftState["questionGroups"][number]) => {
      if (isMultipleChoiceMultipleType(group.typeId)) {
        return "Multiple-answer questions";
      }
      return `Questions ${group.questionStart}-${group.questionEnd}`;
    };

  const optionPanelTitle = (group: AdminTestDraftState["questionGroups"][number]) => {
      const customTitle = group.optionsTitle?.trim();
      if (customTitle) {
        return customTitle;
      }
      if (group.typeId.includes("matching_headings")) {
        return "List of Headings";
      }
      if (group.typeId.includes("matching_sentence_endings")) {
        return "Sentence Endings";
      }
      return "Options";
    };

  const formatPreviewQuestionHeading = (
      group: AdminTestDraftState["questionGroups"][number],
      questionNumber: string
    ) => {
      if (isMultipleChoiceMultipleType(group.typeId) && questionNumber.includes("-")) {
        return `Questions ${questionNumber}`;
      }
      if (isMatchingInformationType(group.typeId)) {
        return questionNumber;
      }
      return `Question ${questionNumber}`;
    };

  const matchingHeadingQuestions = useMemo(
      () =>
        groups
          .filter((group) => group.typeId.includes("matching_headings"))
          .flatMap((group) =>
            group.questions.map((question, index) => ({
              id: question.id,
              number: formatQuestionRange(questionRangeAtIndex(group, index)),
              label: paragraphLabelFromPrompt(question.prompt),
            }))
          ),
      [groups]
    );

  const matchingHeadingExamples = useMemo(() => {
      const exampleMap = new Map<string, string>();
      groups
        .filter((group) => group.typeId.includes("matching_headings"))
        .forEach((group) => {
          const meta = analyzeMatchingHeadingsGroup(group, [section]);
          meta.previewRows.forEach((row) => {
            if (row.isFixedExample && row.label && row.isValidLabel && !row.isDuplicate && !row.isUnused) {
              exampleMap.set(row.label, row.headingText || row.headingLine);
            }
          });
        });
      return exampleMap;
    }, [groups, section]);

  const matchingHeadingLabels = useMemo(
      () => new Set(matchingHeadingQuestions.map((question) => question.label).filter(Boolean) as string[]),
      [matchingHeadingQuestions]
    );

  const paragraphs = useMemo(
      () => parsePassageContentBlocks(section.content, Boolean(section.showLabels)),
      [section.content, section.showLabels]
    );

  const navQuestions = useMemo(
      () =>
        groups.flatMap((group) =>
          group.questions.map((question, index) => {
            const paragraphLabel = group.typeId.includes("matching_headings")
              ? paragraphLabelFromPrompt(question.prompt)
              : null;
            return {
              id: question.id,
              number: formatQuestionRange(questionRangeAtIndex(group, index)),
              targetId: paragraphLabel
                ? `${previewId}-${section.id}-paragraph-${paragraphLabel}`
                : `${previewId}-${section.id}-${question.id}`,
            };
          })
        ),
      [groups, previewId, section.id]
    );

  const [activeQuestionId, setActiveQuestionId] = useState<string>(navQuestions[0]?.id ?? "");

  const [showAnswerLocations, setShowAnswerLocations] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
      if (navQuestions.length === 0) {
        setActiveQuestionId("");
        return;
      }
      if (!navQuestions.some((question) => question.id === activeQuestionId)) {
        setActiveQuestionId(navQuestions[0]?.id ?? "");
      }
    }, [activeQuestionId, navQuestions]);

  function scrollToPreviewQuestion(questionId: string) {
      const target = navQuestions.find((question) => question.id === questionId);
      setActiveQuestionId(questionId);
      const node = document.getElementById(target?.targetId ?? `${previewId}-${section.id}-${questionId}`);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

  function seekPreviewAudio(second: number) {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(0, second);
      void audioRef.current.play().catch(() => undefined);
    }

  function renderListeningTranscriptPreview() {
      if (draftType !== "listening") {
        return null;
      }
  
      const segments = section.transcriptSegments ?? [];
      const locations = section.transcriptQuestionLocations ?? [];
      const fallbackTranscript = section.transcript?.trim() || "";
  
      return (
        <div className={cn("space-y-4", compact ? "pt-1" : "pt-2")}>
          {section.audioUrl ? (
            <audio ref={audioRef} className="w-full" controls src={section.audioUrl} />
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Transcript Preview</p>
              <p className="text-xs text-muted-foreground">Click any transcript row to jump the audio to that timestamp.</p>
            </div>
            {locations.length > 0 ? (
              <Button
                type="button"
                variant={showAnswerLocations ? "solid" : "outline"}
                size="sm"
                onClick={() => setShowAnswerLocations((current) => !current)}
              >
                {showAnswerLocations ? "Hide Answer Locations" : "Show Answer Locations"}
              </Button>
            ) : null}
          </div>
          {segments.length > 0 ? (
            <div className={cn("rounded-2xl border border-border/75 bg-background/90", compact ? "p-3" : "p-4")}>
              <div className={cn("space-y-2 overflow-y-auto", compact ? "max-h-[320px]" : "max-h-[420px]")}>
                {segments.map((segment) => {
                  const segmentLocations = locations.filter(
                    (location) =>
                      location.startSec <= segment.endSec
                      && location.endSec >= segment.startSec
                  );
                  return (
                    <button
                      key={segment.id}
                      type="button"
                      onClick={() => seekPreviewAudio(segment.startSec)}
                      className="w-full rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                        <span className="pt-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                          {formatTranscriptTimestamp(segment.startSec)}
                        </span>
                        <div className="space-y-2">
                          <p className={cn("text-foreground", compact ? "text-[13px] leading-[1.45]" : "text-[14px] leading-[1.55]")}>
                            {renderBraceBoldText(segment.text, `${previewId}-${section.id}-${segment.id}`)}
                          </p>
                          {showAnswerLocations && segmentLocations.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {segmentLocations.map((location) => (
                                <span
                                  key={`${segment.id}-${location.questionLabel}`}
                                  className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                                >
                                  {location.questionLabel}: {location.correctAnswer || location.answerText || "match"}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : fallbackTranscript ? (
            <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-4">
              <p className={cn("whitespace-pre-wrap text-foreground", compact ? "text-[13px] leading-[1.45]" : "text-[14px] leading-[1.55]")}>
                {renderBraceBoldText(fallbackTranscript, `${previewId}-${section.id}-fallback-transcript`)}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
              Upload audio to generate transcript preview.
            </div>
          )}
        </div>
      );
    }

  return { formatPreviewGroupHeading, optionPanelTitle, formatPreviewQuestionHeading, matchingHeadingQuestions, matchingHeadingExamples, matchingHeadingLabels, paragraphs, navQuestions, activeQuestionId, setActiveQuestionId, showAnswerLocations, setShowAnswerLocations, audioRef, scrollToPreviewQuestion, seekPreviewAudio, renderListeningTranscriptPreview };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
