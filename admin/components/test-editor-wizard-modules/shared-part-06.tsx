"use client";

import { AdminTestDraftContentSection, AdminTestDraftQuestion, AdminTestDraftQuestionGroup, AdminTestDraftState } from "./dependencies";

import { createDraftId, splitNonEmptyLines } from "./shared-part-01";

import { normalizeMatchingHeadingAnswerLine } from "./shared-part-02";

import { isBinaryStatementType } from "./shared-part-03";

import { findSectionInsertIndex } from "./shared-part-05";



export function reorderQuestionGroupsForDrop(
  groups: AdminTestDraftQuestionGroup[],
  sections: AdminTestDraftContentSection[],
  draggedGroupId: string,
  targetSectionId: string,
  beforeGroupId: string | null,
) {
  if (beforeGroupId === draggedGroupId) {
    return groups;
  }

  const draggedGroup = groups.find((group) => group.id === draggedGroupId);
  if (!draggedGroup) {
    return groups;
  }

  const remainingGroups = groups.filter((group) => group.id !== draggedGroupId);
  const targetIndex = beforeGroupId
    ? remainingGroups.findIndex((group) => group.id === beforeGroupId)
    : -1;
  const insertionIndex = targetIndex >= 0
    ? targetIndex
    : findSectionInsertIndex(remainingGroups, sections, targetSectionId);

  const nextGroups = [...remainingGroups];
  nextGroups.splice(insertionIndex, 0, {
    ...draggedGroup,
    sectionId: targetSectionId,
  });
  return nextGroups;
}

export function binaryAnswerOptionsForType(typeId: string) {
  if (typeId.includes("true_false")) {
    return ["TRUE", "FALSE", "NOT GIVEN"] as const;
  }
  if (typeId.includes("yes_no")) {
    return ["YES", "NO", "NOT GIVEN"] as const;
  }
  return null;
}

export function normalizeRestrictedAnswerLine(line: string, allowedAnswers?: readonly string[]) {
  const normalized = line.trim().replace(/\s+/g, " ").toUpperCase();
  if (!normalized) {
    return "";
  }

  if (normalized === "NG" || normalized.replace(/\s+/g, "") === "NOTGIVEN") {
    return "NOT GIVEN";
  }

  if (allowedAnswers?.includes("TRUE")) {
    if (normalized === "T") return "TRUE";
    if (normalized === "F") return "FALSE";
  }

  if (allowedAnswers?.includes("YES")) {
    if (normalized === "Y") return "YES";
    if (normalized === "N") return "NO";
  }

  return normalized;
}

export function normalizeRestrictedAnswerBlockInput(value: string, allowedAnswers?: readonly string[]) {
  return value
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      return normalizeRestrictedAnswerLine(line, allowedAnswers);
    })
    .join("\n");
}

export function normalizeMatchingHeadingsAnswerBlockInput(value: string) {
  return value
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      return normalizeMatchingHeadingAnswerLine(line);
    })
    .join("\n");
}

export type BinaryStatementPreviewRow = {
  prompt: string;
  answer: string;
  normalizedAnswer: string;
  isValidAnswer: boolean;
};

export function analyzeBinaryStatementGroup(group: AdminTestDraftQuestionGroup) {
  const allowedAnswers: readonly string[] = binaryAnswerOptionsForType(group.typeId) ?? [];
  const allowedSet = new Set<string>(allowedAnswers);
  const questionLines = splitNonEmptyLines(group.questionBlock ?? "");
  const answerLines = splitNonEmptyLines(group.answerBlock ?? "");
  const normalizedAnswers = answerLines.map((answer) => normalizeRestrictedAnswerLine(answer, allowedAnswers));

  const previewRows: BinaryStatementPreviewRow[] = questionLines.map((prompt, index) => {
    const normalizedAnswer = normalizedAnswers[index] ?? "";
    return {
      prompt,
      answer: answerLines[index] ?? "",
      normalizedAnswer,
      isValidAnswer: Boolean(normalizedAnswer) && allowedSet.has(normalizedAnswer),
    };
  });

  const generatedQuestions: AdminTestDraftQuestion[] = questionLines.map((prompt, index) => {
    const existingQuestion = group.questions[index];
    const normalizedAnswer = normalizedAnswers[index] ?? "";
    return {
      id: existingQuestion?.id ?? createDraftId("draft-q"),
      label: String(group.questionStart + index),
      prompt,
      acceptedAnswers: allowedSet.has(normalizedAnswer) ? [normalizedAnswer] : [],
      explanation: existingQuestion?.explanation ?? "",
      variants: [],
    };
  });

  const issues: string[] = [];
  if (questionLines.length === 0) {
    issues.push("Add one statement per line in the question block.");
  }
  if (answerLines.length === 0) {
    issues.push(`Add one answer per line using only ${allowedAnswers.join(", ")}.`);
  }
  if (answerLines.length < questionLines.length) {
    issues.push(`Every statement needs one answer. Missing ${questionLines.length - answerLines.length} answer line(s).`);
  }
  if (answerLines.length > questionLines.length) {
    issues.push(`You added ${answerLines.length - questionLines.length} extra answer line(s).`);
  }

  const invalidAnswers = [...new Set(normalizedAnswers.filter((answer) => answer && !allowedSet.has(answer)))];
  if (invalidAnswers.length > 0) {
    issues.push(`Only ${allowedAnswers.join(", ")} are allowed here. Invalid values: ${invalidAnswers.join(", ")}.`);
  }

  return {
    allowedAnswers,
    previewRows,
    issues,
    generatedQuestions,
  };
}

