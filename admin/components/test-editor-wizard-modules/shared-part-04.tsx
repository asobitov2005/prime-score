"use client";

import { AdminTestDraftContentSection, AdminTestDraftQuestion, AdminTestDraftQuestionGroup } from "./dependencies";

import { extractMatchingOptionValue, splitNonEmptyLines, stripMatchingOptionPrefix } from "./shared-part-01";

import { alphabetLabelFromIndex, alphabetLabelToIndex, paragraphLabelsForSection } from "./shared-part-02";

import { isMultipleChoiceMultipleType, parseMultipleChoiceQuestionBlock, stripMultipleChoicePromptMarker } from "./shared-part-03";



export function parseMultipleChoiceQuestionBlocks(text: string) {
  const blocks: { prompt: string; variants: string[] }[] = [];
  let currentPrompt = "";
  let currentVariants: string[] = [];

  const flush = () => {
    if (!currentPrompt.trim() && currentVariants.length === 0) {
      return;
    }
    blocks.push({
      prompt: stripMultipleChoicePromptMarker(currentPrompt),
      variants: [...currentVariants],
    });
  };

  for (const rawLine of text.split("\n")) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) {
      continue;
    }

    if (trimmedLine.includes("<") && trimmedLine.includes(">")) {
      if (currentPrompt || currentVariants.length > 0) {
        flush();
      }
      currentPrompt = trimmedLine;
      currentVariants = [];
      continue;
    }

    const optionMatch = trimmedLine.match(/^\s*([A-Z]+)[.)]\s*(.+)$/i);
    const optionText = optionMatch ? optionMatch[2].trim() : trimmedLine;
    currentVariants.push(optionText);
  }

  if (currentPrompt || currentVariants.length > 0) {
    flush();
  }

  if (blocks.length === 0 && text.trim()) {
    blocks.push(parseMultipleChoiceQuestionBlock(text));
  }

  return blocks;
}

export function parseMultipleChoiceMultipleAnswerGroups(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((group) => splitNonEmptyLines(group))
    .filter((group) => group.length > 0);
}

export function normalizeLookupToken(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function resolveMcOptionLetter(token: string, variants: string[]) {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  if (/^[A-Z]+$/i.test(trimmed)) {
    const optionIndex = alphabetLabelToIndex(trimmed);
    if (optionIndex >= 0 && optionIndex < variants.length) {
      return trimmed.toUpperCase();
    }
    return null;
  }

  const normalized = normalizeLookupToken(trimmed);
  for (let index = 0; index < variants.length; index += 1) {
    const letter = alphabetLabelFromIndex(index);
    const optionText = variants[index] ?? "";
    const candidates = [`${letter}. ${optionText}`, `${letter}) ${optionText}`, optionText];
    if (candidates.some((candidate) => normalizeLookupToken(candidate) === normalized)) {
      return letter;
    }
  }

  return null;
}

export function parseMcSingleAcceptedAnswers(line: string, variants: string[]) {
  const tokens = line
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);

  return [...new Set(tokens.map((token) => resolveMcOptionLetter(token, variants) ?? token))];
}

export function parseMcMultipleAcceptedAnswers(tokens: string[], variants: string[]) {
  return [...new Set(
    tokens
      .map((token) => resolveMcOptionLetter(token, variants))
      .filter((token): token is string => Boolean(token))
  )];
}

export function matchWordBankOptionVariants(token: string, options: string[]) {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeLookupToken(trimmed);
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index] ?? "";
    const fullOption = option.trim();
    const optionValue = extractMatchingOptionValue(fullOption);
    const optionText = stripMatchingOptionPrefix(fullOption);
    const orderLetter = alphabetLabelFromIndex(index);
    const candidates = [fullOption, optionValue, optionText, orderLetter];

    if (candidates.some((candidate) => normalizeLookupToken(candidate) === normalized)) {
      return [...new Set([fullOption, optionText, optionValue, orderLetter].filter(Boolean))];
    }
  }

  return null;
}

export function resolveWordBankAnswerVariants(token: string, options: string[]) {
  const trimmed = token.trim();
  if (!trimmed) {
    return [];
  }

  const matchedVariants = matchWordBankOptionVariants(trimmed, options);
  if (matchedVariants) {
    return matchedVariants;
  }

  return [trimmed];
}

