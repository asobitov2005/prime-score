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
import type { Part9Scope } from "./controller-part-09";
import { GripVertical, cn, formatMatchingAnswerForReview } from "../dependencies";
import { PreviewGroup, PreviewParagraph, PreviewQuestion, isMatching, isMcq, isMcqMultiple, isTfng, isWordBankCompletion, isYnng, normalizeHeadingComparableValue, shouldRenderCustomGroupTitle, typedOptionLines, typedOptionView, typedQuestionOptionLines } from "../shared";

export function useControllerPart10(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope & Part5Scope & Part6Scope & Part7Scope & Part8Scope & Part9Scope) {
  const { textBlockRefs, answers, theme, activeQuestionId, setActiveQuestionId, draggingHeading, dragOverQuestionId, isReviewMode, reviewItems, matchingHeadingTargets, matchingHeadingExamples, headingOptionLookup, bodyFontSize, persistAnswer, hasActiveSelection, handleTextBlockMouseUp, beginHeadingPointerDrag, renderHighlightedText, renderFormattedText, renderReviewExplanation } = scope;
  function renderMatchingHeadingDropArea(paragraph: PreviewParagraph) {
          const paragraphKey = `${paragraph.sectionId ?? paragraph.sectionLabel ?? "section"}:${paragraph.paragraphKey}`;
          const target = matchingHeadingTargets.get(paragraphKey);
          const fixedExample = matchingHeadingExamples.get(paragraphKey);
  
          if (!target && !fixedExample) {
            return null;
          }
  
          if (!target && fixedExample) {
            return (
              <div className={cn(
                "mb-2 flex min-h-[28px] items-center justify-center rounded-md border border-success/40 bg-success/8 px-2.5 py-1 text-sm font-semibold text-foreground transition-all duration-150"
              )}>
                <span className="ml-2.5 flex-1 text-left text-[15px] font-bold leading-6 text-inherit">
                  {renderFormattedText(`${fixedExample.prefix}. ${fixedExample.text}`, `selected-heading-example-${paragraph.paragraphKey}`)}
                </span>
              </div>
            );
          }
  
          if (!target) {
            return null;
          }
  
          const isDraggingSelectedHeading =
            draggingHeading?.groupId === target.group.id &&
            normalizeHeadingComparableValue(draggingHeading?.value) === normalizeHeadingComparableValue(answers[target.question.id] ?? "") &&
            draggingHeading?.sourceQuestionId === target.question.id;
          const currentValue = isDraggingSelectedHeading ? "" : (answers[target.question.id] ?? "");
          const optionLines = typedOptionLines(target.group);
          const currentOptionIndex = optionLines.findIndex(
            (option, index) =>
              normalizeHeadingComparableValue(typedOptionView(option, index, target.group.type).value) === normalizeHeadingComparableValue(currentValue)
          );
          const currentHeadingOption = currentOptionIndex >= 0
            ? typedOptionView(optionLines[currentOptionIndex], currentOptionIndex, target.group.type)
            : headingOptionLookup.get(`${target.group.id}:${currentValue}`) ?? null;
          const currentHeadingText = currentHeadingOption?.text ?? currentValue;
          const currentHeadingPrefix = currentHeadingOption?.prefix ?? currentValue;
          const isActive = activeQuestionId === target.question.id;
          const isDropReady = draggingHeading?.groupId === target.group.id;
          const isDropHover = dragOverQuestionId === target.question.id && isDropReady;
          const hasValue = Boolean(currentValue);
          const dropTone = theme === "light"
            ? {
                hover: "border-[#2f436f] text-[#2f436f] bg-[#2f436f]/16 ring-2 ring-[#2f436f]/18 shadow-sm",
                filled: "border-[#2f436f]/75 text-[#2f436f] bg-[#2f436f]/8",
                idle: "border-[#2f436f]/70 text-[#2f436f]/90",
              }
            : {
                hover: "border-slate-300 text-[#FBFCFD] bg-slate-700/70 ring-2 ring-slate-300/18 shadow-sm",
                filled: "border-slate-500/80 text-[#FBFCFD] bg-slate-700/35",
                idle: "border-slate-500/75 text-[#FBFCFD]/88",
              };
  
          return (
            <div
              id={target.question.id}
              data-heading-drop-question-id={target.question.id}
              data-heading-drop-group-id={target.group.id}
              onClick={() => setActiveQuestionId(target.question.id)}
              className={cn(
                "mb-2 flex min-h-[28px] items-center justify-center rounded-md border border-dashed px-2.5 py-1 text-sm font-semibold transition-all duration-150",
                "cursor-default",
                isDropHover
                  ? dropTone.hover
                  : hasValue
                    ? dropTone.filled
                    : isActive
                      ? "border-[#2f436f] text-[#2f436f] bg-[#2f436f]/[0.03]"
                      : dropTone.idle,
              )}
            >
              <span className="flex min-w-[18px] items-center justify-center text-[16px] font-black leading-none text-inherit">
                {target.question.label ?? target.question.number}
              </span>
              {currentValue ? (
                <span
                  onPointerDown={(event) =>
                    beginHeadingPointerDrag(event, {
                      groupId: target.group.id,
                      value: currentValue,
                      sourceQuestionId: target.question.id,
                    })}
                  className="ml-2 flex h-7 w-7 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-md border border-current/25 bg-current/[0.08] text-inherit transition active:cursor-grabbing"
                  aria-hidden="true"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
              ) : null}
              {currentValue ? (
                <span className="ml-2.5 flex-1 text-left text-[15px] font-bold leading-6 text-inherit">
                  {renderFormattedText(`${currentHeadingPrefix}. ${currentHeadingText}`, `selected-heading-${target.question.id}`)}
                </span>
              ) : null}
            </div>
          );
        }

  function renderCustomGroupTitle(group: PreviewGroup) {
          if (!shouldRenderCustomGroupTitle(group)) {
            return null;
          }
  
          return (
            <div className="px-2">
              <h2 className="text-center text-[17px] font-bold tracking-tight text-foreground md:text-[19px]">
                {renderFormattedText(group.title, `group-title-${group.id}`)}
              </h2>
            </div>
          );
        }

  const QUESTION_CONTROL_NO_MATCH = Symbol("question-control-no-match");

  function buildQuestionControlContext(question: PreviewQuestion, group: PreviewGroup) {
    const reviewItem = isReviewMode ? reviewItems[question.id] : undefined;
    
    const formattedReviewCorrectAnswer = reviewItem
              ? (
                  isMatching(question.type) || isWordBankCompletion(question.type)
                    ? reviewItem.correctAnswers.map((answer) => formatMatchingAnswerForReview(answer, typedQuestionOptionLines(group, question, []), question.type)).join(", ")
                    : reviewItem.correctAnswers.join(", ")
                )
              : "";
    return { question, group, reviewItem, formattedReviewCorrectAnswer };
  }

  type QuestionControlContext = ReturnType<typeof buildQuestionControlContext>;

  function renderQuestionControlBranch1(context: QuestionControlContext) {
    const { question, group, reviewItem, formattedReviewCorrectAnswer } = context;
    if (isTfng(question.type) || isYnng(question.type)) {
              const options = isTfng(question.type)
                ? ["TRUE", "FALSE", "NOT GIVEN"]
                : ["YES", "NO", "NOT GIVEN"];
    
              return (
                <div className="space-y-0">
                  {options.map((option) => {
                    const selected = answers[question.id] === option;
                    const isCorrectOption = Boolean(reviewItem?.correctAnswers?.includes(option));
                    const isIncorrectSelected = Boolean(reviewItem && selected && !isCorrectOption);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          if (hasActiveSelection()) return;
                          setActiveQuestionId(question.id);
                          persistAnswer(question.id, option);
                        }}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2 text-left transition duration-150",
                          isReviewMode && isCorrectOption && "text-emerald-700 dark:text-emerald-400",
                          isReviewMode && isIncorrectSelected && "text-red-700 dark:text-red-400",
                          "bg-transparent hover:bg-transparent"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                            theme === "light"
                              ? isReviewMode && isCorrectOption
                                ? "border-emerald-600 text-emerald-600"
                                : isReviewMode && isIncorrectSelected
                                  ? "border-red-600 text-red-600"
                                  : selected
                                ? "border-slate-900 text-slate-900"
                                : "border-slate-400/85 text-transparent"
                              : isReviewMode && isCorrectOption
                                ? "border-emerald-400 text-emerald-400"
                                : isReviewMode && isIncorrectSelected
                                  ? "border-red-400 text-red-400"
                                  : selected
                                ? "border-slate-200 text-slate-200"
                                : "border-slate-500/85 text-transparent"
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full bg-current transition", selected ? "opacity-100" : "opacity-0")} />
                        </span>
                        <span
                          className="font-sans text-foreground"
                          style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                        >
                          {option}
                        </span>
                      </button>
                    );
                  })}
                  {isReviewMode && reviewItem && !reviewItem.isCorrect && formattedReviewCorrectAnswer ? (
                    <p className="px-2 pt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      Correct answer: {formattedReviewCorrectAnswer}
                    </p>
                  ) : null}
                  {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem, question.number) : null}
                </div>
              );
            }
    return QUESTION_CONTROL_NO_MATCH;
  }

  function renderQuestionControlBranch2(context: QuestionControlContext) {
    const { question, group, reviewItem, formattedReviewCorrectAnswer } = context;
    if (isMcq(question.type) && !isMcqMultiple(question.type)) {
              return (
                <div className="space-y-0">
                  {(question.options ?? []).map((option, index) => {
                    const optionLetter = String.fromCharCode(65 + index);
                    const checked = answers[question.id] === optionLetter;
                    const isCorrectOption = Boolean(reviewItem?.correctAnswers?.includes(optionLetter));
                    const isIncorrectSelected = Boolean(reviewItem && checked && !isCorrectOption);
                    return (
                      <button
                        key={`${question.id}-${optionLetter}`}
                        type="button"
                        onClick={() => {
                          if (hasActiveSelection()) return;
                          setActiveQuestionId(question.id);
                          persistAnswer(question.id, optionLetter);
                        }}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2 text-left transition duration-150",
                          isReviewMode && isCorrectOption && "text-emerald-700 dark:text-emerald-400",
                          isReviewMode && isIncorrectSelected && "text-red-700 dark:text-red-400",
                          "bg-transparent hover:bg-transparent"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                            checked
                              ? isReviewMode && isCorrectOption
                                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                                : isReviewMode && isIncorrectSelected
                                  ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
                                  : "border-slate-900 text-slate-900 dark:border-slate-200 dark:text-slate-200"
                              : "border-slate-400/85 text-transparent dark:border-slate-500/85"
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full bg-current transition", checked ? "opacity-100" : "opacity-0")} />
                        </span>
                        <span
                          className={cn("font-sans text-foreground transition-colors", checked && "text-slate-950 dark:text-slate-50")}
                          style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                        >
                          <span className="mr-2 font-black">{optionLetter}.</span>
                          <span
                            ref={(node) => {
                              textBlockRefs.current[`question-option-${question.id}-${optionLetter}`] = node;
                            }}
                            data-highlight-text
                            onMouseUp={(event) => handleTextBlockMouseUp(`question-option-${question.id}-${optionLetter}`, event)}
                            className="select-text"
                          >
                            {renderHighlightedText(`question-option-${question.id}-${optionLetter}`, option)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {isReviewMode && reviewItem && !reviewItem.isCorrect && formattedReviewCorrectAnswer ? (
                    <p className="px-2 pt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      Correct answer: {formattedReviewCorrectAnswer}
                    </p>
                  ) : null}
                  {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem, question.number) : null}
                </div>
              );
            }
    return QUESTION_CONTROL_NO_MATCH;
  }

  return { renderMatchingHeadingDropArea, renderCustomGroupTitle, QUESTION_CONTROL_NO_MATCH, buildQuestionControlContext, QuestionControlContext, renderQuestionControlBranch1, renderQuestionControlBranch2 };
}

export type Part10Scope = ReturnType<typeof useControllerPart10>;