export function normalizeBinaryQuestionAcceptedAnswers(typeId: string, answers: string[]) {
  const allowedAnswers = binaryAnswerOptionsForType(typeId) ?? undefined;
  return answers
    .map((answer) => normalizeRestrictedAnswerLine(answer, allowedAnswers))
    .filter(Boolean);
}

export function normalizeBinaryGroupDraft(group: AdminTestDraftQuestionGroup): AdminTestDraftQuestionGroup {
  if (!isBinaryStatementType(group.typeId)) {
    return group;
  }

  const allowedAnswers = binaryAnswerOptionsForType(group.typeId) ?? undefined;
  return {
    ...group,
    answerBlock: normalizeRestrictedAnswerBlockInput(group.answerBlock ?? "", allowedAnswers),
    questions: group.questions.map((question) => ({
      ...question,
      acceptedAnswers: normalizeBinaryQuestionAcceptedAnswers(group.typeId, question.acceptedAnswers),
    })),
  };
}

export function normalizeBinaryDraftAnswers(draft: AdminTestDraftState): AdminTestDraftState {
  const normalizedGroups = (draft.questionGroups ?? []).map(normalizeBinaryGroupDraft);
  const groupQuestionMap = new Map(
    normalizedGroups.flatMap((group) => group.questions.map((question) => [question.id, { group, question }] as const)),
  );

  return {
    ...draft,
    questionGroups: normalizedGroups,
    questions: (draft.questions ?? []).map((question) => {
      const entry = groupQuestionMap.get(question.id);
      if (entry) {
        return {
          ...question,
          acceptedAnswers: [...entry.question.acceptedAnswers],
        };
      }
      return question;
    }),
  };
}

export function hasMeaningfulDraftContent(draft: AdminTestDraftState): boolean {
  if (draft.metadata.title.trim().length > 0) {
    return true;
  }

  if (draft.metadata.sourceDetail.trim().length > 0) {
    return true;
  }

  if (draft.content.sections.some((section) => section.content.trim().length > 0)) {
    return true;
  }

  return (draft.questionGroups ?? []).length > 0;
}

export function resolveDraftTitleForSave(draft: AdminTestDraftState): string {
  if (draft.metadata.source === "custom") {
    const explicitTitle = draft.metadata.title.trim();
    const match = explicitTitle.match(/^(.*?)(?:\s+-\s+Test\s+(\d+))?$/i);
    const baseTitle = match?.[1]?.trim() ?? explicitTitle;
    return baseTitle.length > 0 ? baseTitle : explicitTitle;
  }

  const explicitTitle = draft.metadata.title.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const sectionTitle = draft.content.sections.find((section) => section.content.trim().length > 0)?.title.trim();
  if (sectionTitle) {
    return sectionTitle;
  }

  return draft.metadata.type === "listening" ? "Untitled Listening Draft" : "Untitled Reading Draft";
}

export function isExamPracticeAutoTitle(value: string) {
  return /^Exam Practice Test \d+$/i.test(value.trim());
}

export function extractExamPracticeNumber(value: string) {
  const trimmed = value.trim();
  const autoMatch = trimmed.match(/^Exam Practice Test (\d+)$/i);
  if (autoMatch) {
    return Number(autoMatch[1]);
  }
  const customMatch = trimmed.match(/ - Test (\d+)$/i);
  if (customMatch) {
    return Number(customMatch[1]);
  }
  return null;
}
