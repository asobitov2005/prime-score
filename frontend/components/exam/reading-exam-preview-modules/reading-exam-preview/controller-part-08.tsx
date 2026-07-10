"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import type { Part3Scope } from "./controller-part-03";
import type { Part4Scope } from "./controller-part-04";
import type { Part5Scope } from "./controller-part-05";
import type { Part6Scope } from "./controller-part-06";
import type { Part7Scope } from "./controller-part-07";
import { GripVertical, cn, groupUsesOptionBank, normalizeMatchingAnswerValue, shouldAutoLetterMatchingOptions } from "../dependencies";
import { PreviewGroup, normalizeHeadingComparableValue, typedOptionLines, typedOptionView, typedQuestionOptionLines } from "../shared";

export function useControllerPart8(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope & Part5Scope & Part6Scope & Part7Scope) {
  const { textBlockRefs, examData, answers, draggingHeading, dragOverHeadingBankGroupId, draggingWordBank, dragOverWordBankGroupId, matchingHeadingExamples, handleTextBlockMouseUp, beginHeadingPointerDrag, beginWordBankPointerDrag, renderHighlightedText, renderFormattedText, optionBankWidthForGroup, optionPanelTitleForGroup } = scope;
  function renderOptionBank(group: PreviewGroup) {
          if (!groupUsesOptionBank(group.type)) {
            return null;
          }
  
          const isListeningMatchingGroup = group.type.includes("listening_matching");
          const isWordBankGroup = group.type.includes("wordbank");
          const baseOptions = typedOptionLines(group);
          const baseOptionEntries = baseOptions.map((option, index) => ({
            option,
            index,
            optionView: typedOptionView(option, index, group.type),
          }));
  
          const selectedValues = group.type.includes("matching_headings")
            ? new Set<string>([
                ...group.questions
                  .map((question) => normalizeHeadingComparableValue(answers[question.id] ?? ""))
                  .filter(Boolean),
                ...examData.paragraphs
                  .map((paragraph) => matchingHeadingExamples.get(`${paragraph.sectionId ?? paragraph.sectionLabel ?? "section"}:${paragraph.paragraphKey}`))
                  .filter((entry): entry is { groupId: string; value: string; prefix: string; text: string; label: string } => Boolean(entry && entry.groupId === group.id))
                  .map((entry) => normalizeHeadingComparableValue(entry.value)),
              ])
            : isWordBankGroup
              ? new Set<string>(
                group.questions
                    .map((question) => {
                      const groupOptions = typedQuestionOptionLines(group, question, []);
                      return normalizeMatchingAnswerValue(String(answers[question.id] ?? "").trim(), groupOptions, question.type);
                    })
                    .filter(Boolean)
                    .map((value) => normalizeHeadingComparableValue(value))
                )
              : new Set<string>();
  
          const bankOptions = group.type.includes("matching_headings") || isWordBankGroup
            ? baseOptionEntries.filter((entry) => {
                const value = normalizeHeadingComparableValue(entry.optionView.value);
                return !selectedValues.has(value);
              })
            : baseOptionEntries;
  
          if (bankOptions.length === 0 && !isWordBankGroup && !isListeningMatchingGroup) {
            return null;
          }
  
          const optionBankWidth = optionBankWidthForGroup(group);
          const isBankDropReady = !isListeningMatchingGroup && (draggingHeading?.groupId === group.id || draggingWordBank?.groupId === group.id);
  
          return (
            <div
              data-heading-bank-group-id={group.type.includes("matching_headings") ? group.id : undefined}
              data-wordbank-bank-group-id={isWordBankGroup ? group.id : undefined}
              className={cn(
                "w-full p-1 transition",
                !isListeningMatchingGroup && (dragOverHeadingBankGroupId === group.id || dragOverWordBankGroupId === group.id) && isBankDropReady && "rounded-xl bg-primary/5"
              )}
              style={isListeningMatchingGroup ? { width: optionBankWidth } : undefined}
            >
              <p
                className={cn(
                  "mb-3",
                  group.optionsTitle?.trim()
                    ? "text-[15px] font-bold tracking-tight text-foreground"
                    : group.type.includes("matching_headings")
                      ? "font-black uppercase tracking-[0.18em] text-[13px] text-foreground"
                      : "font-black uppercase tracking-[0.18em] text-[10px] text-foreground/80"
                )}
              >
                {renderFormattedText(optionPanelTitleForGroup(group), `${group.id}-option-bank-title`)}
              </p>
              <div className={cn(
                isListeningMatchingGroup
                  ? "flex flex-col gap-2"
                  : group.type.includes("wordbank")
                  ? "flex flex-wrap gap-2"
                  : "space-y-2"
              )}>
                {bankOptions.map((entry) => {
                  const { option, index, optionView } = entry;
                  const value = optionView.value;
                  const text = optionView.text || optionView.label;
                  const headingPrefix = optionView.prefix;
                  const hasPrefix = !group.type.includes("matching_headings")
                    && (optionView.hasExplicitPrefix || shouldAutoLetterMatchingOptions(group.type));
                  const optionBlockKey = `option-bank-${group.id}-${value}-${text}`;
                  const isDraggingOption = group.type.includes("matching_headings")
                    ? (
                        draggingHeading?.groupId === group.id &&
                        normalizeHeadingComparableValue(draggingHeading?.value) === normalizeHeadingComparableValue(value) &&
                        !draggingHeading?.sourceQuestionId
                      )
                    : (
                        isWordBankGroup
                        && draggingWordBank?.groupId === group.id
                        && normalizeHeadingComparableValue(draggingWordBank?.value) === normalizeHeadingComparableValue(value)
                        && !draggingWordBank?.sourceQuestionId
                      );
  
                  if (isDraggingOption) {
                    return null;
                  }
  
                  return (
                    <div
                      key={`${group.id}-${value}-${text}-${index}`}
                      onPointerDown={(event) => {
                        if (isWordBankGroup) {
                          beginWordBankPointerDrag(event, {
                            groupId: group.id,
                            value: entry.optionView.value,
                            previewLabel: entry.optionView.label,
                          });
                        }
                      }}
                      className={cn(
                        "rounded-xl px-3 py-2 transition-transform duration-150",
                        group.type.includes("matching_headings")
                          ? "w-full min-w-0 border border-[#2f436f]/55 bg-[#2f436f]/[0.035] dark:border-[#4b6498]/55 dark:bg-[#4b6498]/[0.08]"
                          : group.type.includes("wordbank")
                            ? "inline-flex w-fit max-w-full cursor-grab items-center border border-border/55 bg-card px-3.5 py-1.5 active:cursor-grabbing hover:bg-muted/20"
                            : isListeningMatchingGroup
                              ? "w-full min-w-0 px-0 py-1"
                            : "border border-border/55 bg-card",
                        hasPrefix ? "flex items-start gap-0.5" : "block"
                      )}
                      style={group.type.includes("matching_headings") || isListeningMatchingGroup ? { width: optionBankWidth } : undefined}
                    >
                    {hasPrefix ? (
                        <>
                          {group.type.includes("matching_headings") ? (
                            <span
                              onPointerDown={(event) => beginHeadingPointerDrag(event, { groupId: group.id, value })}
                              className="mt-0.5 flex h-7 w-7 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-md border border-[#2f436f]/35 bg-[#2f436f]/[0.07] text-[#2f436f] transition active:cursor-grabbing dark:border-[#4b6498]/45 dark:bg-[#4b6498]/[0.12] dark:text-[#89a4d8]"
                              aria-hidden="true"
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "flex-1 whitespace-nowrap text-[16px] leading-6 text-foreground",
                              isListeningMatchingGroup && "min-w-0 whitespace-normal break-words leading-5",
                              group.type.includes("matching_headings") && "whitespace-normal"
                            )}
                          >
                            {group.type.includes("matching_headings") ? (
                              <span
                                ref={(node) => {
                                  textBlockRefs.current[optionBlockKey] = node;
                                }}
                                data-highlight-text
                                onMouseUp={(event) => handleTextBlockMouseUp(optionBlockKey, event)}
                                className="select-text"
                              >
                                {renderHighlightedText(optionBlockKey, `${headingPrefix}. ${text}`)}
                              </span>
                            ) : isListeningMatchingGroup ? (
                              <>
                                <span className="font-black">{value}.</span>{" "}
                                <span
                                  ref={(node) => {
                                    textBlockRefs.current[optionBlockKey] = node;
                                  }}
                                  data-highlight-text
                                  onMouseUp={(event) => handleTextBlockMouseUp(optionBlockKey, event)}
                                  className="font-normal select-text"
                                >
                                  {renderHighlightedText(optionBlockKey, text)}
                                </span>
                              </>
                            ) : (
                              <span
                                ref={(node) => {
                                  textBlockRefs.current[optionBlockKey] = node;
                                }}
                                data-highlight-text
                                onMouseUp={(event) => handleTextBlockMouseUp(optionBlockKey, event)}
                                className="select-text"
                              >
                                {renderHighlightedText(optionBlockKey, `${value}. ${text}`)}
                              </span>
                            )}
                          </span>
                        </>
                      ) : (
                        <div className="flex items-start gap-3">
                          {group.type.includes("matching_headings") ? (
                            <span
                              onPointerDown={(event) => beginHeadingPointerDrag(event, { groupId: group.id, value })}
                              className="mt-0.5 flex h-7 w-7 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-md border border-[#2f436f]/35 bg-[#2f436f]/[0.07] text-[#2f436f] transition active:cursor-grabbing dark:border-[#4b6498]/45 dark:bg-[#4b6498]/[0.12] dark:text-[#89a4d8]"
                              aria-hidden="true"
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                          ) : null}
                          <span
                            ref={(node) => {
                              textBlockRefs.current[optionBlockKey] = node;
                              }}
                            data-highlight-text
                            onMouseUp={(event) => handleTextBlockMouseUp(optionBlockKey, event)}
                            className={cn(
                              "select-text whitespace-nowrap text-[16px] font-bold leading-6 text-foreground",
                              group.type.includes("matching_headings") && "whitespace-normal",
                              group.type.includes("wordbank") ? "block leading-5" : "block flex-1"
                            )}
                          >
                            {group.type.includes("matching_headings") ? (
                              renderHighlightedText(optionBlockKey, `${headingPrefix}. ${text}`)
                            ) : (
                              renderHighlightedText(optionBlockKey, text)
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {bankOptions.length === 0 && isWordBankGroup ? (
                  <div className="rounded-xl border border-dashed border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                    All options are in use
                  </div>
                ) : null}
              </div>
            </div>
          );
        }

  function renderDiagramBlock(group: PreviewGroup) {
          if ((!group.type.includes("diagram") && !group.type.includes("plan_map_labeling")) || !group.diagramImageUrl) {
            return null;
          }
  
          return (
            <div className="p-1">
              <div className="overflow-hidden rounded-xl p-2">
                <img
                  src={group.diagramImageUrl}
                  alt={group.title}
                  className="max-h-[340px] w-full object-contain object-left"
                />
              </div>
            </div>
          );
        }

  return { renderOptionBank, renderDiagramBlock };
}

export type Part8Scope = ReturnType<typeof useControllerPart8>;
