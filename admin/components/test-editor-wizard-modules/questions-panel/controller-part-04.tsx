"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import type { Part3Scope } from "./controller-part-03";
import { ReactPointerEvent, cn } from "../dependencies";

export function useControllerPart4(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope) {
  const { draggedGroupId, setDraggedGroupId, groupDropTarget, setGroupDropTarget, activeGroupDragRef, moveGroup, resolveGroupDropTargetFromPoint } = scope;
  const startGroupPointerDrag = (groupId: string, event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
  
      activeGroupDragRef.current = { groupId };
      setDraggedGroupId(groupId);
      setGroupDropTarget(null);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
  
      const handlePointerMove = (moveEvent: PointerEvent) => {
        const activeDrag = activeGroupDragRef.current;
        if (!activeDrag) return;
        setGroupDropTarget(resolveGroupDropTargetFromPoint(moveEvent.clientX, moveEvent.clientY, activeDrag.groupId));
      };
  
      const cleanup = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        activeGroupDragRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setDraggedGroupId(null);
        setGroupDropTarget(null);
      };
  
      const handlePointerUp = (upEvent: PointerEvent) => {
        const activeDrag = activeGroupDragRef.current;
        if (!activeDrag) {
          cleanup();
          return;
        }
  
        const targetDrop = resolveGroupDropTargetFromPoint(upEvent.clientX, upEvent.clientY, activeDrag.groupId);
        if (targetDrop) {
          moveGroup(activeDrag.groupId, targetDrop.sectionId, targetDrop.beforeGroupId);
        }
        cleanup();
      };
  
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    };

  const renderGroupDropZone = (sectionId: string, beforeGroupId: string | null) => {
      const isActiveTarget =
        Boolean(draggedGroupId)
        && groupDropTarget?.sectionId === sectionId
        && groupDropTarget?.beforeGroupId === beforeGroupId;
  
      return (
        <div
          key={`${sectionId}-${beforeGroupId ?? "end"}`}
          data-group-drop-section-id={sectionId}
          data-group-drop-before-id={beforeGroupId ?? ""}
          className={cn(
            "rounded-lg border border-dashed px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] transition",
            draggedGroupId
              ? isActiveTarget
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/70 bg-muted/20 text-muted-foreground hover:border-primary/40"
              : "pointer-events-none h-0 overflow-hidden border-transparent p-0 text-transparent"
          )}
        >
          Drop group here
        </div>
      );
    };

  return { startGroupPointerDrag, renderGroupDropZone };
}

export type Part4Scope = ReturnType<typeof useControllerPart4>;
