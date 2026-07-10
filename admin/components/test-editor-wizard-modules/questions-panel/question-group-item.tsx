"use client";
import type { QuestionsPanelScope } from "./controller";
import { CSSProperties, listeningQuestionTypes, readingQuestionTypes } from "../dependencies";
import { analyzeBinaryStatementGroup, analyzeCompletionGroup, analyzeMatchingHeadingsGroup, analyzeMatchingInformationGroup, collectGroupIssues, isBinaryStatementType, isBracketCompletionType, isMatchingInformationType, isQuestionConfigured, previewTypeLabel } from "../shared";

export function buildQuestionGroupItem(
  scope: QuestionsPanelScope,
  sectionGroup: QuestionsPanelScope["groupedQuestionGroups"][number],
  group: NonNullable<QuestionsPanelScope["draft"]["questionGroups"]>[number],
  groupIndex: number,
) {
  const { draft, collapsedGroups, deleteConfirmGroupId, questionBlockSizes, questionEditorGridWidths, answerPanelMinWidth, questionAnswerGap, groupDropTarget, draggedGroupId } = scope;
  const nextGroupId = sectionGroup.groups[groupIndex + 1]?.id ?? null;

  const matchingHeadingsMeta = group.typeId.includes("matching_headings")
              ? analyzeMatchingHeadingsGroup(group, draft.content.sections)
              : null;

  const matchingInformationMeta = isMatchingInformationType(group.typeId)
              ? analyzeMatchingInformationGroup(group, draft.content.sections)
              : null;

  const binaryStatementsMeta = isBinaryStatementType(group.typeId)
              ? analyzeBinaryStatementGroup(group)
              : null;

  const completionMeta = isBracketCompletionType(group.typeId)
              ? analyzeCompletionGroup(group)
              : null;

  const groupIssues = collectGroupIssues(group, draft.content.sections);

  const questionTypeLabel =
              (draft.metadata.type === "listening" ? listeningQuestionTypes : readingQuestionTypes).find((option) => option.id === group.typeId)?.label
              ?? previewTypeLabel(group.typeId);

  const configuredQuestions = group.questions.filter((question) => isQuestionConfigured(group, question)).length;

  const isGroupValid =
              group.questions.length > 0
              && configuredQuestions === group.questions.length
              && group.questionEnd >= group.questionStart
              && groupIssues.length === 0;

  const isGroupCollapsed = collapsedGroups[group.id] ?? false;

  const showDeleteConfirm = deleteConfirmGroupId === group.id;

  const questionBlockSize = questionBlockSizes[group.id];

  const questionEditorGridWidth = questionEditorGridWidths[group.id] ?? null;

  const maxQuestionBlockWidth =
              questionEditorGridWidth && questionEditorGridWidth > answerPanelMinWidth + questionAnswerGap + 220
                ? questionEditorGridWidth - answerPanelMinWidth - questionAnswerGap
                : 1280;

  const clampedQuestionBlockWidth = questionBlockSize?.width
              ? Math.min(maxQuestionBlockWidth, Math.max(320, questionBlockSize.width))
              : null;

  const questionEditorGridStyle = {
              "--question-block-width": clampedQuestionBlockWidth ? `${clampedQuestionBlockWidth}px` : "1fr",
            } as CSSProperties;

  const isDropBefore =
              groupDropTarget?.sectionId === sectionGroup.sectionId
              && groupDropTarget?.beforeGroupId === group.id;

  const isDropAfter =
              groupDropTarget?.sectionId === sectionGroup.sectionId
              && groupDropTarget?.beforeGroupId === nextGroupId
              && draggedGroupId !== group.id;

  return { sectionGroup, group, groupIndex, nextGroupId, matchingHeadingsMeta, matchingInformationMeta, binaryStatementsMeta, completionMeta, groupIssues, questionTypeLabel, configuredQuestions, isGroupValid, isGroupCollapsed, showDeleteConfirm, questionBlockSize, questionEditorGridWidth, maxQuestionBlockWidth, clampedQuestionBlockWidth, questionEditorGridStyle, isDropBefore, isDropAfter };
}

export type QuestionGroupItem = ReturnType<typeof buildQuestionGroupItem>;
