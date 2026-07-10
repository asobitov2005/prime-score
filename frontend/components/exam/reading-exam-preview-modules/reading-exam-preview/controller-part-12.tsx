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
import type { Part11Scope } from "./controller-part-11";
import { ChevronDown, Input, cn, normalizeMatchingAnswerValue, useEffect } from "../dependencies";
import { PreviewGroup, PreviewQuestion, hasFlowChartSeparators, isCompletion, isMatching, isMcqMultiple, isPlanMapLabeling, isTfng, isYnng, softenInstructionText, typedOptionView, typedQuestionOptionLines, usesBracketCompletionLayout } from "../shared";

export function useControllerPart12(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope & Part5Scope & Part6Scope & Part7Scope & Part8Scope & Part9Scope & Part10Scope & Part11Scope) {
  const { textBlockRefs, answers, setHasMounted, theme, isSubmitted, activeQuestionId, setActiveQuestionId, hasExamFullscreenSessionRef, isExamMode, isReviewMode, bodyFontSize, inputFocusClass, inlineRowControlClassName, persistAnswer, handleTextBlockMouseUp, renderHighlightedText, renderReviewExplanation, renderFlowChartCompletionGroup, renderInlineCompletionGroup, QUESTION_CONTROL_NO_MATCH, buildQuestionControlContext, QuestionControlContext, renderQuestionControlBranch1, renderQuestionControlBranch2, renderQuestionControlBranch3, renderQuestionControlBranch4, renderQuestionControlBranch5 } = scope;
  function renderQuestionControlBranch6(context: QuestionControlContext) {
    const { question, group, reviewItem, formattedReviewCorrectAnswer } = context;
    if (isPlanMapLabeling(question.type)) {
              const mapOptions = typedQuestionOptionLines(group, question, []);
              const normalizedMapValue = normalizeMatchingAnswerValue(
                answers[question.id] ?? "",
                mapOptions,
                question.type
              );
    
              if (mapOptions.length > 0) {
                return (
                  <div className="w-[188px] flex-none space-y-1">
                    <div className="relative">
                      <select
                        value={normalizedMapValue}
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
                        <option value=""></option>
                        {mapOptions.map((option, index) => {
                          const optionView = typedOptionView(option, index, question.type);
                          return (
                            <option key={`${question.id}-map-${optionView.value}`} value={optionView.value}>
                              {optionView.value}
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
    
              return (
                <div className="w-[188px] flex-none space-y-1">
                  <Input
                    value={answers[question.id] ?? ""}
                    onFocus={() => setActiveQuestionId(question.id)}
                    onChange={(event) => persistAnswer(question.id, event.target.value)}
                    placeholder=""
                    className={cn(
                      "w-full rounded-md border-border bg-card px-2 font-medium shadow-none",
                      inlineRowControlClassName,
                      isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400",
                      isReviewMode && reviewItem?.isCorrect === false && "border-red-500 bg-red-500/10 dark:border-red-400",
                      inputFocusClass
                    )}
                    autoComplete="off"
                    spellCheck="false"
                  />
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

  function renderQuestionControlBranch7(context: QuestionControlContext) {
    const { question, group, reviewItem, formattedReviewCorrectAnswer } = context;
    if (isCompletion(question.type)) {
              return (
                <div className="pl-12 space-y-1">
                  <Input
                    value={answers[question.id] ?? ""}
                    onFocus={() => setActiveQuestionId(question.id)}
                    onChange={(event) => persistAnswer(question.id, event.target.value)}
                    placeholder="Type your answer"
                    className={cn(
                      "h-10 w-full max-w-md rounded-xl border-border bg-card px-3 text-[15px] font-medium shadow-none",
                      isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400",
                      isReviewMode && reviewItem?.isCorrect === false && "border-red-500 bg-red-500/10 dark:border-red-400",
                      inputFocusClass
                    )}
                    autoComplete="off"
                    spellCheck="false"
                  />
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

  function renderQuestionControlFallback(context: QuestionControlContext) {
    const { question, group, reviewItem, formattedReviewCorrectAnswer } = context;
    return (
      (
                <div className="pl-12 space-y-1">
                  <Input
                    value={answers[question.id] ?? ""}
                    onFocus={() => setActiveQuestionId(question.id)}
                    onChange={(event) => persistAnswer(question.id, event.target.value)}
                    placeholder="Type your answer"
                    className={cn(
                      "h-10 w-full max-w-md rounded-xl border-border bg-card px-3 text-[15px] font-medium shadow-none",
                      isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400",
                      isReviewMode && reviewItem?.isCorrect === false && "border-red-500 bg-red-500/10 dark:border-red-400",
                      inputFocusClass
                    )}
                    autoComplete="off"
                      spellCheck="false"
                    />
                    {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        Correct answer: {formattedReviewCorrectAnswer}
                      </p>
                    ) : null}
                    {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem, question.number) : null}
                  </div>
              )
    );
  }

  function renderQuestionControl(question: PreviewQuestion, group: PreviewGroup) {
    const context = buildQuestionControlContext(question, group);
    const branch1 = renderQuestionControlBranch1(context);
    if (branch1 !== QUESTION_CONTROL_NO_MATCH) return branch1;
    const branch2 = renderQuestionControlBranch2(context);
    if (branch2 !== QUESTION_CONTROL_NO_MATCH) return branch2;
    const branch3 = renderQuestionControlBranch3(context);
    if (branch3 !== QUESTION_CONTROL_NO_MATCH) return branch3;
    const branch4 = renderQuestionControlBranch4(context);
    if (branch4 !== QUESTION_CONTROL_NO_MATCH) return branch4;
    const branch5 = renderQuestionControlBranch5(context);
    if (branch5 !== QUESTION_CONTROL_NO_MATCH) return branch5;
    const branch6 = renderQuestionControlBranch6(context);
    if (branch6 !== QUESTION_CONTROL_NO_MATCH) return branch6;
    const branch7 = renderQuestionControlBranch7(context);
    if (branch7 !== QUESTION_CONTROL_NO_MATCH) return branch7;
    return renderQuestionControlFallback(context);
  }

  function renderGroupQuestionList(group: PreviewGroup) {
          if (usesBracketCompletionLayout(group.type) && hasFlowChartSeparators(group.questionBlock ?? "")) {
            return renderFlowChartCompletionGroup(group);
          }
  
          if (usesBracketCompletionLayout(group.type) && group.questionBlock?.trim()) {
            return renderInlineCompletionGroup(group);
          }
  
          if (group.type.includes("matching_headings")) {
            return null;
          }
  
          return group.questions.map((question) => {
            const isBinaryQuestion = isTfng(question.type) || isYnng(question.type);
            const isMatchingInformationQuestion = question.type.includes("matching_information");
            const isMatchingFeaturesQuestion = question.type.includes("matching_features");
            const isListeningMatchingQuestion = question.type.includes("listening_matching");
            const isPlanMapQuestion = question.type.includes("plan_map_labeling");
            const isInlineMatchingQuestion =
              isMatchingInformationQuestion
              || isMatchingFeaturesQuestion
              || isListeningMatchingQuestion
              || isPlanMapQuestion;
            const inlineQuestionLabel = question.label ?? String(question.number);
  
            return (
              <div
                key={question.id}
                id={question.id}
                onClick={() => setActiveQuestionId(question.id)}
                className={cn(
                  "px-0 transition",
                  isInlineMatchingQuestion ? "py-0" : "py-2",
                  activeQuestionId === question.id && ""
                )}
              >
                <div className={cn(
                  "mb-2.5 flex items-start gap-3",
                  isBinaryQuestion && "mb-1.5",
                  isInlineMatchingQuestion && "mb-0 gap-1 items-start",
                  isListeningMatchingQuestion && "gap-4",
                  isPlanMapQuestion && "gap-2 items-center"
                )}>
                  <div className={cn(
                    isPlanMapQuestion
                      ? "inline-grid max-w-[456px] grid-cols-[minmax(0,252px)_188px] items-center gap-4"
                      : "min-w-0 flex-1 space-y-1",
                    isInlineMatchingQuestion && !isPlanMapQuestion && "flex flex-1 flex-wrap items-start gap-1 space-y-0",
                    isListeningMatchingQuestion && "w-auto flex-none",
                    isMcqMultiple(question.type) && "space-y-0"
                  )}>
                    <p
                      className={cn(
                        "font-sans text-foreground",
                        isMatchingInformationQuestion && "min-w-[160px] flex-1",
                        isMatchingFeaturesQuestion && "min-w-[180px] flex-1",
                        isListeningMatchingQuestion && "w-[260px] max-w-[260px] flex-none",
                        isPlanMapQuestion && "min-w-0 max-w-none"
                      )}
                      style={{ fontSize: `${bodyFontSize}px`, lineHeight: isInlineMatchingQuestion ? 1.35 : 1.5 }}
                    >
                      <span className="mr-3 inline-block whitespace-nowrap text-[16px] font-bold tracking-tight text-foreground">
                        {inlineQuestionLabel}
                      </span>
                      <span
                        ref={(node) => {
                          textBlockRefs.current[`question-prompt-${question.id}`] = node;
                        }}
                        data-highlight-text
                        onMouseUp={(event) => handleTextBlockMouseUp(`question-prompt-${question.id}`, event)}
                        className="select-text"
                      >
                        {renderHighlightedText(`question-prompt-${question.id}`, question.prompt)}
                      </span>
                    </p>
                    {isInlineMatchingQuestion ? renderQuestionControl(question, group) : null}
                    {question.instruction && !group.instruction?.trim() && !isBinaryQuestion && !isMatching(question.type) ? (
                      <p
                        ref={(node) => {
                          textBlockRefs.current[`question-instruction-${question.id}`] = node;
                        }}
                        data-highlight-text
                        onMouseUp={(event) => handleTextBlockMouseUp(`question-instruction-${question.id}`, event)}
                        className="select-text text-[12px] font-medium leading-5 text-muted-foreground md:text-[13px]"
                      >
                        {renderHighlightedText(`question-instruction-${question.id}`, softenInstructionText(question.instruction))}
                      </p>
                    ) : null}
                  </div>
                </div>
  
                {!isInlineMatchingQuestion ? renderQuestionControl(question, group) : null}
              </div>
            );
          });
        }

  useEffect(() => {
          setHasMounted(true);
        }, []);

  useEffect(() => {
          if (!isExamMode || isReviewMode || isSubmitted) {
            return;
          }
  
          const enterFullscreen = async () => {
            if (document.fullscreenElement) {
              hasExamFullscreenSessionRef.current = true;
              return;
            }
  
            try {
              await document.documentElement.requestFullscreen();
            } catch {}
          };
  
          void enterFullscreen();
        }, [isExamMode, isReviewMode, isSubmitted]);

  return { renderQuestionControlBranch6, renderQuestionControlBranch7, renderQuestionControlFallback, renderQuestionControl, renderGroupQuestionList };
}

export type Part12Scope = ReturnType<typeof useControllerPart12>;