export function parseWordBankAcceptedAnswers(line: string, options: string[]) {
  return [...new Set(
    line
      .split(/[\/|]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .flatMap((token) => resolveWordBankAnswerVariants(token, options))
  )];
}

export function questionSlotCount(group: AdminTestDraftQuestionGroup, question: AdminTestDraftQuestion) {
  if (!isMultipleChoiceMultipleType(group.typeId)) {
    return 1;
  }
  return Math.max(1, question.acceptedAnswers.filter((answer) => answer.trim().length > 0).length);
}

export function questionRangeAtIndex(group: AdminTestDraftQuestionGroup, questionIndex: number) {
  let start = group.questionStart;
  for (let index = 0; index < questionIndex; index += 1) {
    start += questionSlotCount(group, group.questions[index]);
  }
  const slotCount = questionSlotCount(group, group.questions[questionIndex]);
  return {
    start,
    end: start + slotCount - 1,
  };
}

export function formatQuestionRange(range: { start: number; end: number }) {
  return range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`;
}

export function totalQuestionSlots(group: AdminTestDraftQuestionGroup) {
  return group.questions.reduce((count, question) => count + questionSlotCount(group, question), 0);
}

export function analyzeMatchingInformationGroup(
  group: AdminTestDraftQuestionGroup,
  sections: AdminTestDraftContentSection[]
) {
  const targetSection = sections.find((section) => section.id === group.sectionId);
  const validLabels = paragraphLabelsForSection(targetSection);
  const validLabelSet = new Set(validLabels);
  const questionLines = splitNonEmptyLines(group.questionBlock ?? "");
  const answerLines = splitNonEmptyLines(group.answerBlock ?? "").map((line) => line.toUpperCase());
  const issues: string[] = [];

  if (questionLines.length === 0) {
    issues.push("Add one statement per line in the question block.");
  }
  if (answerLines.length === 0) {
    issues.push("Add one paragraph label per line in the answer block.");
  }
  if (answerLines.length < questionLines.length) {
    issues.push(`Every statement needs one paragraph label. Missing ${questionLines.length - answerLines.length} answer line(s).`);
  }
  if (answerLines.length > questionLines.length) {
    issues.push(`You added ${answerLines.length - questionLines.length} extra answer line(s).`);
  }
  if (validLabels.length === 0) {
    issues.push("Add labelled passage paragraphs first so matching information can validate paragraph labels.");
  }

  const invalidLabels = [...new Set(answerLines.filter((label) => label && !validLabelSet.has(label)))];
  if (invalidLabels.length > 0) {
    issues.push(`These paragraph labels are outside the current passage range: ${invalidLabels.join(", ")}.`);
  }

  return { issues, validLabels };
}

export function analyzeCompletionGroup(group: AdminTestDraftQuestionGroup) {
  const markerCount = (group.questionBlock?.match(/\[\]/g) ?? []).length;
  const answerLines = splitNonEmptyLines(group.answerBlock ?? "");
  const issues: string[] = [];

  if (markerCount === 0) {
    issues.push("Add [] markers in the question block to generate completion blanks.");
  }
  if (answerLines.length === 0) {
    issues.push("Add one answer line per blank in the answer block.");
  }
  if (answerLines.length < markerCount) {
    issues.push(`Every blank needs one answer line. Missing ${markerCount - answerLines.length} answer line(s).`);
  }
  if (answerLines.length > markerCount) {
    issues.push(`You added ${answerLines.length - markerCount} extra answer line(s).`);
  }

  if (group.typeId.includes("wordbank")) {
    if (group.sharedOptions.length === 0) {
      issues.push("Add word bank options before validating this group.");
    }

    const invalidTokens = answerLines.flatMap((line) =>
      line
        .split(/[\/|]/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => !matchWordBankOptionVariants(token, group.sharedOptions))
    );

    const uniqueInvalidTokens = [...new Set(invalidTokens)];
    if (uniqueInvalidTokens.length > 0) {
      issues.push(`These word bank answers do not match any option: ${uniqueInvalidTokens.join(", ")}.`);
    }
  }

  return { issues };
}
