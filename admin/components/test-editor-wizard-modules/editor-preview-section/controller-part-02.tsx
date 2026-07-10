"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { AdminTestDraftQuestion, AdminTestDraftState, ArrowDown, cn } from "../dependencies";
import { hasFlowChartSeparators, isDiagramLabelingType, parseCompletionTableLayout, renderBraceBoldText } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { previewId, section, compact, activeQuestionId, setActiveQuestionId } = scope;
  function renderCompletionPreview(group: AdminTestDraftState["questionGroups"][number]) {
      const questionBlock = group.questionBlock ?? "";
      const isWordBankCompletion = group.typeId.includes("wordbank");
  
      function renderCompletionAnswer(question: AdminTestDraftQuestion, index: number, key: string) {
        const isActive = activeQuestionId === question.id;
        return isWordBankCompletion ? (
          <select
            key={`${key}-wordbank`}
            id={`${previewId}-${section.id}-${question.id}`}
            value=""
            onChange={() => undefined}
            onFocus={() => setActiveQuestionId(question.id)}
            className={cn(
              compact
                ? "mx-1 inline-flex h-8 min-w-[132px] rounded-md border bg-background px-3 text-[12px] font-semibold transition"
                : "mx-1 inline-flex h-9 min-w-[156px] rounded-md border bg-background px-3 text-sm font-semibold transition",
              isActive
                ? "border-primary text-primary shadow-sm"
                : "border-border text-muted-foreground"
            )}
          >
            <option value="">Select answer</option>
            {group.sharedOptions.map((option) => (
              <option key={`${question.id}-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            key={`${key}-input`}
            id={`${previewId}-${section.id}-${question.id}`}
            onClick={() => setActiveQuestionId(question.id)}
            className={cn(
              compact
                ? "mx-1 inline-flex h-8 min-w-[46px] items-center justify-center rounded-md border text-[12px] font-black transition"
                : "mx-1 inline-flex h-9 min-w-[52px] items-center justify-center rounded-md border text-sm font-black transition",
              isActive
                ? "border-primary bg-primary/12 text-primary shadow-sm"
                : "border-border bg-background text-muted-foreground"
            )}
          >
            {group.questionStart + index}
          </button>
        );
      }
  
      function renderFlowChartCompletionPreview(group: AdminTestDraftState["questionGroups"][number]) {
        const flowLines = questionBlock.split(/\r?\n\s*\\+\s*\r?\n/).map((line) => line.trim()).filter(Boolean);
        let questionIndex = 0;
  
        return (
          <div className="px-2 py-2">
            {group.title ? (
              <p className={cn("mb-4 text-center font-bold tracking-tight text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
                {renderBraceBoldText(group.title, `${group.id}-completion-title`)}
              </p>
            ) : null}
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-center">
              {flowLines.map((line, lineIndex) => {
                const segments = line.split("[]");
  
                return (
                  <div key={`${group.id}-flow-line-${lineIndex}`} className="flex w-full flex-col items-center gap-2">
                    <div className="w-full text-center">
                      <div className={cn("whitespace-pre-wrap font-sans text-foreground text-center", compact ? "text-[14px] leading-[1.55]" : "text-[15px] leading-[1.7]")}>
                        {segments.map((segment, segmentIndex) => {
                          const question = segmentIndex < segments.length - 1
                            ? group.questions[questionIndex]
                            : null;
                          const currentIndex = questionIndex;
                          if (question) {
                            questionIndex += 1;
                          }
  
                          return (
                            <span key={`${group.id}-flow-fragment-${lineIndex}-${segmentIndex}`}>
                              {segment ? renderBraceBoldText(segment, `${group.id}-flow-segment-${lineIndex}-${segmentIndex}`) : null}
                              {question ? renderCompletionAnswer(question, currentIndex, `${group.id}-flow-answer-${question.id}`) : null}
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
  
      if (hasFlowChartSeparators(questionBlock)) {
        return renderFlowChartCompletionPreview(group);
      }
  
      const segments = questionBlock.split("[]");
      const tableLayout = parseCompletionTableLayout(questionBlock);
      if (tableLayout) {
        const questionIndexRef = { current: 0 };
        return (
          <div className="rounded-2xl border border-border/70 bg-muted/10 px-4 py-4">
            {group.title ? (
              <p className={cn("mb-4 text-center font-bold tracking-tight text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
                {renderBraceBoldText(group.title, `${group.id}-completion-title`)}
              </p>
            ) : null}
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
                        const cellSegments = cell.text.split("[]");
                        return (
                          <CellTag
                            key={`${group.id}-table-cell-${rowIndex}-${cellIndex}`}
                            rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                            colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                            className={cn(
                              "align-middle border-l border-border px-3 py-2 text-left font-sans text-foreground first:border-l-0",
                              row.isHeader ? "text-sm font-bold" : compact ? "text-[14px] leading-[1.55]" : "text-[15px] leading-[1.7]"
                            )}
                          >
                            {cellSegments.map((segment, segmentIndex) => {
                              const question = segmentIndex < cellSegments.length - 1
                                ? group.questions[questionIndexRef.current]
                                : null;
                              const currentIndex = questionIndexRef.current;
                              if (question) {
                                questionIndexRef.current += 1;
                              }
                              return (
                                <span key={`${group.id}-table-fragment-${rowIndex}-${cellIndex}-${segmentIndex}`}>
                                  {segment ? renderBraceBoldText(segment, `${group.id}-table-text-${rowIndex}-${cellIndex}-${segmentIndex}`) : null}
                                  {question ? renderCompletionAnswer(question, currentIndex, `${group.id}-table-answer-${question.id}`) : null}
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
        <div className="rounded-2xl border border-border/70 bg-muted/10 px-4 py-4">
          {group.title ? (
            <p className={cn("mb-4 text-center font-bold tracking-tight text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
              {renderBraceBoldText(group.title, `${group.id}-completion-title`)}
            </p>
          ) : null}
          <div className={cn("whitespace-pre-wrap font-sans text-foreground", compact ? "text-[14px] leading-[1.55]" : "text-[15px] leading-[1.7]")}>
            {segments.map((segment, index) => {
              const question = group.questions[index];
              return (
                <span key={`${group.id}-completion-${index}`}>
                  {renderBraceBoldText(segment, `${group.id}-completion-segment-${index}`)}
                  {question ? renderCompletionAnswer(question, index, `${group.id}-inline-answer-${question.id}`) : null}
                </span>
              );
            })}
          </div>
        </div>
      );
    }

  function renderDiagramPreview(group: AdminTestDraftState["questionGroups"][number]) {
      if (!isDiagramLabelingType(group.typeId) || !group.diagramImageUrl) {
        return null;
      }
  
      return (
        <div className={cn("border border-border/70 bg-muted/20", compact ? "rounded-[1rem] p-3" : "rounded-2xl p-4")}>
          <div className="overflow-hidden rounded-xl border border-border bg-background/80 p-2">
            <img
              src={group.diagramImageUrl}
              alt={group.title}
              className={cn("w-full object-contain", compact ? "max-h-[220px]" : "max-h-[320px]")}
            />
          </div>
        </div>
      );
    }

  return { renderCompletionPreview, renderDiagramPreview };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
