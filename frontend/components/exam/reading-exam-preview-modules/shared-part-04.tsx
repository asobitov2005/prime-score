"use client";

import { PreviewGroup, PreviewParagraph, PreviewQuestion, ReadingExamPreviewData } from "./shared-part-01";

import { isMcqMultiple } from "./shared-part-02";



export function toggleMultiValue(current: string | undefined, next: string, maxValues = 2) {
  const existing = (current ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (existing.includes(next)) {
    return existing.filter((item) => item !== next).join(",");
  }
  if (existing.length >= maxValues) {
    return existing.join(",");
  }
  return [...existing, next].join(",");
}

export function hasMultiValue(current: string | undefined, value: string) {
  return (current ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(value);
}

export function mcMultipleQuestionWeight(question: PreviewQuestion) {
  const label = String(question.label ?? "").trim();
  const rangeMatch = label.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (end >= start) {
      return Math.max(1, end - start + 1);
    }
  }

  return question.selectionLimit && question.selectionLimit > 1 ? question.selectionLimit : 1;
}

export function answeredQuestionWeight(question: PreviewQuestion, answerValue: string | undefined) {
  if (!isMcqMultiple(question.type)) {
    return answerValue?.trim() ? 1 : 0;
  }

  const selectedCount = (answerValue ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .length;

  return Math.min(mcMultipleQuestionWeight(question), selectedCount);
}

export function isQuestionFullyAnswered(question: PreviewQuestion, answerValue: string | undefined) {
  if (!isMcqMultiple(question.type)) {
    return Boolean(answerValue?.trim());
  }

  return answeredQuestionWeight(question, answerValue) >= mcMultipleQuestionWeight(question);
}

export function questionDisplaySlots(question: PreviewQuestion) {
  const label = String(question.label ?? "").trim();
  const rangeMatch = label.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (end >= start) {
      return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
    }
  }

  return [label || String(question.number)];
}

export function primaryQuestionDisplayLabel(question: PreviewQuestion) {
  return questionDisplaySlots(question)[0] ?? String(question.number);
}

export function questionRangeLabelForGroup(group: PreviewGroup) {
  const groupSlots = group.questions.flatMap((question) => questionDisplaySlots(question));
  const startLabel = groupSlots[0] ?? String(group.questions[0]?.number ?? group.title);
  const endLabel = groupSlots[groupSlots.length - 1] ?? String(group.questions[group.questions.length - 1]?.number ?? group.title);
  return `Questions ${startLabel} - ${endLabel}`;
}

export function isGenericQuestionGroupTitle(title: string) {
  return /^Question Group(?:\s+\d+(?:\s*[-,]\s*\d+)*)?$/i.test(title);
}

export function shouldRenderCustomGroupTitle(group: PreviewGroup) {
  const normalizedTitle = String(group.title ?? "").trim();
  if (!normalizedTitle) {
    return false;
  }
  if (isGenericQuestionGroupTitle(normalizedTitle)) {
    return false;
  }
  if (/^Questions?\s+\d+/i.test(normalizedTitle)) {
    return false;
  }
  return normalizedTitle !== questionRangeLabelForGroup(group);
}

export function sectionKeyForParagraph(paragraph: PreviewParagraph) {
  return paragraph.sectionId ?? paragraph.sectionLabel ?? "section";
}

export function sectionKeyForGroup(group: PreviewGroup) {
  return group.sectionId ?? group.sectionLabel ?? "section";
}

export function findSectionIdForQuestion(
  questionId: string | undefined,
  questionGroups: PreviewGroup[],
  paragraphs: PreviewParagraph[]
) {
  if (questionId) {
    const ownerGroup = questionGroups.find((group) => group.questions.some((question) => question.id === questionId));
    if (ownerGroup) {
      return sectionKeyForGroup(ownerGroup);
    }
  }

  return paragraphs[0] ? sectionKeyForParagraph(paragraphs[0]) : (questionGroups[0] ? sectionKeyForGroup(questionGroups[0]) : "section");
}

export function normalizeSectionTimeSpentSeconds(input?: Record<string, number> | null) {
  const normalized: Record<string, number> = {};
  Object.entries(input ?? {}).forEach(([sectionId, seconds]) => {
    const key = String(sectionId).trim();
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    if (key && value > 0) {
      normalized[key] = value;
    }
  });
  return normalized;
}

export function mergeSectionTimeSpentSeconds(
  primary?: Record<string, number> | null,
  secondary?: Record<string, number> | null
) {
  const merged = normalizeSectionTimeSpentSeconds(primary);
  Object.entries(normalizeSectionTimeSpentSeconds(secondary)).forEach(([sectionId, seconds]) => {
    merged[sectionId] = Math.max(merged[sectionId] ?? 0, seconds);
  });
  return merged;
}

export function normalizeQuestionTypeKey(value: string | null | undefined): string {
  const normalized = String(value ?? "")
    .replace(/^(reading|listening)_/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  if (normalized === "tfng") return "true_false_not_given";
  if (normalized === "ynng") return "yes_no_not_given";
  if (normalized === "mcq" || normalized === "mc") return "multiple_choice";
  return normalized;
}

export function resolveInitialReviewTarget(
  target: ReadingExamPreviewData["initialReviewTarget"],
  questionGroups: PreviewGroup[],
  paragraphs: PreviewParagraph[]
): { questionId: string; sectionId: string } | null {
  if (!target) {
    return null;
  }

  if (target.questionId) {
    const sectionId = findSectionIdForQuestion(target.questionId, questionGroups, paragraphs);
    if (questionGroups.some((group) => group.questions.some((question) => question.id === target.questionId))) {
      return { questionId: target.questionId, sectionId };
    }
  }

  const targetQuestionType = normalizeQuestionTypeKey(target.questionType);
  if (targetQuestionType) {
    const group = questionGroups.find((item) => normalizeQuestionTypeKey(item.type) === targetQuestionType);
    const questionId = group?.questions[0]?.id;
    if (group && questionId) {
      return { questionId, sectionId: sectionKeyForGroup(group) };
    }
  }

  if (target.sectionId) {
    const group = questionGroups.find((item) => sectionKeyForGroup(item) === target.sectionId);
    if (group?.questions[0]?.id) {
      return { questionId: group.questions[0].id, sectionId: target.sectionId };
    }

    return { questionId: "", sectionId: target.sectionId };
  }

  return null;
}
