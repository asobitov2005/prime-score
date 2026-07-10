"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import { AdminTestDraftQuestionGroup, useEffect, useMemo } from "../dependencies";
import { normalizeQuestionGroups } from "../shared";

export function useControllerPart3(scope: BaseScope & Part1Scope & Part2Scope) {
  const { draft, setDraft, sectionLabelPrefix, questionBlockSizes, panelSplitOffset, setPanelSplitOffset, isDraggingPanelSplit, setIsDraggingPanelSplit, draggedGroupId, setDraggedGroupId, setGroupDropTarget, questionsLayoutRef, clampPanelSplitOffset, moveGroup } = scope;
  const removeQuestion = (groupId: string, questionId: string) => {
      setDraft((current) => ({
        ...current,
        questionGroups: normalizeQuestionGroups((current.questionGroups ?? []).map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            questions: g.questions.filter((q) => q.id !== questionId)
          };
        }), current.metadata.type, current.metadata.format, current.content.sections)
      }));
    };

  const resolveLogicalIndex = (uiIndex: number) => {
      if (draft.metadata.format === "full") return uiIndex;
      
      // Log for debugging
      console.log("[DEBUG] format:", draft.metadata.format);
      
      // Support new explicit formats (passage_1, passage_2, part_3)
      if (draft.metadata.format.includes("_")) {
        const formatSuffix = parseInt(draft.metadata.format.split("_")[1]);
        if (!isNaN(formatSuffix)) return formatSuffix - 1; // 1-based to 0-based index
      }
      
      // Fallback for legacy "part" format if present
      return uiIndex;
    };

  const getIeltsRangeStr = (uiIndex: number) => {
      const index = resolveLogicalIndex(uiIndex);
      if (draft.metadata.type === "listening") {
        const start = index * 10 + 1;
        const end = (index + 1) * 10;
        return `${start}-${end}`;
      }
      if (index === 0) return "1-13";
      if (index === 1) return "14-26";
      if (index === 2) return "27-40";
      return "X-Y";
    };

  const getIeltsIntroStr = (uiIndex: number) => {
      const index = resolveLogicalIndex(uiIndex);
      const range = getIeltsRangeStr(uiIndex);
      if (draft.metadata.type === "listening") {
        return `Part ${index + 1}. Questions ${range}.`;
      }
      return `You should spend about 20 minutes on Questions ${range}, which are based on Reading Passage ${index + 1} below.`;
    };

  useEffect(() => {
      setDraft((current) => {
        const normalized = normalizeQuestionGroups(
          current.questionGroups ?? [],
          current.metadata.type,
          current.metadata.format,
          current.content.sections,
        );
        if (JSON.stringify(normalized) === JSON.stringify(current.questionGroups ?? [])) {
          return current;
        }
        return {
          ...current,
          questionGroups: normalized,
        };
      });
    }, [draft.metadata.format, draft.metadata.type, setDraft]);

  const groupedQuestionGroups = useMemo(() => {
      const grouped: Array<{
        key: string;
        sectionId: string | null;
        sectionLabel: string;
        groups: AdminTestDraftQuestionGroup[];
        canAddGroups: boolean;
      }> = draft.content.sections
        .map((section, index) => ({
          key: section.id,
          sectionId: section.id,
          sectionLabel: `${sectionLabelPrefix} ${index + 1}`,
          groups: (draft.questionGroups ?? []).filter((group) => group.sectionId === section.id),
          canAddGroups: true,
        }));
  
      const orphanGroups = (draft.questionGroups ?? []).filter(
        (group) => !draft.content.sections.some((section) => section.id === group.sectionId)
      );
      if (orphanGroups.length > 0) {
        grouped.push({
          key: "unassigned",
          sectionId: null,
          sectionLabel: `${sectionLabelPrefix} ?`,
          groups: orphanGroups,
          canAddGroups: false,
        });
      }
      return grouped;
    }, [draft.content.sections, draft.questionGroups, sectionLabelPrefix]);

  const widestQuestionBlockWidth = useMemo(() => {
      const widths = Object.values(questionBlockSizes)
        .map((size) => size.width)
        .filter((width): width is number => Number.isFinite(width) && width > 0);
      if (widths.length === 0) {
        return 620;
      }
      return Math.min(1280, Math.max(320, Math.max(...widths)));
    }, [questionBlockSizes]);

  const answerPanelMinWidth = 180;

  const questionAnswerGap = 12;

  const editorDemandWidth = widestQuestionBlockWidth + answerPanelMinWidth + questionAnswerGap;

  const baseReviewWidth = useMemo(() => {
      if (editorDemandWidth >= 1080) {
        return 24;
      }
      if (editorDemandWidth >= 980) {
        return 26;
      }
      if (editorDemandWidth >= 900) {
        return 28;
      }
      if (editorDemandWidth >= 820) {
        return 30;
      }
      if (editorDemandWidth >= 740) {
        return 32;
      }
      return 34;
    }, [editorDemandWidth]);

  const reviewWidthPercent = useMemo(() => {
      return Math.max(24, Math.min(48, baseReviewWidth + panelSplitOffset));
    }, [baseReviewWidth, panelSplitOffset]);

  const editorWidthPercent = 100 - reviewWidthPercent;

  const questionsGridColumns = `minmax(0,${editorWidthPercent}%) minmax(220px,${reviewWidthPercent}%)`;

  const dividerViewportLeft = (() => {
      const layout = questionsLayoutRef.current?.getBoundingClientRect();
      if (!layout) return null;
      return layout.left + (layout.width * editorWidthPercent) / 100;
    })();

  useEffect(() => {
      if (!isDraggingPanelSplit) return;
  
      const handlePointerMove = (event: PointerEvent) => {
        const layout = questionsLayoutRef.current?.getBoundingClientRect();
        if (!layout || layout.width <= 0) return;
  
        const pointerRatio = (event.clientX - layout.left) / layout.width;
        const nextEditorWidth = Math.max(52, Math.min(76, pointerRatio * 100));
        const nextReviewWidth = 100 - nextEditorWidth;
        setPanelSplitOffset(clampPanelSplitOffset(nextReviewWidth - baseReviewWidth));
      };
  
      const stopDragging = () => {
        setIsDraggingPanelSplit(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
  
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
  
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", stopDragging);
      window.addEventListener("pointercancel", stopDragging);
  
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", stopDragging);
        window.removeEventListener("pointercancel", stopDragging);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }, [baseReviewWidth, isDraggingPanelSplit]);

  const handleGroupDrop = (sectionId: string, beforeGroupId: string | null) => {
      if (!draggedGroupId) return;
      moveGroup(draggedGroupId, sectionId, beforeGroupId);
      setDraggedGroupId(null);
      setGroupDropTarget(null);
    };

  const resolveGroupDropTargetFromPoint = (clientX: number, clientY: number, draggedId: string) => {
      const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const cardTarget = target?.closest("[data-group-card-id]") as HTMLElement | null;
  
      if (cardTarget) {
        const sectionId = cardTarget.dataset.groupSectionId ?? "";
        const currentGroupId = cardTarget.dataset.groupCardId ?? "";
        const nextGroupId = cardTarget.dataset.groupNextGroupId || null;
        if (!sectionId || !currentGroupId || currentGroupId === draggedId) {
          return null;
        }
  
        const bounds = cardTarget.getBoundingClientRect();
        const midpointY = bounds.top + bounds.height / 2;
        return {
          sectionId,
          beforeGroupId: clientY < midpointY ? currentGroupId : nextGroupId,
        };
      }
  
      const zoneTarget = target?.closest("[data-group-drop-section-id]") as HTMLElement | null;
      if (zoneTarget) {
        const sectionId = zoneTarget.dataset.groupDropSectionId ?? "";
        const beforeGroupId = zoneTarget.dataset.groupDropBeforeId || null;
        if (sectionId) {
          return { sectionId, beforeGroupId };
        }
      }
  
      return null;
    };

  return { removeQuestion, resolveLogicalIndex, getIeltsRangeStr, getIeltsIntroStr, groupedQuestionGroups, widestQuestionBlockWidth, answerPanelMinWidth, questionAnswerGap, editorDemandWidth, baseReviewWidth, reviewWidthPercent, editorWidthPercent, questionsGridColumns, dividerViewportLeft, handleGroupDrop, resolveGroupDropTargetFromPoint };
}

export type Part3Scope = ReturnType<typeof useControllerPart3>;
