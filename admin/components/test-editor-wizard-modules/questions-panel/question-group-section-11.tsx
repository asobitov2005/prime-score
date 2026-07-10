"use client";
import type { QuestionsPanelScope } from "./controller";
import type { QuestionGroupItem } from "./question-group-item";
import { cn } from "../dependencies";
import { QuestionGroupSection2 } from "./question-group-section-11.tsx";

export function QuestionGroupSection1({ scope, item }: { scope: QuestionsPanelScope; item: QuestionGroupItem }) {
  const { renderGroupDropZone } = scope;
  const { group, sectionGroup, nextGroupId, isDropBefore, isDropAfter } = item;
  return (
    (
              <div
                key={group.id}
                data-group-card-id={group.id}
                data-group-section-id={sectionGroup.sectionId ?? ""}
                data-group-next-group-id={nextGroupId ?? ""}
                className={cn(
                  "space-y-3 rounded-2xl transition",
                  isDropBefore && "ring-2 ring-primary/35 ring-offset-2 ring-offset-background",
                  isDropAfter && "shadow-[0_10px_0_-6px_rgba(59,130,246,0.45)]"
                )}
              >
              <QuestionGroupSection2 scope={scope} item={item} />
              {sectionGroup.sectionId ? renderGroupDropZone(sectionGroup.sectionId, nextGroupId) : null}
              </div>
              )
  );
}
