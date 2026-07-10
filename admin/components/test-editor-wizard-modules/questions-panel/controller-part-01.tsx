"use client";
import type { BaseScope } from "./base";
import { AdminTestDraftQuestionGroup, useEffect, useMemo, usePathname, useRef, useState } from "../dependencies";
import { createDraftId, defaultInstructions, normalizeQuestionGroups, reorderQuestionGroupsForDrop } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { draft, setDraft } = scope;
  const pathname = usePathname();

  const sectionLabelPrefix = draft.metadata.type === "reading" ? "Passage" : "Part";

  const [questionBlockSizes, setQuestionBlockSizes] = useState<Record<string, { width: number; height: number }>>({});

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null);

  const [collapseStateReady, setCollapseStateReady] = useState(false);

  const [panelSplitOffset, setPanelSplitOffset] = useState<number>(0);

  const [isDraggingPanelSplit, setIsDraggingPanelSplit] = useState(false);

  const [questionEditorGridWidths, setQuestionEditorGridWidths] = useState<Record<string, number>>({});

  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);

  const [groupDropTarget, setGroupDropTarget] = useState<{ sectionId: string; beforeGroupId: string | null } | null>(null);

  const questionBlockRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const questionEditorGridRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const questionsLayoutRef = useRef<HTMLDivElement | null>(null);

  const activeGroupDragRef = useRef<{ groupId: string } | null>(null);

  const collapseStorageKey = useMemo(() => `admin-question-groups:${pathname}`, [pathname]);

  const questionBlockSizeStorageKey = useMemo(() => `admin-question-block-sizes:${pathname}`, [pathname]);

  const panelSplitStorageKey = useMemo(() => `admin-question-panel-split:${pathname}`, [pathname]);

  const clampPanelSplitOffset = (value: number) => Math.max(-14, Math.min(18, value));

  useEffect(() => {
      let storedCollapsedGroups: Record<string, boolean> = {};
      let storedQuestionBlockSizes: Record<string, { width: number; height: number }> = {};
      if (typeof window !== "undefined") {
        try {
          storedCollapsedGroups = JSON.parse(window.localStorage.getItem(collapseStorageKey) ?? "{}") as Record<string, boolean>;
        } catch {
          storedCollapsedGroups = {};
        }
        try {
          storedQuestionBlockSizes = JSON.parse(window.localStorage.getItem(questionBlockSizeStorageKey) ?? "{}") as Record<string, { width: number; height: number }>;
        } catch {
          storedQuestionBlockSizes = {};
        }
      }
  
      setCollapsedGroups((current) => {
        const next: Record<string, boolean> = {};
        for (const group of draft.questionGroups ?? []) {
          next[group.id] = current[group.id] ?? storedCollapsedGroups[group.id] ?? false;
        }
        return next;
      });
      setQuestionBlockSizes((current) => {
        const next: Record<string, { width: number; height: number }> = {};
        for (const group of draft.questionGroups ?? []) {
          const existing = current[group.id] ?? storedQuestionBlockSizes[group.id];
          if (existing?.width && existing?.height) {
            next[group.id] = existing;
          }
        }
        return next;
      });
      setCollapseStateReady(true);
    }, [collapseStorageKey, draft.questionGroups, questionBlockSizeStorageKey]);

  useEffect(() => {
      if (!collapseStateReady || typeof window === "undefined") return;
      const snapshot: Record<string, boolean> = {};
      for (const group of draft.questionGroups ?? []) {
        snapshot[group.id] = collapsedGroups[group.id] ?? false;
      }
      window.localStorage.setItem(collapseStorageKey, JSON.stringify(snapshot));
    }, [collapseStateReady, collapseStorageKey, collapsedGroups, draft.questionGroups]);

  useEffect(() => {
      if (typeof window === "undefined") return;
      const snapshot: Record<string, { width: number; height: number }> = {};
      for (const group of draft.questionGroups ?? []) {
        const size = questionBlockSizes[group.id];
        if (size?.width && size?.height) {
          snapshot[group.id] = size;
        }
      }
      window.localStorage.setItem(questionBlockSizeStorageKey, JSON.stringify(snapshot));
    }, [draft.questionGroups, questionBlockSizes, questionBlockSizeStorageKey]);

  useEffect(() => {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(panelSplitStorageKey);
      if (!raw) return;
      const parsed = Number.parseFloat(raw);
      if (!Number.isFinite(parsed)) return;
      setPanelSplitOffset(clampPanelSplitOffset(parsed));
    }, [panelSplitStorageKey]);

  useEffect(() => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(panelSplitStorageKey, String(clampPanelSplitOffset(panelSplitOffset)));
    }, [panelSplitOffset, panelSplitStorageKey]);

  useEffect(() => {
      if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return;
      const observers: ResizeObserver[] = [];
  
      for (const group of draft.questionGroups ?? []) {
        const node = questionBlockRefs.current[group.id];
        if (!node) continue;
  
        const observer = new ResizeObserver(() => {
          const width = node.offsetWidth;
          const height = node.offsetHeight;
          if (!width || !height) return;
  
          setQuestionBlockSizes((current) => {
            const existing = current[group.id];
            if (existing?.width === width && existing?.height === height) {
              return current;
            }
            return {
              ...current,
              [group.id]: { width, height },
            };
          });
        });
  
        observer.observe(node);
        observers.push(observer);
      }
  
      return () => {
        observers.forEach((observer) => observer.disconnect());
      };
    }, [draft.questionGroups]);

  useEffect(() => {
      if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return;
      const observers: ResizeObserver[] = [];
  
      for (const group of draft.questionGroups ?? []) {
        const node = questionEditorGridRefs.current[group.id];
        if (!node) continue;
  
        const observer = new ResizeObserver(() => {
          const width = node.offsetWidth;
          if (!width) return;
  
          setQuestionEditorGridWidths((current) => {
            if (current[group.id] === width) {
              return current;
            }
            return {
              ...current,
              [group.id]: width,
            };
          });
        });
  
        observer.observe(node);
        observers.push(observer);
      }
  
      return () => {
        observers.forEach((observer) => observer.disconnect());
      };
    }, [draft.questionGroups]);

  const addGroup = (sectionId?: string) => {
      const groups = draft.questionGroups ?? [];
      const typeId = draft.metadata.type === "listening" ? "listening_form_completion" : "reading_true_false_not_given";
      const targetSectionId = sectionId ?? draft.content.sections[0]?.id ?? "";
      const newGroup: AdminTestDraftQuestionGroup = {
        id: createDraftId("draft-group"),
        sectionId: targetSectionId,
        title: "",
        instructions: defaultInstructions[typeId] || "Enter instructions for this group of questions.",
        optionsTitle: "",
        typeId,
        questionStart: 1,
        questionEnd: 1,
        sharedOptions: [],
        questions: []
      };
      setDraft((current) => ({
        ...current,
        questionGroups: normalizeQuestionGroups(
          reorderQuestionGroupsForDrop(
            [...(current.questionGroups ?? []), newGroup],
            current.content.sections,
            newGroup.id,
            targetSectionId,
            null,
          ),
          current.metadata.type,
          current.metadata.format,
          current.content.sections,
        )
      }));
    };

  const moveGroup = (groupId: string, targetSectionId: string, beforeGroupId: string | null) => {
      setDraft((current) => ({
        ...current,
        questionGroups: normalizeQuestionGroups(
          reorderQuestionGroupsForDrop(
            current.questionGroups ?? [],
            current.content.sections,
            groupId,
            targetSectionId,
            beforeGroupId,
          ),
          current.metadata.type,
          current.metadata.format,
          current.content.sections,
        ),
      }));
    };

  return { pathname, sectionLabelPrefix, questionBlockSizes, setQuestionBlockSizes, collapsedGroups, setCollapsedGroups, deleteConfirmGroupId, setDeleteConfirmGroupId, collapseStateReady, setCollapseStateReady, panelSplitOffset, setPanelSplitOffset, isDraggingPanelSplit, setIsDraggingPanelSplit, questionEditorGridWidths, setQuestionEditorGridWidths, draggedGroupId, setDraggedGroupId, groupDropTarget, setGroupDropTarget, questionBlockRefs, questionEditorGridRefs, questionsLayoutRef, activeGroupDragRef, collapseStorageKey, questionBlockSizeStorageKey, panelSplitStorageKey, clampPanelSplitOffset, addGroup, moveGroup };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
