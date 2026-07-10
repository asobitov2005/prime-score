"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import type { Part3Scope } from "./controller-part-03";
import type { Part4Scope } from "./controller-part-04";
import type { Part5Scope } from "./controller-part-05";
import type { Part6Scope } from "./controller-part-06";
import type { Part7Scope } from "./controller-part-07";
import type { Part8Scope } from "./controller-part-08";
import { ArrowDown, Highlighter, Input, Lightbulb, cn } from "../dependencies";
import { PreviewGroup, PreviewQuestion, inlineAnswerWidth, isWordBankCompletion, parseCompletionTableLayout } from "../shared";

export function useControllerPart9(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope & Part5Scope & Part6Scope & Part7Scope & Part8Scope) {
  const { textBlockRefs, answers, theme, activeQuestionId, setActiveQuestionId, dragOverWordBankQuestionId, setExplanationHighlightQuote, reviewItems, bodyFontSize, inputFocusClass, activeInputClass, answerNumberBadgeClassName, inlineAnswerFieldClassName, inlineAnswerPlaceholderClassName, persistAnswer, handleTextBlockMouseUp, beginWordBankPointerDrag, renderHighlightedText } = scope;
  function renderReviewExplanation(reviewItem: NonNullable<typeof reviewItems[string]>, questionNumber: number) {
          if (!reviewItem.explanation) {
            return null;
          }
          const reference = reviewItem.explanationReference ?? {};
          const highlightedAnswer = reference.highlighted_answer?.trim();
          const hasQuote = Boolean(reference.quote?.trim());
          const hasAnswerIssue = reference.answer_status && reference.answer_status !== "valid";
  
          return (
            <div
              className={`mt-2 rounded-2xl border border-orange-200/70 bg-orange-50/80 p-3 text-sm shadow-sm shadow-orange-950/5 dark:border-orange-400/20 dark:bg-orange-500/10 dark:shadow-black/20${hasQuote ? " cursor-pointer select-none" : ""}`}
              onMouseEnter={() => setExplanationHighlightQuote(reference.quote ?? null)}
              onMouseLeave={() => setExplanationHighlightQuote(null)}
              onClick={() => {
                if (!hasQuote) return;
                // Tap-to-locate for touch devices (no hover): toggle the passage highlight.
                setExplanationHighlightQuote((current) =>
                  current === (reference.quote ?? null) ? null : reference.quote ?? null,
                );
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full bg-orange-600 px-2 text-[11px] font-black text-white dark:bg-orange-400 dark:text-slate-950">
                  Q{questionNumber}
                </span>
                {highlightedAnswer ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/80 bg-white/80 px-2 py-1 text-xs font-bold text-orange-800 dark:border-orange-400/25 dark:bg-slate-950/40 dark:text-orange-200">
                    <Highlighter className="h-3.5 w-3.5" />
                    {highlightedAnswer}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Explanation
                </span>
              </div>
              <p className="mt-2 leading-relaxed text-foreground">{reviewItem.explanation}</p>
              {hasQuote ? (
                <div className="mt-2 rounded-xl border-l-2 border-orange-400 bg-background/70 p-2 text-xs italic text-muted-foreground dark:bg-slate-950/40">
                  "{reference.quote}"
                </div>
              ) : null}
              {hasAnswerIssue ? (
                <div className="mt-2 rounded-xl border border-amber-300/70 bg-amber-50/80 p-2 text-xs font-semibold text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
                  Answer key check: {reference.issue || "This answer needs manual review."}
                </div>
              ) : null}
            </div>
          );
        }

  function renderCompletionAnswer(group: PreviewGroup, question: PreviewQuestion, key: string) {
          const isWordBankGroup = isWordBankCompletion(question.type);
          const answerLabel = question.label ?? String(question.number);
          const answerNumberBadge = (
            <span className={cn("inline-flex h-[1.55em] min-w-[1.55em] items-center justify-center rounded-full border px-1 text-[0.78em] font-bold leading-none align-middle", answerNumberBadgeClassName)}>
              {answerLabel}
            </span>
          );
  
          if (isWordBankGroup) {
            return (
              <span key={`${key}-wordbank-wrap`} className="mx-1 inline-flex items-center gap-1 align-middle">
                {answerNumberBadge}
                <button
                  type="button"
                  data-question-anchor={question.id}
                  data-wordbank-drop-question-id={question.id}
                  data-wordbank-drop-group-id={group.id}
                  onClick={() => setActiveQuestionId(question.id)}
                  onPointerDown={(event) => {
                    const currentValue = answers[question.id] ?? "";
                    if (!currentValue) {
                      return;
                    }
                    beginWordBankPointerDrag(event, {
                      groupId: group.id,
                      value: currentValue,
                      sourceQuestionId: question.id,
                    });
                  }}
                  className={cn(
                    inlineAnswerFieldClassName,
                    "mx-0 text-left font-medium transition",
                    theme === "light"
                      ? "border-[#2f436f]/45 bg-[#f8faff] text-[#22314d]"
                      : "border-slate-500/55 bg-card text-foreground",
                    dragOverWordBankQuestionId === question.id && "border-primary/55 bg-primary/10",
                    answers[question.id] ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                    activeQuestionId === question.id && activeInputClass
                  )}
                  style={{ width: `${inlineAnswerWidth(answers[question.id], answerLabel)}px` }}
                >
                  <span>{answers[question.id] || "\u00a0"}</span>
                </button>
              </span>
            );
          }
  
          return (
            <span key={`${key}-input-wrap`} className="mx-1 inline-flex items-center gap-1 align-middle">
              {answerNumberBadge}
              <Input
                value={answers[question.id] ?? ""}
                onFocus={() => setActiveQuestionId(question.id)}
                onChange={(event) => persistAnswer(question.id, event.target.value)}
                placeholder=""
                data-question-anchor={question.id}
                className={cn(
                  inlineAnswerFieldClassName,
                  "mx-0 text-left font-medium",
                  theme === "light"
                    ? "border-[#2f436f]/45 bg-[#f8faff]"
                    : "border-primary/30 bg-card",
                  inlineAnswerPlaceholderClassName,
                  inputFocusClass,
                  activeQuestionId === question.id && activeInputClass
                )}
                style={{ width: `${inlineAnswerWidth(answers[question.id], answerLabel)}px` }}
                autoComplete="off"
                spellCheck="false"
              />
            </span>
          );
        }

  function renderFlowChartCompletionGroup(group: PreviewGroup) {
          const questionBlock = group.questionBlock ?? "";
          const flowLines = questionBlock.split(/\r?\n\s*\\+\s*\r?\n/).map((line) => line.trim()).filter(Boolean);
          const questionIndexRef = { current: 0 };
  
          return (
            <div className="px-2 py-2">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-center">
                {flowLines.map((line, lineIndex) => {
                  const segments = line.split("[]");
                  return (
                    <div key={`${group.id}-flow-line-${lineIndex}`} className="flex w-full flex-col items-center gap-2">
                      <div className="w-full text-center">
                        <div
                          className="whitespace-pre-wrap font-sans text-foreground text-center"
                          style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.55 }}
                        >
                          {segments.map((segment, segmentIndex) => {
                            const question = segmentIndex < segments.length - 1
                              ? group.questions[questionIndexRef.current++]
                              : null;
                            const blockKey = `flowchart-completion-${group.id}-${lineIndex}-${segmentIndex}`;
  
                            return (
                              <span key={`${group.id}-flow-fragment-${lineIndex}-${segmentIndex}`}>
                                <span
                                  ref={(node) => {
                                    textBlockRefs.current[blockKey] = node;
                                  }}
                                  data-highlight-text
                                  onMouseUp={(event) => handleTextBlockMouseUp(blockKey, event)}
                                  className="select-text"
                                >
                                  {renderHighlightedText(blockKey, segment)}
                                </span>
                                {question ? renderCompletionAnswer(group, question, `${group.id}-flow-answer-${question.id}`) : null}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      {lineIndex < flowLines.length - 1 ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-sm">
                          <ArrowDown className="h-4 w-4" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

  function renderInlineCompletionGroup(group: PreviewGroup) {
          const questionBlock = group.questionBlock ?? "";
          const segments = questionBlock.split("[]");
  
          const tableLayout = parseCompletionTableLayout(questionBlock);
          if (tableLayout) {
            const questionIndexRef = { current: 0 };
  
            return (
              <div className="px-2 py-2">
                <div className="inline-block max-w-full overflow-x-auto rounded-2xl border border-border bg-background p-1 shadow-[0_0_0_1px_hsl(var(--border)),0_8px_24px_-18px_hsl(var(--foreground)/0.28)]">
                  <table className="w-auto border-collapse overflow-hidden rounded-[1rem] border border-border bg-background">
                    <tbody>
                      {tableLayout.map((row, rowIndex) => (
                        <tr
                          key={`${group.id}-table-row-${rowIndex}`}
                          className={row.isHeader ? "bg-muted/85" : "border-t border-border"}
                        >
                          {row.cells.map((cell, cellIndex) => {
                            const CellTag = row.isHeader ? "th" : "td";
                            const cellSegments = cell.split("[]");
  
                            return (
                              <CellTag
                                key={`${group.id}-table-cell-${rowIndex}-${cellIndex}`}
                                className={cn(
                                  "align-middle border-l border-border px-3 py-2 text-left font-sans text-foreground first:border-l-0",
                                  row.isHeader ? "text-sm font-bold" : "text-[15px] font-normal"
                                )}
                                style={{ lineHeight: 1.5 }}
                              >
                                {cellSegments.map((segment, segmentIndex) => {
                                  const question = segmentIndex < cellSegments.length - 1
                                    ? group.questions[questionIndexRef.current++]
                                    : null;
                                  const blockKey = `${group.id}-table-text-${rowIndex}-${cellIndex}-${segmentIndex}`;
                                  return (
                                    <span key={`${group.id}-table-fragment-${rowIndex}-${cellIndex}-${segmentIndex}`}>
                                      {segment ? (
                                        <span
                                          ref={(node) => {
                                            textBlockRefs.current[blockKey] = node;
                                          }}
                                          data-highlight-text
                                          onMouseUp={(event) => handleTextBlockMouseUp(blockKey, event)}
                                        >
                                          {renderHighlightedText(blockKey, segment)}
                                        </span>
                                      ) : null}
                                      {question ? renderCompletionAnswer(group, question, `${group.id}-table-answer-${question.id}`) : null}
                                    </span>
                                  );
                                })}
                              </CellTag>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }
  
          return (
            <div className="px-2 py-2">
              <div
                className="whitespace-pre-wrap font-sans text-foreground"
                style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
              >
                {segments.map((segment, index) => {
                  const question = group.questions[index];
                  return (
                    <span key={`${group.id}-segment-${index}`}>
                      <span
                        ref={(node) => {
                          textBlockRefs.current[`inline-completion-${group.id}-${index}`] = node;
                        }}
                        data-highlight-text
                        onMouseUp={(event) => handleTextBlockMouseUp(`inline-completion-${group.id}-${index}`, event)}
                        className="select-text"
                      >
                        {renderHighlightedText(`inline-completion-${group.id}-${index}`, segment)}
                      </span>
                      {question ? renderCompletionAnswer(group, question, `${group.id}-inline-answer-${question.id}`) : null}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        }

  return { renderReviewExplanation, renderCompletionAnswer, renderFlowChartCompletionGroup, renderInlineCompletionGroup };
}

export type Part9Scope = ReturnType<typeof useControllerPart9>;
