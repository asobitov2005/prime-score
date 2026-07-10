"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { Button, Lightbulb, ListeningTranscriptPanel, cn } from "../dependencies";
import { parsePassageBlockStyle, sectionKeyForParagraph } from "../shared";

export function ReadingExamPreviewSection13({ scope }: { scope: ReadingExamPreviewScope }) {
  const { isSinglePaneListeningMode, theme, readingPaneRef, handlePaneWheel, isAttemptPreview, examData, currentSection, isListeningPreview, isReviewMode, showListeningTranscript, setShowListeningTranscript, currentTranscriptQuestionLocations, showTranscriptAnswerLocations, setShowTranscriptAnswerLocations, listeningAudioRef, currentTranscriptSegments, currentParagraphs, renderFormattedText, renderMatchingHeadingDropArea, bodyFontSize, textBlockRefs, handleTextBlockMouseUp, renderHighlightedText } = scope;
  return (
    {!isSinglePaneListeningMode ? (
                <section
                  className={cn(
                    "min-h-0 flex-1 overflow-hidden border-b border-border/70 lg:flex lg:w-[var(--reading-pane)] lg:flex-none lg:flex-col lg:border-b-0 lg:border-r lg:border-border/80",
                    theme === "light" ? "bg-[#FBFCFD]" : "bg-card/40"
                  )}
                >
                  <div
                    ref={readingPaneRef}
    
                    onWheelCapture={handlePaneWheel}
                    className="h-full min-h-0 overflow-y-auto px-5 py-4 overscroll-contain lg:flex-1 lg:px-8 lg:py-5"
                    style={{ scrollbarGutter: "stable" }}
                  >
                    <div className="mb-3">
                      {isAttemptPreview ? null : (
                        <div className="space-y-2">
                          <h1 className="text-3xl font-black tracking-tight text-foreground">{examData.title}</h1>
                          <p className="max-w-3xl text-sm font-medium text-muted-foreground">
                            {examData.subtitle}
                          </p>
                        </div>
                      )}
                    </div>
    
                    <article className="space-y-5">
                      {currentSection?.audioUrl ? (
                        <div className="rounded-[1.4rem] border border-border/75 bg-card/70 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
                          {isListeningPreview && isReviewMode ? (
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant={showListeningTranscript ? "solid" : "outline"}
                                size="sm"
                                className="h-8 rounded-xl px-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
                                onClick={() => setShowListeningTranscript((current) => !current)}
                              >
                                {showListeningTranscript ? "Hide Transcript" : "Open Transcript"}
                              </Button>
                              {currentTranscriptQuestionLocations.length > 0 ? (
                                <Button
                                  type="button"
                                  variant={showTranscriptAnswerLocations ? "solid" : "outline"}
                                  size="sm"
                                  aria-label={showTranscriptAnswerLocations ? "Hide answer locations" : "Show answer locations"}
                                  title={showTranscriptAnswerLocations ? "Hide answer locations" : "Show answer locations"}
                                  className="h-8 w-8 rounded-xl p-0"
                                  disabled={!showListeningTranscript}
                                  onClick={() => setShowTranscriptAnswerLocations((current) => !current)}
                                >
                                  <Lightbulb className={cn("h-4 w-4", showTranscriptAnswerLocations && "fill-current")} />
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                          <audio
                            ref={listeningAudioRef}
                            controls
                            preload="metadata"
                            controlsList="nodownload noplaybackrate"
                            onContextMenu={(event) => event.preventDefault()}
                            className="w-full"
                            src={currentSection.audioUrl}
                          />
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
    
                      {(!isListeningPreview || (showListeningTranscript && currentTranscriptSegments.length === 0)) && currentParagraphs.length > 0 ? currentParagraphs.map((paragraph, paragraphIndex) => {
                        const paragraphStyle = parsePassageBlockStyle(paragraph.text);
                        const passageBlockKey = `passage-${sectionKeyForParagraph(paragraph)}-${paragraph.paragraphKey}`;
    
                        return (
                          <div key={`${paragraph.label ?? paragraphIndex}`} className="px-1 py-1">
                            {paragraph.sectionPreviewLabel ? (
                              <div className="mb-3 space-y-1">
                                <p className="text-lg font-semibold text-foreground">
                                  {renderFormattedText(paragraph.sectionPreviewLabel, `section-label-${paragraph.sectionId ?? paragraph.paragraphKey}`)}
                                </p>
                                {paragraph.sectionIntro ? (
                                  <p className="border-l-2 border-primary/40 py-0.5 pl-3 text-sm font-medium italic leading-relaxed text-muted-foreground">
                                    {renderFormattedText(paragraph.sectionIntro, `section-intro-${paragraph.sectionId ?? paragraph.paragraphKey}`)}
                                  </p>
                                ) : null}
                                {paragraph.sectionTitle ? (
                                  <h2 className="pt-1 text-center text-2xl font-semibold tracking-tight text-foreground">
                                    {renderFormattedText(paragraph.sectionTitle, `section-title-${paragraph.sectionId ?? paragraph.paragraphKey}`)}
                                  </h2>
                                ) : null}
                              </div>
                            ) : null}
                            {renderMatchingHeadingDropArea(paragraph)}
                            <p
                              className={cn(
                                "select-text font-sans text-foreground",
                                paragraphStyle.center && "text-center",
                                paragraphStyle.italic && "italic",
                                paragraphStyle.bold && "font-bold"
                              )}
                              style={{
                                fontSize: `${bodyFontSize}px`,
                                lineHeight: 1.5,
                              }}
                            >
                              {paragraph.label ? (
                                <span className="mr-3 inline-flex min-w-9 items-center justify-center rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 align-[0.08em] text-sm font-black leading-none text-foreground">
                                  {paragraph.label}
                                </span>
                              ) : null}
                              <span
                                ref={(node) => {
                                  textBlockRefs.current[passageBlockKey] = node;
                                }}
                                data-highlight-text
                                onMouseUp={(event) => handleTextBlockMouseUp(passageBlockKey, event)}
                              >
                                {renderHighlightedText(passageBlockKey, paragraphStyle.text)}
                              </span>
                            </p>
                          </div>
                        );
                      }) : null}
                    </article>
                  </div>
                </section>
                ) : null}
  );
}
