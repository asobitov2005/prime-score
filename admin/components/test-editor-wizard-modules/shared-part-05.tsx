"use client";

import { AdminTestDraftContentSection, AdminTestDraftQuestionGroup, AdminTestDraftState } from "./dependencies";

import { splitNonEmptyLines } from "./shared-part-01";

import { analyzeMatchingHeadingsGroup, isBinaryStatementType, isBracketCompletionType, isDiagramLabelingType, isListeningMapOptionType, isMatchingInformationType, isMultipleChoiceMultipleType } from "./shared-part-03";

import { analyzeCompletionGroup, analyzeMatchingInformationGroup, formatQuestionRange, parseMultipleChoiceMultipleAnswerGroups, parseMultipleChoiceQuestionBlocks, questionSlotCount, resolveMcOptionLetter } from "./shared-part-04";

import { analyzeBinaryStatementGroup } from "./shared-part-06";



export function analyzeMultipleChoiceGroup(group: AdminTestDraftQuestionGroup) {
  const parsedQuestions = parseMultipleChoiceQuestionBlocks(group.questionBlock ?? "");
  const answerLines = splitNonEmptyLines(group.answerBlock ?? "");
  const answerGroups = isMultipleChoiceMultipleType(group.typeId)
    ? parseMultipleChoiceMultipleAnswerGroups(group.answerBlock ?? "")
    : [];
  const issues: string[] = [];
  const providedAnswerCount = isMultipleChoiceMultipleType(group.typeId) ? answerGroups.length : answerLines.length;

  if (parsedQuestions.length === 0) {
    issues.push("Add at least one multiple-choice question in the question block.");
  }
  if (providedAnswerCount === 0) {
    issues.push("Add one correct answer line per question in the answer block.");
  }
  if (providedAnswerCount < parsedQuestions.length) {
    issues.push(`Every question needs one answer line. Missing ${parsedQuestions.length - providedAnswerCount} answer line(s).`);
  }
  if (providedAnswerCount > parsedQuestions.length) {
    issues.push(`You added ${providedAnswerCount - parsedQuestions.length} extra answer line(s).`);
  }

  const invalidTokens = parsedQuestions.flatMap((question, index) => {
    if (isMultipleChoiceMultipleType(group.typeId)) {
      return (answerGroups[index] ?? [])
        .filter((token) => !resolveMcOptionLetter(token, question.variants));
    }

    const answerLine = answerLines[index] ?? "";
    if (!answerLine) {
      return [];
    }

    return answerLine
      .split("|")
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !resolveMcOptionLetter(token, question.variants));
  });

  const uniqueInvalidTokens = [...new Set(invalidTokens)];
  if (uniqueInvalidTokens.length > 0) {
    issues.push(`These answers do not match any option letter or option text: ${uniqueInvalidTokens.join(", ")}.`);
  }

  return { issues };
}

export function collectGroupIssues(
  group: AdminTestDraftQuestionGroup,
  sections: AdminTestDraftContentSection[]
) {
  const issues: string[] = [];

  if (group.questions.length === 0) {
    issues.push("This group has no generated questions yet.");
  }

  if (group.typeId.includes("matching_headings")) {
    issues.push(...analyzeMatchingHeadingsGroup(group, sections).issues);
  }
  if (isBinaryStatementType(group.typeId)) {
    issues.push(...analyzeBinaryStatementGroup(group).issues);
  }
  if (isMatchingInformationType(group.typeId)) {
    issues.push(...analyzeMatchingInformationGroup(group, sections).issues);
  }
  if (isBracketCompletionType(group.typeId)) {
    issues.push(...analyzeCompletionGroup(group).issues);
  }
  if (isListeningMapOptionType(group.typeId) && group.sharedOptions.length === 0) {
    issues.push("Add map option labels or a range like A-H so dropdown answers can render.");
  }
  if (isDiagramLabelingType(group.typeId) && !group.diagramImageUrl) {
    issues.push("Upload the map / diagram image for this labeling group.");
  }
  if (group.typeId.includes("mc_")) {
    issues.push(...analyzeMultipleChoiceGroup(group).issues);
  }

  return [...new Set(issues)];
}

