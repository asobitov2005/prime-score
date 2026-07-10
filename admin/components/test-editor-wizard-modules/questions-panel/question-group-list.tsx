"use client";
import type { QuestionsPanelScope } from "./controller";
import { buildQuestionGroupItem } from "./question-group-item";
import { QuestionGroupCard } from "./question-group-card";

export function QuestionGroupList({ scope, sectionGroup }: { scope: QuestionsPanelScope; sectionGroup: QuestionsPanelScope["groupedQuestionGroups"][number] }) {
  return (
    <>
      {sectionGroup.groups.map((group, groupIndex) => (
        <QuestionGroupCard key={group.id} scope={scope} item={buildQuestionGroupItem(scope, sectionGroup, group, groupIndex)} />
      ))}
    </>
  );
}
