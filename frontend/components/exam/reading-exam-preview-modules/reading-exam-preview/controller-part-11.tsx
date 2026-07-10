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
import type { Part10Scope } from "./controller-part-10";
import { Check, ChevronDown, cn, normalizeMatchingAnswerValue, shouldAutoLetterMatchingOptions } from "../dependencies";
import { hasMultiValue, isMatching, isMcqMultiple, isWordBankCompletion, mcMultipleQuestionWeight, normalizeOptionList, optionText, splitOptionLines, toggleMultiValue, typedOptionView, typedQuestionOptionLines } from "../shared";

export function useControllerPart11(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope & Part5Scope & Part6Scope & Part7Scope & Part8Scope & Part9Scope & Part10Scope) {
  const { textBlockRefs, answers, theme, activeQuestionId, setActiveQuestionId, isReviewMode, matchingInformationParagraphOptions, bodyFontSize, activeInputClass, inlineRowControlClassName, persistAnswer, hasActiveSelection, handleTextBlockMouseUp, renderHighlightedText, renderReviewExplanation, QUESTION_CONTROL_NO_MATCH, QuestionControlContext } = scope;
  function renderQuestionControlBranch3(context: QuestionControlContext) {
    const { question, group, reviewItem, formattedReviewCorrectAnswer } = context;
    if (isMcqMultiple(question.type)) {
              const maxSelections = mcMultipleQuestionWeight(question);
              const selectedCount = (answers[question.id] ?? "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
                .length;
              return (
                <div className="space-y-0">
                  {(question.options ?? []).map((option, index) => {
                    const optionLetter = String.fromCharCode(65 + index);
                    const checked = hasMultiValue(answers[question.id], optionLetter);
                    const disabled = !checked && selectedCount >= maxSelections;
                    const isCorrectOption = Boolean(reviewItem?.correctAnswers?.includes(optionLetter));
                    const isIncorrectSelected = Boolean(reviewItem && checked && !isCorrectOption);
    
                    return (
                      <button
                        key={`${question.id}-${optionLetter}`}
                        type="button"
                        onClick={() => {
                          if (hasActiveSelection()) return;
                          if (disabled) return;
                          setActiveQuestionId(question.id);
                          persistAnswer(question.id, toggleMultiValue(answers[question.id], optionLetter, maxSelections));
                        }}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2 text-left transition duration-150",
                          isReviewMode && isCorrectOption && "bg-emerald-500/10",
                          isReviewMode && isIncorrectSelected && "bg-red-500/10",
                          disabled && "opacity-70",
                          disabled
                            ? "bg-card"
                            : "bg-card hover:bg-muted/20"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition",
                            checked
                              ? isReviewMode && isCorrectOption
                                ? "border-transparent bg-emerald-600 dark:bg-emerald-400"
                                : isReviewMode && isIncorrectSelected
                                  ? "border-transparent bg-red-600 dark:bg-red-400"
                                  : "border-transparent bg-slate-950 dark:bg-slate-50"
                              : disabled
                                ? "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70"
                                : "border-slate-500 bg-background dark:border-slate-400 dark:bg-transparent"
                          )}
                        >
                          {checked ? <Check className="h-3.5 w-3.5 text-white dark:text-slate-950" strokeWidth={3.25} /> : null}
                        </span>
                        <span
                          className={cn(
                            "font-sans text-foreground transition-colors",
                            disabled && "text-muted-foreground"
                          )}
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

  function renderQuestionControlBranch4(context: QuestionControlContext) {
    const { question, group, reviewItem, formattedReviewCorrectAnswer } = context;
    if (isMatching(question.type)) {
              const isMatchingInformation = question.type.includes("matching_information");
              const isMatchingFeatures = question.type.includes("matching_features");
              const isListeningMatching = question.type.includes("listening_matching");
              const isInlineMatching = isMatchingInformation || isMatchingFeatures || isListeningMatching;
              const sectionKey = group.sectionId ?? group.sectionLabel ?? "section";
              const matchingInformationOptions = matchingInformationParagraphOptions.get(sectionKey) ?? [];
              const matchingOptions = typedQuestionOptionLines(group, question, matchingInformationOptions);
              const matchingOptionViews = matchingOptions.map((option, index) => typedOptionView(option, index, question.type));
              const normalizedMatchingValue = normalizeMatchingAnswerValue(
                answers[question.id] ?? "",
                matchingOptions,
                question.type
              );
    
              if (matchingOptions.length === 0) {
                return (
                  <div className={cn(
                    isMatchingInformation
                      ? "min-w-[150px] max-w-[180px] flex-none"
                      : isMatchingFeatures
                        ? "min-w-[150px] max-w-[210px] flex-none"
                        : isListeningMatching
                          ? "min-w-[160px] max-w-[220px] flex-none"
                          : "pl-12"
                  )}>
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Options not configured
                    </div>
                  </div>
                );
              }
    
              if (isListeningMatching) {
                return (
                  <div className="min-w-[176px] max-w-[240px] flex-none space-y-2">
                    <div className="relative">
                      <select
                        value={normalizedMatchingValue}
                        onFocus={() => setActiveQuestionId(question.id)}
                        onChange={(event) => persistAnswer(question.id, event.target.value)}
                        className={cn(
                          "flex w-full appearance-none items-center rounded-md border border-border bg-card pr-7 font-semibold text-foreground shadow-none outline-none transition",
                          inlineRowControlClassName,
                          theme === "light"
                            ? "focus:border-[#2f436f]"
                            : "focus:border-primary/45",
                          isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500/90 bg-emerald-500/10 dark:border-emerald-400/85",
                          isReviewMode && reviewItem?.isCorrect === false && "border-red-500/90 bg-red-500/10 dark:border-red-400/85",
                          activeQuestionId === question.id && activeInputClass
                        )}
                      >
                        <option value="">Select answer</option>
                        {matchingOptionViews.map((optionView, index) => (
                          <option key={`${question.id}-listening-matching-${index}`} value={optionView.value}>
                            {optionView.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formattedReviewCorrectAnswer}
                      </p>
                    ) : null}
                    {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem, question.number) : null}
                  </div>
                );
              }
    
              return (
                  <div className={cn(
                    isMatchingInformation
                      ? "min-w-[120px] max-w-[156px] flex-none"
                      : isMatchingFeatures
                        ? "min-w-[220px] max-w-[300px] flex-none"
                        : "pl-12"
                  )}>
                  <div className={cn(
                    "relative",
                    isMatchingInformation
                      ? "max-w-[156px]"
                      : isMatchingFeatures
                        ? "max-w-[300px]"
                        : "max-w-md"
                  )}>
                    <select
                      value={normalizedMatchingValue}
                      onChange={(event) => persistAnswer(question.id, event.target.value)}
                      className={cn(
                        "flex w-full appearance-none items-center rounded-md border border-border bg-card font-semibold text-foreground shadow-none outline-none transition whitespace-nowrap overflow-hidden text-ellipsis",
                        isInlineMatching
                          ? cn(inlineRowControlClassName, "pr-7")
                          : isMatchingInformation
                            ? "h-8 px-3 pr-8 text-sm"
                            : isMatchingFeatures
                              ? "h-8 px-3 pr-8 text-sm"
                              : "h-9 px-4 pr-10 text-sm",
                        theme === "light"
                          ? "focus:border-[#2f436f]"
                          : "focus:border-primary/45"
                      )}
                    >
                      <option value="">Select answer</option>
                      {matchingOptions.map((option, index) => {
                        const optionView = typedOptionView(option, index, question.type);
                        const shouldShowLabel =
                          !question.type.includes("matching_headings") && shouldAutoLetterMatchingOptions(question.type);
                        return (
                          <option key={`${question.id}-matching-${index}`} value={optionView.value}>
                            {question.type.includes("matching_headings")
                              ? optionView.label
                              : shouldShowLabel
                                ? optionView.label
                                : optionView.value}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className={cn(
                      "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
                      isInlineMatching ? "right-2 h-3.5 w-3.5" : "right-3 h-4 w-4"
                    )} />
                    {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
                      <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formattedReviewCorrectAnswer}
                      </p>
                    ) : null}
                    {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem, question.number) : null}
                  </div>
                </div>
              );
            }
    return QUESTION_CONTROL_NO_MATCH;
  }

  function renderQuestionControlBranch5(context: QuestionControlContext) {
    const { question, group, reviewItem, formattedReviewCorrectAnswer } = context;
    if (isWordBankCompletion(question.type)) {
              const wordBankOptions = group.secondaryBlock?.trim()
                ? splitOptionLines(group.secondaryBlock)
                : normalizeOptionList(group.sharedOptions ?? question.options ?? []);
    
              return (
                <div className="pl-12 space-y-1">
                  <div className="relative max-w-xl">
                    <select
                      value={answers[question.id] ?? ""}
                      onChange={(event) => persistAnswer(question.id, event.target.value)}
                      className={cn(
                        "flex h-10 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 pr-10 text-sm font-semibold text-foreground shadow-none outline-none transition whitespace-nowrap overflow-hidden text-ellipsis",
                        isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400",
                        isReviewMode && reviewItem?.isCorrect === false && "border-red-500 bg-red-500/10 dark:border-red-400",
                        theme === "light"
                          ? "focus:border-[#2f436f]"
                          : "focus:border-slate-400"
                      )}
                    >
                      <option value="">Select word</option>
                      {wordBankOptions.map((option, index) => {
                        const label = optionText(option) || option;
                        return (
                          <option key={`${question.id}-wordbank-${index}`} value={label}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      Correct answer: {formattedReviewCorrectAnswer}
                    </p>
                  ) : null}
                  {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem, question.number) : null}
                </div>
              );
            }
    return QUESTION_CONTROL_NO_MATCH;
  }

  return { renderQuestionControlBranch3, renderQuestionControlBranch4, renderQuestionControlBranch5 };
}

export type Part11Scope = ReturnType<typeof useControllerPart11>;