export function getQuestionStartOffset(
  draftType: AdminTestDraftState["metadata"]["type"],
  format: AdminTestDraftState["metadata"]["format"],
) {
  if (format === "full") {
    return 1;
  }

  const expectedPrefix = draftType === "listening" ? "part_" : "passage_";
  if (!format.startsWith(expectedPrefix)) {
    return 1;
  }

  const sectionNumber = Number.parseInt(format.split("_")[1] ?? "", 10);
  if (!Number.isFinite(sectionNumber) || sectionNumber <= 1) {
    return 1;
  }

  if (draftType === "listening") {
    return (sectionNumber - 1) * 10 + 1;
  }

  if (sectionNumber === 2) return 14;
  if (sectionNumber === 3) return 27;
  return 1;
}

export function getQuestionStartForSection(
  draftType: AdminTestDraftState["metadata"]["type"],
  format: AdminTestDraftState["metadata"]["format"],
  sectionIndex: number,
) {
  if (format !== "full") {
    return getQuestionStartOffset(draftType, format);
  }

  if (draftType === "listening") {
    return sectionIndex * 10 + 1;
  }

  if (sectionIndex <= 0) {
    return 1;
  }
  if (sectionIndex === 1) {
    return 14;
  }
  if (sectionIndex === 2) {
    return 27;
  }
  return 1;
}

export const STRUCTURAL_GROUP_UPDATE_KEYS = new Set([
  "typeId",
  "sectionId",
  "questionBlock",
  "answerBlock",
  "secondaryBlock",
  "sharedOptions",
  "questions",
  "questionStart",
  "questionEnd",
]);

export function isStructuralGroupUpdate(updates: Partial<AdminTestDraftQuestionGroup>) {
  return Object.keys(updates).some((key) => STRUCTURAL_GROUP_UPDATE_KEYS.has(key));
}

export function normalizeQuestionGroups(
  groups: AdminTestDraftQuestionGroup[],
  draftType: AdminTestDraftState["metadata"]["type"] = "reading",
  format: AdminTestDraftState["metadata"]["format"] = "full",
  sections: AdminTestDraftContentSection[] = [],
) {
  const sectionOrder = new Map(sections.map((section, index) => [section.id, index]));
  let activeSectionId: string | null = null;
  let nextQuestionStart = getQuestionStartOffset(draftType, format);

  return groups.map((group) => {
    if (format === "full" && sections.length > 0) {
      const sectionIndex = sectionOrder.get(group.sectionId);
      if (sectionIndex !== undefined && group.sectionId !== activeSectionId) {
        activeSectionId = group.sectionId;
        nextQuestionStart = getQuestionStartForSection(draftType, format, sectionIndex);
      }
    }

    let cursor = nextQuestionStart;
    const normalizedQuestions = group.questions.map((question) => {
      const slotCount = questionSlotCount(group, question);
      const range = {
        start: cursor,
        end: cursor + slotCount - 1,
      };
      cursor = range.end + 1;

      const nextPrompt = (
        isBracketCompletionType(group.typeId)
        && /^Blank \d+$/i.test(question.prompt.trim())
      )
        ? `Blank ${range.start}`
        : question.prompt;

      return {
        ...question,
        label: formatQuestionRange(range),
        prompt: nextPrompt,
      };
    });

    const consumedSlots = Math.max(1, normalizedQuestions.reduce((count, question) => count + questionSlotCount(group, question), 0));
    const normalizedGroup = {
      ...group,
      questionStart: nextQuestionStart,
      questionEnd: nextQuestionStart + consumedSlots - 1,
      questions: normalizedQuestions,
    };

    nextQuestionStart = normalizedGroup.questionEnd + 1;
    return normalizedGroup;
  });
}

export function findSectionInsertIndex(
  groups: AdminTestDraftQuestionGroup[],
  sections: AdminTestDraftContentSection[],
  targetSectionId: string,
) {
  const sectionOrder = new Map(sections.map((section, index) => [section.id, index]));
  const targetOrder = sectionOrder.get(targetSectionId);
  if (targetOrder === undefined) {
    return groups.length;
  }

  let lastTargetIndex = -1;
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    if (group.sectionId === targetSectionId) {
      lastTargetIndex = index;
      continue;
    }

    const currentOrder = sectionOrder.get(group.sectionId);
    if (lastTargetIndex === -1 && currentOrder !== undefined && currentOrder > targetOrder) {
      return index;
    }
  }

  return lastTargetIndex >= 0 ? lastTargetIndex + 1 : groups.length;
}
