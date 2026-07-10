"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import type { Part3Scope } from "./controller-part-03";
import type { Part4Scope } from "./controller-part-04";
import { ReactMouseEvent, ReactPointerEvent, cn } from "../dependencies";
import { TextHighlight, findSectionIdForQuestion, getHighlightTextOffsets } from "../shared";

export function useControllerPart5(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope) {
  const { router, readingPaneRef, questionPaneRef, textBlockRefs, examData, isSubmitted, isFullscreen, setFullscreenDialogStage, setActiveQuestionId, setActiveSectionId, setShowPassageQuestionNav, setIsDraggingSplit, setDraggingHeading, setTextHighlights, selectionToolbar, setSelectionToolbar, allowLeaveRef, ignoreNextFullscreenExitRef, updateActiveDialog, previewSections, isExamMode, isReviewMode, writeAttemptBackup, markSyncError, flushPendingAnswerSaves, flushPendingProgressSave, submitAttempt } = scope;
  async function confirmFullscreenExit() {
          ignoreNextFullscreenExitRef.current = true;
          if (document.fullscreenElement) {
            try {
              await document.exitFullscreen();
            } catch {}
          }
          await submitAttempt("exit_fullscreen");
        }

  function selectSection(sectionId: string) {
          const targetSection = previewSections.find((section) => section.id === sectionId);
          if (!targetSection) {
            return;
          }
  
          setActiveSectionId(sectionId);
          setShowPassageQuestionNav(true);
          setActiveQuestionId(targetSection.questions[0]?.id ?? "");
          readingPaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          questionPaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }

  function navigateToQuestion(questionId: string) {
          setActiveSectionId(findSectionIdForQuestion(questionId, examData.questionGroups, examData.paragraphs));
          setActiveQuestionId(questionId);
          setShowPassageQuestionNav(true);
  
          const inlineBlank = questionPaneRef.current?.querySelector<HTMLElement>(`[data-question-anchor="${questionId}"]`);
          if (inlineBlank) {
            inlineBlank.scrollIntoView({ behavior: "smooth", block: "center" });
            window.setTimeout(() => {
              if ("focus" in inlineBlank && typeof inlineBlank.focus === "function") {
                inlineBlank.focus();
              }
            }, 120);
            return;
          }
  
          const questionCard = questionPaneRef.current?.querySelector<HTMLElement>(`[id="${questionId}"]`);
          if (questionCard) {
            questionCard.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
  
          document
            .querySelector<HTMLElement>(`[data-heading-drop-question-id="${questionId}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }

  async function toggleFullscreen() {
          if (isExamMode && isFullscreen && !isReviewMode && !isSubmitted) {
            setFullscreenDialogStage("confirm-exit");
            updateActiveDialog("fullscreen");
            return;
          }
  
          try {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen();
              return;
            }
            await document.exitFullscreen();
          } catch {}
        }

  const headerControlClass = cn(
          "border-border bg-card text-foreground transition-colors hover:bg-muted"
        );

  async function confirmLeave() {
          allowLeaveRef.current = true;
          updateActiveDialog(null);
          writeAttemptBackup();
  
          if (examData.attemptId && !isSubmitted) {
            try {
              await flushPendingAnswerSaves();
              await flushPendingProgressSave();
            } catch {
              markSyncError();
            }
          }
  
          if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => undefined);
          }
  
          const exitHref = examData.exitHref ?? "/tests?type=reading";
          const separator = exitHref.includes("?") ? "&" : "?";
          router.push(`${exitHref}${separator}refresh=${Date.now()}`);
        }

  function startSplitDrag(event: ReactPointerEvent<HTMLButtonElement>) {
          event.preventDefault();
          setIsDraggingSplit(true);
        }

  function clearSelection() {
          window.getSelection()?.removeAllRanges();
          setSelectionToolbar(null);
        }

  function hasActiveSelection() {
          const selection = window.getSelection();
          return Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
        }

  function getTextOffsets(blockNode: HTMLElement, range: Range) {
          return getHighlightTextOffsets(blockNode, range);
        }

  function handleTextBlockMouseUp(blockKey: string, event?: ReactMouseEvent<HTMLElement>) {
          const pointerTop = event ? event.clientY + 12 : null;
          const pointerLeft = event ? event.clientX : null;
  
          window.setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed || selection.toString().trim().length === 0) {
              setSelectionToolbar(null);
              return;
            }
  
            const range = selection.getRangeAt(0);
            const blockNode = textBlockRefs.current[blockKey];
            if (!blockNode || !blockNode.contains(range.commonAncestorContainer)) {
              setSelectionToolbar(null);
              return;
            }
  
            const { start, end } = getTextOffsets(blockNode, range);
            if (start === end) {
              setSelectionToolbar(null);
              return;
            }
  
            const rect = range.getBoundingClientRect();
            setSelectionToolbar({
              blockKey,
              start,
              end,
              top: pointerTop ?? (rect.bottom + 10),
              left: pointerLeft ?? (rect.left + rect.width / 2),
            });
          }, 0);
        }

  function normalizeHighlights(highlights: TextHighlight[]) {
          const sorted = [...highlights].sort((a, b) => a.start - b.start);
          const merged: TextHighlight[] = [];
  
          for (const highlight of sorted) {
            const last = merged[merged.length - 1];
            if (!last || highlight.start > last.end) {
              merged.push(highlight);
              continue;
            }
            last.end = Math.max(last.end, highlight.end);
          }
  
          return merged;
        }

  function applyHighlight() {
          if (!selectionToolbar) return;
  
          setTextHighlights((current) => {
            const existing = current[selectionToolbar.blockKey] ?? [];
            const next = normalizeHighlights([
              ...existing,
              {
                id: `${selectionToolbar.blockKey}-${selectionToolbar.start}-${selectionToolbar.end}-${Date.now()}`,
                start: selectionToolbar.start,
                end: selectionToolbar.end,
              },
            ]);
  
            return {
              ...current,
              [selectionToolbar.blockKey]: next,
            };
          });
  
          clearSelection();
        }

  function clearHighlight() {
          if (!selectionToolbar) return;
  
          setTextHighlights((current) => {
            const existing = current[selectionToolbar.blockKey] ?? [];
            const next = existing.filter(
              (highlight) =>
                highlight.end <= selectionToolbar.start || highlight.start >= selectionToolbar.end
            );
  
            return {
              ...current,
              [selectionToolbar.blockKey]: next,
            };
          });
  
          clearSelection();
        }

  function startHeadingDrag(groupId: string, value: string, sourceQuestionId?: string) {
          setDraggingHeading({
            groupId,
            value,
            sourceQuestionId,
          });
        }

  function resolveHeadingDropTarget(clientX: number, clientY: number, groupId: string) {
          const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
          const dropTarget = target?.closest("[data-heading-drop-question-id]") as HTMLElement | null;
          if (!dropTarget) {
            return null;
          }
  
          if (dropTarget.dataset.headingDropGroupId !== groupId) {
            return null;
          }
  
          return dropTarget.dataset.headingDropQuestionId ?? null;
        }

  function isHeadingBankDropTarget(clientX: number, clientY: number, groupId: string) {
          const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
          const bankTarget = target?.closest("[data-heading-bank-group-id]") as HTMLElement | null;
          if (!bankTarget) {
            return false;
          }
  
          return bankTarget.dataset.headingBankGroupId === groupId;
        }

  function resolveWordBankDropTarget(clientX: number, clientY: number, groupId: string) {
          const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
          const dropTarget = target?.closest("[data-wordbank-drop-question-id]") as HTMLElement | null;
          if (!dropTarget) {
            return null;
          }
  
          if (dropTarget.dataset.wordbankDropGroupId !== groupId) {
            return null;
          }
  
          return dropTarget.dataset.wordbankDropQuestionId ?? null;
        }

  function isWordBankBankDropTarget(clientX: number, clientY: number, groupId: string) {
          const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
          const bankTarget = target?.closest("[data-wordbank-bank-group-id]") as HTMLElement | null;
          if (!bankTarget) {
            return false;
          }
  
          return bankTarget.dataset.wordbankBankGroupId === groupId;
        }

  return { confirmFullscreenExit, selectSection, navigateToQuestion, toggleFullscreen, headerControlClass, confirmLeave, startSplitDrag, clearSelection, hasActiveSelection, getTextOffsets, handleTextBlockMouseUp, normalizeHighlights, applyHighlight, clearHighlight, startHeadingDrag, resolveHeadingDropTarget, isHeadingBankDropTarget, resolveWordBankDropTarget, isWordBankBankDropTarget };
}

export type Part5Scope = ReturnType<typeof useControllerPart5>;
