"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { ListeningTranscriptPanel, cn } from "../dependencies";
import { parseBinaryInstructionLayout, questionRangeLabelForGroup, softenInstructionText } from "../shared";

export function ReadingExamPreviewSection14({ scope }: { scope: ReadingExamPreviewScope }) {
  const { isSinglePaneListeningMode, isReviewMode, isListeningPreview, theme, questionPaneRef, handlePaneWheel, isAttemptPreview, examData, currentSection, showListeningTranscript, currentTranscriptSegments, listeningAudioRef, currentTranscriptQuestionLocations, showTranscriptAnswerLocations, currentQuestionGroups, renderInstructionText, textBlockRefs, handleTextBlockMouseUp, bodyFontSize, renderHighlightedText, renderDiagramBlock, renderCustomGroupTitle, renderGroupQuestionList, renderOptionBank, optionBankWidthForGroup } = scope;
  return (
    <section
                  className={cn(
                    "min-h-0 flex-1 overflow-hidden lg:flex lg:flex-col",
                    isSinglePaneListeningMode || (isReviewMode && isListeningPreview) ? "lg:w-full lg:flex-1" : "lg:w-[var(--question-pane)] lg:flex-none",
                    theme === "light" ? "bg-[#FBFCFD]" : "bg-muted/15"
                  )}
                >
                  <div
                    ref={questionPaneRef}
    
                    onWheelCapture={handlePaneWheel}
                    className="h-full min-h-0 overflow-y-auto px-4 py-5 overscroll-contain lg:flex-1 lg:px-6 lg:py-6"
                    style={{ scrollbarGutter: "stable" }}
                  >
                    <div className="space-y-8">
                      {isSinglePaneListeningMode ? (
                        <div className="space-y-4">
                          {isAttemptPreview ? null : (
                            <div className="space-y-2">
                              <h1 className="text-3xl font-black tracking-tight text-foreground">{examData.title}</h1>
                              <p className="max-w-3xl text-sm font-medium text-muted-foreground">
                                {examData.subtitle}
                              </p>
                            </div>
                          )}
                          {currentSection?.previewLabel ? (
                            <div className="space-y-2 rounded-2xl border border-border/75 bg-card/55 px-4 py-3">
                              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                {currentSection.previewLabel}
                              </h2>
                              {currentSection?.label ? (
                                <p className="border-l-2 border-primary/70 pl-3 text-sm font-medium leading-6 text-foreground">
                                  {(() => {
                                    const sectionQuestionNumbers = currentSection?.questions.map((question) => question.number) ?? [];
                                    const sectionQuestionStart = sectionQuestionNumbers.length > 0 ? Math.min(...sectionQuestionNumbers) : null;
                                    const sectionQuestionEnd = sectionQuestionNumbers.length > 0 ? Math.max(...sectionQuestionNumbers) : null;
                                    return sectionQuestionStart !== null && sectionQuestionEnd !== null
                                      ? `${currentSection.label}. Questions ${sectionQuestionStart}-${sectionQuestionEnd}.`
                                      : `${currentSection.label}.`;
                                  })()}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          {isListeningPreview && showListeningTranscript && currentTranscriptSegments.length > 0 ? (
                            <ListeningTranscriptPanel
                              audioRef={listeningAudioRef}
                              segments={currentTranscriptSegments}
                              questionLocations={currentTranscriptQuestionLocations}
                              showAnswerLocations={showTranscriptAnswerLocations}
                            />
                          ) : null}
                        </div>
                      ) : null}
                      {currentQuestionGroups.map((group, groupIndex) => (
                        <div key={group.id} className="rounded-none border-0 bg-transparent p-0 shadow-none">
                          {(() => {
                            const isListeningMatchingGroup = group.type.includes("listening_matching");
                            const isPlanMapGroup = group.type.includes("plan_map_labeling");
                            return (
                              <>
                          <div className="border-l-2 border-primary/70 pl-3">
                            <p className="text-base font-black tracking-tight text-foreground">
                              {questionRangeLabelForGroup(group)}
                            </p>
                            <div className="mt-2 whitespace-pre-wrap text-[14px] font-medium leading-6 text-foreground md:text-[15px]">
                              {(() => {
                                const instructionBlockKey = `group-instruction-${group.id}`;
                                const binaryLayout = parseBinaryInstructionLayout(softenInstructionText(group.instruction));
    
                                if (binaryLayout) {
                                  return renderInstructionText(instructionBlockKey, group.instruction);
                                }
    
                                return (
                                  <div
                                    ref={(node) => {
                                      textBlockRefs.current[instructionBlockKey] = node;
                                    }}
                                    data-highlight-text
                                    onMouseUp={(event) => handleTextBlockMouseUp(instructionBlockKey, event)}
                                    className="select-text"
                                    style={{ fontSize: `${Math.max(bodyFontSize - 1, 14)}px`, lineHeight: 1.55 }}
                                  >
                                    {renderHighlightedText(instructionBlockKey, softenInstructionText(group.instruction))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
    
                          <div className={cn(
                            "mt-5 px-0 py-2",
                            isListeningMatchingGroup ? "inline-flex max-w-full items-start gap-3" : "space-y-4"
                          )}>
                            <div className={cn(
                              "min-w-0",
                              isListeningMatchingGroup ? "w-[32rem] max-w-full flex-none space-y-4" : "space-y-4"
                            )}>
                            {isPlanMapGroup ? (
                              <div className="grid gap-3 lg:grid-cols-[560px_312px] lg:items-start lg:justify-start">
                                <div className="min-w-0 w-[560px] justify-self-start">
                                  {renderDiagramBlock(group)}
                                </div>
                                <div className="min-w-0 justify-self-start space-y-3 lg:self-center">
                                  {renderCustomGroupTitle(group)}
                                  {renderGroupQuestionList(group)}
                                </div>
                              </div>
                            ) : (
                              <>
                                {renderDiagramBlock(group)}
                                {!isListeningMatchingGroup ? renderOptionBank(group) : null}
                                {renderCustomGroupTitle(group)}
                                {renderGroupQuestionList(group)}
                              </>
                            )}
                            </div>
                            {isListeningMatchingGroup ? (
                              <div
                                className="shrink-0 rounded-2xl border border-border/70 bg-muted/20 p-3"
                                style={{ width: optionBankWidthForGroup(group) }}
                              >
                                {renderOptionBank(group)}
                              </div>
                            ) : null}
                          </div>
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
  );
}
