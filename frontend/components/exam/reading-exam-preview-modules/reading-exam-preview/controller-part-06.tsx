"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import type { Part2Scope } from "./controller-part-02";
import type { Part3Scope } from "./controller-part-03";
import type { Part4Scope } from "./controller-part-04";
import type { Part5Scope } from "./controller-part-05";
import { ReactPointerEvent } from "../dependencies";

export function useControllerPart6(scope: BaseScope & Part1Scope & Part2Scope & Part3Scope & Part4Scope & Part5Scope) {
  const { setActiveQuestionId, setDraggingHeading, setDragOverQuestionId, setDragOverHeadingBankGroupId, setDraggingWordBank, setDragOverWordBankQuestionId, setDragOverWordBankGroupId, setDragPreviewPosition, headingDragStateRef, persistAnswer, startHeadingDrag, resolveHeadingDropTarget, isHeadingBankDropTarget, resolveWordBankDropTarget, isWordBankBankDropTarget } = scope;
  function beginHeadingPointerDrag(
          event: ReactPointerEvent<HTMLElement>,
          payload: { groupId: string; value: string; sourceQuestionId?: string }
        ) {
          if (event.button !== 0) {
            return;
          }
  
          headingDragStateRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            groupId: payload.groupId,
            value: payload.value,
            sourceQuestionId: payload.sourceQuestionId,
            dragging: false,
          };
  
          const handlePointerMove = (moveEvent: PointerEvent) => {
            const state = headingDragStateRef.current;
            if (!state) {
              return;
            }
  
            if (!state.dragging) {
              const deltaX = Math.abs(moveEvent.clientX - state.startX);
              const deltaY = Math.abs(moveEvent.clientY - state.startY);
              if (Math.max(deltaX, deltaY) < 10) {
                return;
              }
  
              state.dragging = true;
              startHeadingDrag(state.groupId, state.value, state.sourceQuestionId);
              setDragPreviewPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
              document.body.style.cursor = "grabbing";
              document.body.style.userSelect = "none";
              window.getSelection()?.removeAllRanges();
            }
  
            setDragPreviewPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
            const targetQuestionId = resolveHeadingDropTarget(moveEvent.clientX, moveEvent.clientY, state.groupId);
            setDragOverQuestionId(targetQuestionId);
            setDragOverHeadingBankGroupId(
              targetQuestionId ? null : (isHeadingBankDropTarget(moveEvent.clientX, moveEvent.clientY, state.groupId) ? state.groupId : null)
            );
          };
  
          const cleanup = () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            headingDragStateRef.current = null;
            setDraggingHeading(null);
            setDragOverQuestionId(null);
            setDragOverHeadingBankGroupId(null);
            setDragPreviewPosition(null);
          };
  
          const handlePointerUp = (upEvent: PointerEvent) => {
            const state = headingDragStateRef.current;
            if (state?.dragging) {
              const targetQuestionId = resolveHeadingDropTarget(upEvent.clientX, upEvent.clientY, state.groupId);
              const droppedBackToBank = isHeadingBankDropTarget(upEvent.clientX, upEvent.clientY, state.groupId);
              if (targetQuestionId) {
                setActiveQuestionId(targetQuestionId);
                if (state.sourceQuestionId && state.sourceQuestionId !== targetQuestionId) {
                  persistAnswer(state.sourceQuestionId, "");
                }
                persistAnswer(targetQuestionId, state.value);
              } else if (droppedBackToBank && state.sourceQuestionId) {
                persistAnswer(state.sourceQuestionId, "");
              }
            }
  
            cleanup();
          };
  
          window.addEventListener("pointermove", handlePointerMove);
          window.addEventListener("pointerup", handlePointerUp);
          window.addEventListener("pointercancel", handlePointerUp);
        }

  function beginWordBankPointerDrag(
          event: ReactPointerEvent<HTMLElement>,
          payload: { groupId: string; value: string; sourceQuestionId?: string; previewLabel?: string }
        ) {
          if (event.button !== 0) {
            return;
          }
  
          const state = {
            startX: event.clientX,
            startY: event.clientY,
            groupId: payload.groupId,
            value: payload.value,
            sourceQuestionId: payload.sourceQuestionId,
            dragging: false,
          };
  
          const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!state.dragging) {
              const deltaX = Math.abs(moveEvent.clientX - state.startX);
              const deltaY = Math.abs(moveEvent.clientY - state.startY);
              if (Math.max(deltaX, deltaY) < 10) {
                return;
              }
  
              state.dragging = true;
              setDraggingWordBank({
                groupId: state.groupId,
                value: state.value,
                sourceQuestionId: state.sourceQuestionId,
                previewLabel: payload.previewLabel,
              });
              setDragPreviewPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
              document.body.style.cursor = "grabbing";
              document.body.style.userSelect = "none";
              window.getSelection()?.removeAllRanges();
            }
  
            setDragPreviewPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
            const targetQuestionId = resolveWordBankDropTarget(moveEvent.clientX, moveEvent.clientY, state.groupId);
            setDragOverWordBankQuestionId(targetQuestionId);
            setDragOverWordBankGroupId(
              targetQuestionId ? null : (isWordBankBankDropTarget(moveEvent.clientX, moveEvent.clientY, state.groupId) ? state.groupId : null)
            );
          };
  
          const cleanup = () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            setDraggingWordBank(null);
            setDragOverWordBankQuestionId(null);
            setDragOverWordBankGroupId(null);
            setDragPreviewPosition(null);
          };
  
          const handlePointerUp = (upEvent: PointerEvent) => {
            if (state.dragging) {
              const targetQuestionId = resolveWordBankDropTarget(upEvent.clientX, upEvent.clientY, state.groupId);
              const droppedBackToBank = isWordBankBankDropTarget(upEvent.clientX, upEvent.clientY, state.groupId);
              if (targetQuestionId) {
                setActiveQuestionId(targetQuestionId);
                if (state.sourceQuestionId && state.sourceQuestionId !== targetQuestionId) {
                  persistAnswer(state.sourceQuestionId, "");
                }
                persistAnswer(targetQuestionId, state.value);
              } else if (droppedBackToBank && state.sourceQuestionId) {
                persistAnswer(state.sourceQuestionId, "");
              }
            }
  
            cleanup();
          };
  
          window.addEventListener("pointermove", handlePointerMove);
          window.addEventListener("pointerup", handlePointerUp);
          window.addEventListener("pointercancel", handlePointerUp);
        }

  return { beginHeadingPointerDrag, beginWordBankPointerDrag };
}

export type Part6Scope = ReturnType<typeof useControllerPart6>;
