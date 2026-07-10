"use client";
import type { QuestionsPanelScope } from "./controller";
import { Button } from "../dependencies";
import { QuestionGroupList } from "./question-group-list";
export function QuestionSectionGroups({ scope }: { scope: QuestionsPanelScope }) {
  const { groupedQuestionGroups, sectionLabelPrefix, addGroup, renderGroupDropZone } = scope;
  return (
    <>{groupedQuestionGroups.map((sectionGroup) => (
          <div key={sectionGroup.key} className="flex gap-3 md:gap-4">
            <div className="hidden md:flex w-[60px] shrink-0 items-stretch gap-1 pt-1">
              <div className="flex w-[24px] items-center justify-center rounded-lg border border-border/70 bg-card/70 px-1 py-2 shadow-sm">
                <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  {sectionGroup.sectionLabel}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden text-border/85" aria-hidden="true">
                <span className="translate-x-0.5 text-[82px] font-light leading-[0.72]">{`{`}</span>
              </div>
            </div>
            <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{sectionGroup.sectionLabel}</p>
            <p className="text-xs text-muted-foreground">
              {sectionGroup.groups.length > 0
                ? `${sectionGroup.groups.length} group${sectionGroup.groups.length === 1 ? "" : "s"} in this ${sectionLabelPrefix.toLowerCase()}.`
                : `No groups yet in this ${sectionLabelPrefix.toLowerCase()}.`}
            </p>
          </div>
          {sectionGroup.canAddGroups && sectionGroup.sectionId ? (
            <Button type="button" variant="solid" size="sm" onClick={() => addGroup(sectionGroup.sectionId ?? undefined)}>
              + Add Group
            </Button>
          ) : null}
        </div>
        {sectionGroup.sectionId ? renderGroupDropZone(sectionGroup.sectionId, sectionGroup.groups[0]?.id ?? null) : null}
        <QuestionGroupList scope={scope} sectionGroup={sectionGroup} />
            </div>
          </div>
        ))}</>
  );
}
