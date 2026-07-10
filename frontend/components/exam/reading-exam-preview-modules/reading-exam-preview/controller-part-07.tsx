"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import type { Part3Scope } from "./controller-part-03";
import type { Part4Scope } from "./controller-part-04";
import type { Part5Scope } from "./controller-part-05";
import type { Part6Scope } from "./controller-part-06";
import { ReactNode, cn, shouldAutoLetterMatchingOptions } from "../dependencies";
import { PreviewGroup, parseBinaryInstructionLayout, parseBraceBoldText, softenInstructionText, typedOptionLines, typedOptionView } from "../shared";

export function useControllerPart7(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope & Part5Scope & Part6Scope) {
  const { textBlockRefs, theme, textHighlights, explanationHighlightQuote, reviewQuoteList, handleTextBlockMouseUp } = scope;
  function renderHighlightedText(blockKey: string, text: string) {
          const { plainText, boldRanges, italicRanges, bulletLineIndexes } = parseBraceBoldText(text);
          let highlights = (textHighlights[blockKey] ?? []).slice();
  
          if (blockKey.startsWith("passage-")) {
            // Highlight every answer's evidence quote in the passage during review
            // (always-on), plus whichever explanation card is currently focused.
            const quotesToHighlight = new Set<string>();
            for (const quote of reviewQuoteList) {
              const trimmed = quote.trim();
              if (trimmed.length > 3) quotesToHighlight.add(trimmed);
            }
            if (explanationHighlightQuote && explanationHighlightQuote.trim().length > 3) {
              quotesToHighlight.add(explanationHighlightQuote.trim());
            }
            for (const normalizedQuote of quotesToHighlight) {
              try {
                const escapedQuote = normalizedQuote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
                const regex = new RegExp(escapedQuote, 'g');
                let match;
                while ((match = regex.exec(plainText)) !== null) {
                  highlights.push({
                    id: `explanation-highlight-${match.index}`,
                    start: match.index,
                    end: match.index + match[0].length,
                  });
                }
              } catch (e) {
                // fallback to simple indexOf
                let searchStartIndex = 0;
                while (true) {
                  const index = plainText.indexOf(normalizedQuote, searchStartIndex);
                  if (index === -1) break;
                  highlights.push({
                    id: `explanation-highlight-${index}`,
                    start: index,
                    end: index + normalizedQuote.length,
                  });
                  searchStartIndex = index + normalizedQuote.length;
                }
              }
            }
          }
  
          // Merge overlapping ranges so multiple answer quotes never double-render text.
          highlights = highlights
            .sort((a, b) => a.start - b.start)
            .reduce<typeof highlights>((merged, current) => {
              const last = merged[merged.length - 1];
              if (last && current.start < last.end) {
                if (current.end > last.end) last.end = current.end;
                return merged;
              }
              merged.push({ ...current });
              return merged;
            }, []);
  
          function renderFormattedSlice(start: number, end: number, keyPrefix: string) {
            if (start >= end) {
              return null;
            }
  
            const parts: ReactNode[] = [];
            const overlappingBoldRanges = boldRanges.filter((range) => range.end > start && range.start < end);
            const overlappingItalicRanges = italicRanges.filter((range) => range.end > start && range.start < end);
            const boundaries = new Set<number>([start, end]);
  
            overlappingBoldRanges.forEach((range) => {
              boundaries.add(Math.max(start, range.start));
              boundaries.add(Math.min(end, range.end));
            });
            overlappingItalicRanges.forEach((range) => {
              boundaries.add(Math.max(start, range.start));
              boundaries.add(Math.min(end, range.end));
            });
  
            const sortedBoundaries = Array.from(boundaries).sort((left, right) => left - right);
            for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
              const segmentStart = sortedBoundaries[index] ?? start;
              const segmentEnd = sortedBoundaries[index + 1] ?? end;
              if (segmentEnd <= segmentStart) {
                continue;
              }
  
              const segmentText = plainText.slice(segmentStart, segmentEnd);
              const isBold = overlappingBoldRanges.some((range) => range.start < segmentEnd && range.end > segmentStart);
              const isItalic = overlappingItalicRanges.some((range) => range.start < segmentEnd && range.end > segmentStart);
  
              if (isBold) {
                parts.push(
                  <strong
                    key={`${keyPrefix}-segment-${index}-${segmentStart}`}
                    className={cn("font-bold text-inherit", isItalic && "italic")}
                  >
                    {segmentText}
                  </strong>
                );
                continue;
              }
  
              if (isItalic) {
                parts.push(
                  <em key={`${keyPrefix}-segment-${index}-${segmentStart}`} className="italic">
                    {segmentText}
                  </em>
                );
                continue;
              }
  
              parts.push(<span key={`${keyPrefix}-segment-${index}-${segmentStart}`}>{segmentText}</span>);
            }
  
            return parts.length > 0 ? parts : plainText.slice(start, end);
          }
  
          function renderHighlightedSlice(start: number, end: number, keyPrefix: string) {
            if (start >= end) {
              return null;
            }
  
            if (highlights.length === 0) {
              return renderFormattedSlice(start, end, `${keyPrefix}-base`);
            }
  
            const parts: ReactNode[] = [];
            let cursor = start;
            const overlappingHighlights = highlights.filter((highlight) => highlight.end > start && highlight.start < end);
  
            overlappingHighlights.forEach((highlight, index) => {
              const segmentStart = Math.max(start, highlight.start);
              const segmentEnd = Math.min(end, highlight.end);
  
              if (cursor < segmentStart) {
                parts.push(
                  <span key={`${keyPrefix}-before-${index}-${cursor}`}>
                    {renderFormattedSlice(cursor, segmentStart, `${keyPrefix}-before-${index}`)}
                  </span>
                );
              }
  
              if (segmentStart < segmentEnd) {
                const isExplanation = highlight.id.startsWith("explanation-highlight-");
                parts.push(
                  <span
                    key={`${highlight.id}-${segmentStart}-${segmentEnd}`}
                    className={cn(
                      isExplanation
                        ? cn(
                            "exam-text-highlight-explanation",
                            theme === "dark" && "exam-text-highlight-explanation-dark"
                          )
                        : cn("exam-text-highlight", theme === "dark" && "exam-text-highlight-dark")
                    )}
                  >
                    {renderFormattedSlice(segmentStart, segmentEnd, `${keyPrefix}-mark-${index}`)}
                  </span>
                );
              }
  
              cursor = segmentEnd;
            });
  
            if (cursor < end) {
              parts.push(
                <span key={`${keyPrefix}-tail-${cursor}`}>
                  {renderFormattedSlice(cursor, end, `${keyPrefix}-tail`)}
                </span>
              );
            }
  
            if (parts.length === 0) {
              return renderFormattedSlice(start, end, `${keyPrefix}-plain`);
            }
  
            return parts;
          }
  
          const lines = plainText.split("\n");
          if (lines.length === 1 && bulletLineIndexes.size === 0) {
            return renderHighlightedSlice(0, plainText.length, `${blockKey}-single`);
          }
  
          const rows: ReactNode[] = [];
          let lineStart = 0;
  
          lines.forEach((line, index) => {
            const lineEnd = lineStart + line.length;
            const lineContent = line.length > 0
              ? renderHighlightedSlice(lineStart, lineEnd, `${blockKey}-line-${index}`)
              : <span>&nbsp;</span>;
  
            rows.push(
              <span key={`${blockKey}-row-${index}`}>
                {bulletLineIndexes.has(index) ? (
                  <span className="my-0.5 ml-4 inline-flex max-w-full items-start gap-2 align-top">
                    <span className="mt-[0.55em] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                    <span className="min-w-0 flex-1">{lineContent}</span>
                  </span>
                ) : (
                  lineContent
                )}
                {index < lines.length - 1 ? <br /> : null}
              </span>
            );
  
            lineStart = lineEnd + 1;
          });
  
          return rows;
        }

  function renderFormattedText(text: string, keyPrefix: string) {
          return renderHighlightedText(keyPrefix, text);
        }

  function renderInstructionText(blockKey: string, text: string) {
          const softenedText = softenInstructionText(text);
          const binaryLayout = parseBinaryInstructionLayout(softenedText);
          if (!binaryLayout) {
            return renderHighlightedText(blockKey, softenedText);
          }
  
          return (
            <div className="space-y-2">
              {binaryLayout.prefix ? (
                <div
                  ref={(node) => {
                    textBlockRefs.current[`${blockKey}-prefix`] = node;
                  }}
                  data-highlight-text
                  onMouseUp={(event) => handleTextBlockMouseUp(`${blockKey}-prefix`, event)}
                  className="select-text whitespace-pre-wrap"
                >
                  {renderHighlightedText(`${blockKey}-prefix`, binaryLayout.prefix)}
                </div>
              ) : null}
              <div className="grid gap-y-1">
                {binaryLayout.optionRows.map((row, index) => (
                  <div key={`${blockKey}-row-${row.label}-${index}`} className="grid grid-cols-[5.5rem_1fr] items-start gap-x-1">
                    <strong className="font-bold text-foreground">{row.label}</strong>
                    <span>{row.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

  function optionBankWidthForGroup(group: PreviewGroup) {
          if (group.type.includes("listening_matching")) {
            return "18rem";
          }
  
          const longestChars = typedOptionLines(group).reduce((maxLength, option, index) => {
            const optionView = typedOptionView(option, index, group.type);
            const text = optionView.text || optionView.label || optionView.value;
            const hasPrefix =
              !group.type.includes("matching_headings")
              && (optionView.hasExplicitPrefix || shouldAutoLetterMatchingOptions(group.type));
            const displayText = hasPrefix ? `${optionView.value}. ${text}` : text;
            return Math.max(maxLength, displayText.trim().length);
          }, 18);
  
          return `${Math.max(18, longestChars + 6)}ch`;
        }

  function optionPanelTitleForGroup(group: PreviewGroup) {
          const customTitle = group.optionsTitle?.trim();
          if (customTitle) {
            return customTitle;
          }
          if (group.type.includes("matching_headings")) {
            return "List of Headings";
          }
          if (group.type.includes("matching_sentence_endings")) {
            return "Sentence Endings";
          }
          return "Options";
        }

  return { renderHighlightedText, renderFormattedText, renderInstructionText, optionBankWidthForGroup, optionPanelTitleForGroup };
}

export type Part7Scope = ReturnType<typeof useControllerPart7>;
