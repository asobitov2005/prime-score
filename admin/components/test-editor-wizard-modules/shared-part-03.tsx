"use client";

import { AdminTestDraftContentSection, AdminTestDraftQuestion, AdminTestDraftQuestionGroup } from "./dependencies";

import { createDraftId, splitNonEmptyLines } from "./shared-part-01";

import { MatchingHeadingPreviewRow, normalizeMatchingHeadingAnswerLine, paragraphLabelFromPrompt, paragraphLabelsForSection, parseMatchingHeadingEntry } from "./shared-part-02";



export function analyzeMatchingHeadingsGroup(
  group: AdminTestDraftQuestionGroup,
  sections: AdminTestDraftContentSection[]
) {
  const section = sections.find((item) => item.id === group.sectionId);
  const validLabels = paragraphLabelsForSection(section);
  const validLabelSet = new Set(validLabels);
  const headings = splitNonEmptyLines(group.secondaryBlock ?? "");
  const headingEntries = headings.map((headingLine, index) => parseMatchingHeadingEntry(headingLine, index));
  const answerLines = splitNonEmptyLines(group.answerBlock ?? "").map(normalizeMatchingHeadingAnswerLine);
  const labelCounts = new Map<string, number>();
  let answerCursor = 0;

  const previewRows: MatchingHeadingPreviewRow[] = headingEntries.map((entry) => {
    const label = entry.fixedParagraphLabel ?? answerLines[answerCursor++] ?? "";
    const isUnused = label === "-";
    return {
      label,
      headingLine: entry.displayLabel,
      headingText: entry.headingText,
      answerValue: entry.answerValue,
      isDuplicate: false,
      isValidLabel: false,
      isUnused,
      isFixedExample: Boolean(entry.fixedParagraphLabel),
    };
  });

  for (const row of previewRows) {
    const label = row.label;
    if (!label || label === "-") {
      continue;
    }
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  previewRows.forEach((row) => {
    row.isDuplicate = Boolean(row.label) && !row.isUnused && (labelCounts.get(row.label) ?? 0) > 1;
    row.isValidLabel = Boolean(row.label) && !row.isUnused && validLabelSet.has(row.label);
  });

  const assignedHeadingByParagraph = new Map<string, MatchingHeadingPreviewRow>();
  const generatedQuestions: AdminTestDraftQuestion[] = [];
  const fixedExampleLabels = new Set<string>();

  for (const row of previewRows) {
    if (!row.label || row.isUnused || !row.isValidLabel || row.isDuplicate || assignedHeadingByParagraph.has(row.label)) {
      continue;
    }
    assignedHeadingByParagraph.set(row.label, row);
    if (row.isFixedExample) {
      fixedExampleLabels.add(row.label);
    }
  }

  for (const paragraphLabel of validLabels) {
    if (fixedExampleLabels.has(paragraphLabel)) {
      continue;
    }
    const mappedHeading = assignedHeadingByParagraph.get(paragraphLabel);
    const existingQuestion = group.questions.find((question) => paragraphLabelFromPrompt(question.prompt) === paragraphLabel);
    generatedQuestions.push({
      id: existingQuestion?.id ?? createDraftId("draft-q"),
      label: String(group.questionStart + generatedQuestions.length),
      prompt: `Paragraph ${paragraphLabel}`,
      acceptedAnswers: mappedHeading ? [mappedHeading.answerValue] : [],
      explanation: existingQuestion?.explanation ?? "",
      variants: [],
    });
  }

  const issues: string[] = [];
  const duplicateLabels = [...labelCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([label]) => label);
  if (duplicateLabels.length > 0) {
    issues.push(`Duplicate paragraph labels are not allowed: ${duplicateLabels.join(", ")}.`);
  }
  const labels = previewRows.map((row) => row.label);
  const invalidLabels = labels.filter((label) => label && label !== "-" && !validLabelSet.has(label));
  if (invalidLabels.length > 0) {
    issues.push(`These labels are outside the passage range: ${[...new Set(invalidLabels)].join(", ")}.`);
  }
  const expectedAnswerLines = headingEntries.filter((entry) => !entry.fixedParagraphLabel).length;
  if (expectedAnswerLines === 0 && headingEntries.length === 0) {
    issues.push("Add headings first before validating this group.");
  } else if (expectedAnswerLines > 0 && answerLines.length === 0) {
    issues.push("Add one paragraph label or '-' per non-fixed heading in the answer block.");
  }
  if (answerLines.length < expectedAnswerLines) {
    issues.push(`Every non-fixed heading needs one answer line. Missing ${expectedAnswerLines - answerLines.length} line(s).`);
  }
  if (answerLines.length > expectedAnswerLines) {
    issues.push(`You added ${answerLines.length - expectedAnswerLines} extra answer line(s).`);
  }
  const missingLabels = validLabels.filter((label) => !labelCounts.has(label));
  if (missingLabels.length > 0) {
    issues.push(`Every passage label must be assigned once. Missing labels: ${missingLabels.join(", ")}.`);
  }
  if (validLabels.length === 0) {
    issues.push("Add passage paragraphs first so matching headings can validate paragraph labels.");
  }

  return {
    previewRows,
    issues,
    validLabels,
    generatedQuestions,
    fixedExampleLabels,
  };
}

export function isQuestionConfigured(group: AdminTestDraftQuestionGroup, question: AdminTestDraftQuestion) {
  const hasPrompt = question.prompt.trim().length > 0;
  const answerCount = question.acceptedAnswers.filter((answer) => answer.trim().length > 0).length;
  const hasAnswer = answerCount > 0;
  const hasVariants = !group.typeId.includes("mc_") || (question.variants ?? []).filter((variant) => variant.trim()).length >= 2;
  return hasPrompt && hasAnswer && hasVariants;
}

export function isBracketCompletionType(typeId: string) {
  return (
    typeId.includes("sentence_completion")
    || typeId.includes("summary_completion")
    || typeId.includes("note_completion")
    || typeId.includes("table_completion")
    || typeId.includes("flowchart_completion")
    || typeId.includes("form_completion")
    || typeId.includes("short_answer")
  );
}

export function getCompletionQuestionBlockPlaceholder(typeId: string) {
  if (typeId.includes("table_completion")) {
    return "<table>\n  <tr><th>Region</th><th>Style</th><th>Additional Information</th></tr>\n  <tr><td>Eastern Africa</td><td>Subjects similar to the 18 area of the country.</td><td>Less sought-after than other styles of African art.</td></tr>\n  <tr><td>Southern Africa</td><td>...</td><td>...</td></tr>\n</table>\n\nor:\n\n|| Region | Style | Additional Information ||\n| Eastern Africa | Subjects similar to the 18 area of the country. | Less sought-after than other styles of African art. |\n| Southern Africa | ... | ... |";
  }

  if (typeId.includes("wordbank")) {
    return "* Complete the summary below using [] markers.\nThe first visitors arrived in [] and stayed for [] days.";
  }

  if (typeId.includes("note_completion") || typeId.includes("summary_completion") || typeId.includes("flowchart_completion") || typeId.includes("form_completion")) {
    return "* Complete the summary below using [] markers.\nThe first visitors arrived in [] and stayed for [] days.";
  }

  if (typeId.includes("sentence_completion") || typeId.includes("short_answer")) {
    return "Statement or sentence here...";
  }

  return "* Complete the summary below using [] markers.\nThe first visitors arrived in [] and stayed for [] days.";
}

export function hasFlowChartSeparators(text: string) {
  return /\r?\n\s*\\+\s*\r?\n/.test(text);
}

export function isListeningMapLabelingType(typeId: string) {
  return typeId.includes("plan_map_labeling");
}

export function isListeningMapFreeTextType(typeId: string) {
  return typeId.includes("plan_map_labeling_free_text");
}

export function isListeningMapOptionType(typeId: string) {
  return isListeningMapLabelingType(typeId) && !isListeningMapFreeTextType(typeId);
}

export function isDiagramLabelingType(typeId: string) {
  return typeId.includes("diagram") || isListeningMapLabelingType(typeId);
}

export function parseBracketCompletionAnswers(line: string) {
  return line
    .split(/[\/|]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isBinaryStatementType(typeId: string) {
  return typeId.includes("true_false") || typeId.includes("yes_no");
}

export function isMatchingInformationType(typeId: string) {
  return typeId.includes("matching_information");
}

export function isMultipleChoiceMultipleType(typeId: string) {
  return typeId.includes("mc_multiple");
}

export function stripMultipleChoicePromptMarker(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseMultipleChoiceQuestionBlock(text: string) {
  const lines = text.split("\n");
  const variants: string[] = [];
  const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
  const promptLine = normalizedLines.find((line) => line.includes("<") && line.includes(">")) ?? normalizedLines[0] ?? "";
  const promptIndex = normalizedLines.indexOf(promptLine);

  for (const rawLine of normalizedLines.slice(promptIndex + 1)) {
    const optionMatch = rawLine.match(/^\s*([A-Z]+)[.)]\s*(.+)$/i);
    const optionText = optionMatch ? optionMatch[2].trim() : rawLine.trim();
    if (optionText) {
      variants.push(optionText);
    }
  }

  return {
    prompt: stripMultipleChoicePromptMarker(promptLine),
    variants,
  };
}
