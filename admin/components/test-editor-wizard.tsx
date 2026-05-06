"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type CSSProperties, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Notice, ProgressBar, SectionHeader, Select, Textarea } from "@/components/ui";
import { createEmptyDraft } from "@/lib/draft-template";
import { listeningQuestionTypes, readingQuestionTypes } from "@/lib/question-types";
import { adminApi } from "@/lib/api";
import { adminTestSourceOptions, normalizeAdminTestSourceDetail } from "@/lib/test-source";
import type {
  AdminDraftChecklistStatus,
  AdminTestDraftContentSection,
  AdminTestDraftQuestion,
  AdminTestDraftQuestionGroup,
  AdminTestDraftState,
  PreviewMode,
  WizardStepId,
} from "@/lib/types";
import { cn } from "@/lib/utils";


type Props = {
  mode: "create" | "edit";
  testId?: string;
  initialDraft?: AdminTestDraftState;
};

type TranscriptProgressState = {
  value: number;
  label: string;
  startedAt: number;
  jobId?: string;
};


const stepOrder: WizardStepId[] = ["metadata", "content", "questions", "review"];

const defaultInstructions: Record<string, string> = {
  // Reading Instructions
  "reading_true_false_not_given": "Do the following statements agree with the information given in the Reading Passage?\n\nIn boxes on your answer sheet, write:\n\n{TRUE}\t\t\tif the statement agrees with the information\n{FALSE}\t\t\tif the statement contradicts the information\n{NOT GIVEN}\tif there is no information on this",
  "reading_yes_no_not_given": "Do the following statements agree with the claims of the writer in the Reading Passage?\n\nIn boxes on your answer sheet, write:\n\n{YES}\t\t\tif the statement agrees with the claims of the writer\n{NO}\t\t\tif the statement contradicts the claims of the writer\n{NOT GIVEN}\tif it is impossible to say what the writer thinks about this",
  "reading_mc_single": "Choose the correct letter, A, B, C or D.\n\nWrite the correct letter in boxes on your answer sheet.",
  "reading_mc_multiple": "Choose TWO letters, A-E.\n\nWrite the correct letters in boxes on your answer sheet.",
  "reading_matching_headings": "Choose the correct heading for each paragraph from the list of headings below.\n\nWrite the correct number, i-ix, in boxes on your answer sheet.",
  "reading_matching_information": "Which paragraph contains the following information?\n\nWrite the correct letter, A-F, in boxes on your answer sheet.\n\nNB You may use any letter more than once.",
  "reading_matching_features": "Look at the following statements and the list of people below.\n\nMatch each statement with the correct person.\n\nWrite the correct letter, A-E, in boxes on your answer sheet.",
  "reading_matching_sentence_endings": "Complete each sentence with the correct ending, A-G, below.\n\nWrite the correct letter, A-G, in boxes on your answer sheet.",
  "reading_sentence_completion": "Complete the sentences below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_summary_completion_wordbank": "Complete the summary using the list of words, A-G, below.\n\nWrite the correct letter, A-G, in boxes on your answer sheet.",
  "reading_summary_completion_freetext": "Complete the summary below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_note_completion": "Complete the notes below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_diagram_labeling": "Label the diagram below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_short_answer": "Answer the questions below.\n\nChoose {NO MORE THAN TWO WORDS AND/OR A NUMBER} from the passage for each answer.",

  // Listening Instructions
  "listening_form_completion": "Complete the form below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_sentence_completion": "Complete the sentences below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_mc_single": "Choose the correct letter, A, B or C.",
  "listening_mc_multiple": "Choose TWO letters, A-E.",
  "listening_matching": "What does the speaker say about each of the following items?\n\nChoose the correct letter, A, B or C, and write them next to Questions.",
  "listening_plan_map_labeling": "Label the map below.\n\nWrite the correct letter, A-H, next to Questions.",
  "listening_plan_map_labeling_free_text": "Label the map below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_short_answer": "Answer the questions below.\n\nWrite {NO MORE THAN THREE WORDS AND/OR A NUMBER} for each answer."
};

const INLINE_BLANK_PLACEHOLDER = "........................";

function formatTranscriptTimestamp(totalSeconds: number) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatElapsedDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildTranscriptTextFromSegments(
  segments: NonNullable<AdminTestDraftContentSection["transcriptSegments"]> | undefined
) {
  return (segments ?? [])
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join("\n");
}

function splitNonEmptyLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function expandMapOptionRangeLines(text: string) {
  return splitNonEmptyLines(text).flatMap((line) => {
    const rangeMatch = line.match(/^([A-Za-z])\s*[-–—]\s*([A-Za-z])$/);
    if (!rangeMatch) {
      return [line];
    }

    const startCode = rangeMatch[1].toUpperCase().charCodeAt(0);
    const endCode = rangeMatch[2].toUpperCase().charCodeAt(0);
    if (Number.isNaN(startCode) || Number.isNaN(endCode) || startCode > endCode) {
      return [line];
    }

    return Array.from({ length: endCode - startCode + 1 }, (_, index) =>
      String.fromCharCode(startCode + index)
    );
  });
}

function normalizeInlineBlankPlaceholders(text: string) {
  return text.replace(/_{3,}/g, INLINE_BLANK_PLACEHOLDER);
}

function stripGeneratedListeningIntroFromContent(text: string) {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !/^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(trimmed);
    })
    .join("\n")
    .trim();
}

function extractMatchingOptionValue(option: string) {
  const trimmed = option.trim();
  const prefixMatch = trimmed.match(/^([a-z0-9ivxlcdm]+)[.)]\s*/i);
  return prefixMatch ? prefixMatch[1] : trimmed;
}

function stripMatchingOptionPrefix(option: string) {
  return option.trim().replace(/^([a-z0-9ivxlcdm]+)[.)]\s*/i, "").trim();
}

function resolveChoiceAnswerText(
  group: AdminTestDraftQuestionGroup,
  question: AdminTestDraftQuestion,
  answer: string
) {
  const trimmed = answer.trim();
  if (!trimmed) return "";

  if (group.typeId.includes("mc_")) {
    const upper = trimmed.toUpperCase();
    if (/^[A-Z]$/.test(upper)) {
      const optionIndex = upper.charCodeAt(0) - 65;
      const optionText = question.variants?.[optionIndex];
      return optionText?.trim() || "";
    }
  }

  if (
    group.typeId.includes("matching_features")
    || group.typeId.includes("matching_sentence_endings")
    || group.typeId.includes("plan_map_labeling")
    || group.typeId.includes("matching")
  ) {
    const option = (group.sharedOptions ?? []).find((item) => extractMatchingOptionValue(item).toUpperCase() === trimmed.toUpperCase());
    return option ? stripMatchingOptionPrefix(option) : "";
  }

  return trimmed;
}

function createDraftId(prefix: string) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function getAudioFileDurationSeconds(file: File) {
  return new Promise<number | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement("audio");

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute("src");
      audio.load();
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.max(0, Math.round(audio.duration)) : null;
      cleanup();
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    audio.src = objectUrl;
  });
}

function clipboardImageFileName(mimeType: string) {
  const normalizedType = mimeType.toLowerCase();
  if (normalizedType === "image/png") return "clipboard-image.png";
  if (normalizedType === "image/jpeg") return "clipboard-image.jpg";
  if (normalizedType === "image/webp") return "clipboard-image.webp";
  return "clipboard-image";
}

function extractClipboardImageFile(items: DataTransferItemList | null | undefined) {
  if (!items) {
    return null;
  }

  for (const item of Array.from(items)) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) {
      continue;
    }

    const file = item.getAsFile();
    if (!file) {
      continue;
    }

    return new File([file], file.name || clipboardImageFileName(file.type), {
      type: file.type || "image/png",
    });
  }

  return null;
}

function alphabetLabelFromIndex(index: number) {
  let current = index;
  let label = "";

  do {
    label = String.fromCharCode(65 + (current % 26)) + label;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);

  return label;
}

function romanNumeralFromIndex(index: number) {
  const numerals: Array<[number, string]> = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];

  let value = index + 1;
  let result = "";
  for (const [amount, glyph] of numerals) {
    while (value >= amount) {
      result += glyph;
      value -= amount;
    }
  }
  return result;
}

function shouldAutoLetterMatchingOptions(typeId: string) {
  return typeId.includes("matching_features");
}

function getMatchingOptionPreview(option: string, index: number, typeId: string) {
  const fixedExampleMatch = option.trim().match(/^([A-Z]+)\s*->\s*(.+)$/i);
  const optionBody = fixedExampleMatch ? fixedExampleMatch[2].trim() : option.trim();
  const explicitValue = extractMatchingOptionValue(optionBody);
  const explicitText = stripMatchingOptionPrefix(optionBody);

  if (explicitValue !== optionBody.trim()) {
    return {
      value: explicitValue.toUpperCase(),
      label: explicitText ? `${explicitValue.toUpperCase()}. ${explicitText}` : explicitValue.toUpperCase(),
    };
  }

  if (typeId.includes("matching_headings")) {
    const value = romanNumeralFromIndex(index);
    return {
      value,
      label: optionBody.trim(),
    };
  }

  if (shouldAutoLetterMatchingOptions(typeId)) {
    const value = alphabetLabelFromIndex(index);
    return {
      value,
      label: option.trim() ? `${value}. ${option.trim()}` : value,
    };
  }

  return {
    value: explicitValue,
    label: option.trim(),
  };
}

type PassageContentBlock = {
  text: string;
  label: string;
  isLabelled: boolean;
  isStyled: boolean;
  italic: boolean;
  center: boolean;
  bold: boolean;
};

function parsePassageBlockStyle(rawText: string) {
  const trimmed = rawText.trim();
  const hasOuterBraces = trimmed.startsWith("{") && trimmed.endsWith("}");
  let body = hasOuterBraces ? trimmed.slice(1, -1).trim() : trimmed;
  let italic = false;
  let center = false;

  let matched = true;
  while (matched) {
    matched = false;
    if (body.startsWith("<i>")) {
      italic = true;
      body = body.slice(3).trimStart();
      matched = true;
    }
    if (body.startsWith("<c>")) {
      center = true;
      body = body.slice(3).trimStart();
      matched = true;
    }
  }

  const isStyled = italic || center;
  return {
    text: isStyled ? body : rawText.trim(),
    isStyled,
    italic,
    center,
    bold: isStyled && hasOuterBraces,
  };
}

function parsePassageContentBlocks(content: string, showLabels: boolean): PassageContentBlock[] {
  let labelIndex = 0;
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const parsed = parsePassageBlockStyle(block);
      const isLabelled = !parsed.isStyled;
      const label = showLabels && isLabelled ? String.fromCharCode(65 + labelIndex) : "";
      if (isLabelled) {
        labelIndex += 1;
      }
      return {
        ...parsed,
        label,
        isLabelled,
      };
    });
}

function paragraphLabelsForSection(section?: AdminTestDraftContentSection) {
  if (!section) return [];
  const explicitLabels = (section.paragraphs ?? [])
    .map((paragraph) => paragraph.label?.trim().toUpperCase())
    .filter(Boolean);
  if (explicitLabels.length > 0) {
    return explicitLabels;
  }
  return parsePassageContentBlocks(section.content, true)
    .map((paragraph) => paragraph.label)
    .filter(Boolean);
}

function paragraphLabelFromPrompt(prompt: string) {
  const match = prompt.trim().match(/paragraph\s+([a-z])/i);
  return match ? match[1].toUpperCase() : null;
}

type MatchingHeadingPreviewRow = {
  label: string;
  headingLine: string;
  headingText: string;
  answerValue: string;
  isDuplicate: boolean;
  isValidLabel: boolean;
  isUnused: boolean;
  isFixedExample: boolean;
};

function normalizeMatchingHeadingAnswerLine(line: string) {
  const trimmed = line.trim().toUpperCase();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "—" || trimmed === "_") {
    return "-";
  }
  return trimmed;
}

type MatchingHeadingEntry = {
  fixedParagraphLabel: string | null;
  headingText: string;
  answerValue: string;
  displayLabel: string;
  rawLine: string;
};

function parseMatchingHeadingEntry(line: string, index: number) {
  const fixedExampleMatch = line.trim().match(/^([A-Z]+)\s*->\s*(.+)$/i);
  const fixedParagraphLabel = fixedExampleMatch ? fixedExampleMatch[1].toUpperCase() : null;
  const headingBody = fixedExampleMatch ? fixedExampleMatch[2].trim() : line.trim();
  const explicitValue = extractMatchingOptionValue(headingBody);
  const explicitText = stripMatchingOptionPrefix(headingBody) || headingBody;
  const hasExplicitValue = explicitValue !== headingBody;
  const answerValue = hasExplicitValue ? explicitValue : romanNumeralFromIndex(index);
  const headingText = hasExplicitValue ? explicitText : headingBody;

  return {
    fixedParagraphLabel,
    headingText,
    answerValue,
    displayLabel: `${answerValue}. ${headingText}`.trim(),
    rawLine: line,
  } satisfies MatchingHeadingEntry;
}

function isFixedMatchingHeadingExample(line: string) {
  return /^[A-Z]+\s*->\s*.+$/i.test(line.trim());
}

function analyzeMatchingHeadingsGroup(
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

function isQuestionConfigured(group: AdminTestDraftQuestionGroup, question: AdminTestDraftQuestion) {
  const hasPrompt = question.prompt.trim().length > 0;
  const answerCount = question.acceptedAnswers.filter((answer) => answer.trim().length > 0).length;
  const hasAnswer = answerCount > 0;
  const hasVariants = !group.typeId.includes("mc_") || (question.variants ?? []).filter((variant) => variant.trim()).length >= 2;
  return hasPrompt && hasAnswer && hasVariants;
}

function isBracketCompletionType(typeId: string) {
  return (
    typeId.includes("sentence_completion")
    || typeId.includes("summary_completion")
    || typeId.includes("note_completion")
    || typeId.includes("form_completion")
    || typeId.includes("short_answer")
  );
}

function isListeningMapLabelingType(typeId: string) {
  return typeId.includes("plan_map_labeling");
}

function isListeningMapFreeTextType(typeId: string) {
  return typeId.includes("plan_map_labeling_free_text");
}

function isListeningMapOptionType(typeId: string) {
  return isListeningMapLabelingType(typeId) && !isListeningMapFreeTextType(typeId);
}

function isDiagramLabelingType(typeId: string) {
  return typeId.includes("diagram") || isListeningMapLabelingType(typeId);
}

function parseBracketCompletionAnswers(line: string) {
  return line
    .split(/[\/|]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function isBinaryStatementType(typeId: string) {
  return typeId.includes("true_false") || typeId.includes("yes_no");
}

function isMatchingInformationType(typeId: string) {
  return typeId.includes("matching_information");
}

function isMultipleChoiceMultipleType(typeId: string) {
  return typeId.includes("mc_multiple");
}

function stripMultipleChoicePromptMarker(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseMultipleChoiceQuestionBlock(text: string) {
  const lines = text.split("\n");
  const variants: string[] = [];
  const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
  const promptLine = normalizedLines.find((line) => line.includes("<") && line.includes(">")) ?? normalizedLines[0] ?? "";
  const promptIndex = normalizedLines.indexOf(promptLine);

  for (const rawLine of normalizedLines.slice(promptIndex + 1)) {
    const optionMatch = rawLine.match(/^\s*([A-E])[.)]\s*(.+)$/i);
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

function parseMultipleChoiceQuestionBlocks(text: string) {
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

    const optionMatch = trimmedLine.match(/^\s*([A-E])[.)]\s*(.+)$/i);
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

function parseMultipleChoiceMultipleAnswerGroups(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((group) => splitNonEmptyLines(group))
    .filter((group) => group.length > 0);
}

function normalizeLookupToken(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveMcOptionLetter(token: string, variants: string[]) {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  if (/^[A-E]$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const normalized = normalizeLookupToken(trimmed);
  for (let index = 0; index < variants.length; index += 1) {
    const letter = String.fromCharCode(65 + index);
    const optionText = variants[index] ?? "";
    const candidates = [`${letter}. ${optionText}`, `${letter}) ${optionText}`, optionText];
    if (candidates.some((candidate) => normalizeLookupToken(candidate) === normalized)) {
      return letter;
    }
  }

  return null;
}

function parseMcSingleAcceptedAnswers(line: string, variants: string[]) {
  const tokens = line
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);

  return [...new Set(tokens.map((token) => resolveMcOptionLetter(token, variants) ?? token))];
}

function parseMcMultipleAcceptedAnswers(tokens: string[], variants: string[]) {
  return [...new Set(
    tokens
      .map((token) => resolveMcOptionLetter(token, variants))
      .filter((token): token is string => Boolean(token))
  )];
}

function matchWordBankOptionVariants(token: string, options: string[]) {
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
    const orderLetter = String.fromCharCode(65 + index);
    const candidates = [fullOption, optionValue, optionText, orderLetter];

    if (candidates.some((candidate) => normalizeLookupToken(candidate) === normalized)) {
      return [...new Set([fullOption, optionText, optionValue, orderLetter].filter(Boolean))];
    }
  }

  return null;
}

function resolveWordBankAnswerVariants(token: string, options: string[]) {
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

function parseWordBankAcceptedAnswers(line: string, options: string[]) {
  return [...new Set(
    line
      .split(/[\/|]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .flatMap((token) => resolveWordBankAnswerVariants(token, options))
  )];
}

function questionSlotCount(group: AdminTestDraftQuestionGroup, question: AdminTestDraftQuestion) {
  if (!isMultipleChoiceMultipleType(group.typeId)) {
    return 1;
  }
  return Math.max(1, question.acceptedAnswers.filter((answer) => answer.trim().length > 0).length);
}

function questionRangeAtIndex(group: AdminTestDraftQuestionGroup, questionIndex: number) {
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

function formatQuestionRange(range: { start: number; end: number }) {
  return range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`;
}

function totalQuestionSlots(group: AdminTestDraftQuestionGroup) {
  return group.questions.reduce((count, question) => count + questionSlotCount(group, question), 0);
}

function analyzeMatchingInformationGroup(
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

function analyzeCompletionGroup(group: AdminTestDraftQuestionGroup) {
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

function analyzeMultipleChoiceGroup(group: AdminTestDraftQuestionGroup) {
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

function collectGroupIssues(
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

function getQuestionStartOffset(
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

function normalizeQuestionGroups(
  groups: AdminTestDraftQuestionGroup[],
  draftType: AdminTestDraftState["metadata"]["type"] = "reading",
  format: AdminTestDraftState["metadata"]["format"] = "full",
) {
  let nextQuestionStart = getQuestionStartOffset(draftType, format);

  return groups.map((group) => {
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

function findSectionInsertIndex(
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

function reorderQuestionGroupsForDrop(
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

function binaryAnswerOptionsForType(typeId: string) {
  if (typeId.includes("true_false")) {
    return ["TRUE", "FALSE", "NOT GIVEN"] as const;
  }
  if (typeId.includes("yes_no")) {
    return ["YES", "NO", "NOT GIVEN"] as const;
  }
  return null;
}

function normalizeRestrictedAnswerLine(line: string, allowedAnswers?: readonly string[]) {
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

function normalizeRestrictedAnswerBlockInput(value: string, allowedAnswers?: readonly string[]) {
  return value
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      return normalizeRestrictedAnswerLine(line, allowedAnswers);
    })
    .join("\n");
}

function normalizeMatchingHeadingsAnswerBlockInput(value: string) {
  return value
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      return normalizeMatchingHeadingAnswerLine(line);
    })
    .join("\n");
}

type BinaryStatementPreviewRow = {
  prompt: string;
  answer: string;
  normalizedAnswer: string;
  isValidAnswer: boolean;
};

function analyzeBinaryStatementGroup(group: AdminTestDraftQuestionGroup) {
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

function normalizeBinaryQuestionAcceptedAnswers(typeId: string, answers: string[]) {
  const allowedAnswers = binaryAnswerOptionsForType(typeId) ?? undefined;
  return answers
    .map((answer) => normalizeRestrictedAnswerLine(answer, allowedAnswers))
    .filter(Boolean);
}

function normalizeBinaryGroupDraft(group: AdminTestDraftQuestionGroup): AdminTestDraftQuestionGroup {
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

function normalizeBinaryDraftAnswers(draft: AdminTestDraftState): AdminTestDraftState {
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

function hasMeaningfulDraftContent(draft: AdminTestDraftState): boolean {
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

function resolveDraftTitleForSave(draft: AdminTestDraftState): string {
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

function isExamPracticeAutoTitle(value: string) {
  return /^Exam Practice Test \d+$/i.test(value.trim());
}

function extractExamPracticeNumber(value: string) {
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

function getNextExamPracticeTitleFromTests(
  tests: Array<{ source: string; title: string; type?: string }>,
  type: AdminTestDraftState["metadata"]["type"],
) {
  let maxNumber = 0;
  for (const test of tests) {
    if (String(test.source).trim().toLowerCase() !== "custom") {
      continue;
    }
    if (String(test.type ?? "").trim().toLowerCase() && String(test.type ?? "").trim().toLowerCase() !== type) {
      continue;
    }
    const number = extractExamPracticeNumber(test.title);
    if (number !== null) {
      maxNumber = Math.max(maxNumber, number);
    }
  }
  return `Exam Practice Test ${maxNumber + 1}`;
}

function defaultTimeLimitLabelForType(type: AdminTestDraftState["metadata"]["type"]) {
  return type === "listening" ? "Audio duration + 2 min" : "60 min exam";
}

function resolveDraftLogicalIndex(
  draftType: AdminTestDraftState["metadata"]["type"],
  format: AdminTestDraftState["metadata"]["format"],
  uiIndex: number,
) {
  if (format === "full") {
    return uiIndex;
  }

  const expectedPrefix = draftType === "listening" ? "part_" : "passage_";
  if (!format.startsWith(expectedPrefix)) {
    return uiIndex;
  }

  const suffix = Number.parseInt(format.split("_")[1] ?? "", 10);
  if (!Number.isFinite(suffix) || suffix <= 0) {
    return uiIndex;
  }

  return uiIndex === 0 ? suffix - 1 : uiIndex;
}

function isGenericSectionTitle(value: string) {
  return /^(Reading Passage|Listening Part|Passage|Part)\s+\d+\s*$/i.test(value.trim());
}

function isGenericListeningIntroTitle(value: string) {
  return /^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(value.trim());
}

function shouldRenderSectionTitle(
  draftType: AdminTestDraftState["metadata"]["type"],
  title: string,
) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return false;
  }
  if (
    draftType === "listening"
    && (isGenericSectionTitle(trimmedTitle) || isGenericListeningIntroTitle(trimmedTitle))
  ) {
    return false;
  }
  return true;
}

function normalizeMetadataQuickFixes(draft: AdminTestDraftState): AdminTestDraftState {
  const metadataTitle = resolveDraftTitleForSave(draft);
  const normalizedSourceDetail = normalizeAdminTestSourceDetail(draft.metadata.source, draft.metadata.sourceDetail);
  const normalizedTimeLimitLabel = draft.metadata.timeLimitLabel.trim() || defaultTimeLimitLabelForType(draft.metadata.type);
  const sectionLabelPrefix = draft.metadata.type === "listening" ? "Part" : "Passage";
  const sectionTitlePrefix = draft.metadata.type === "listening" ? "Listening Part" : "Reading Passage";

  return {
    ...draft,
    metadata: {
      ...draft.metadata,
      title: metadataTitle,
      sourceDetail: normalizedSourceDetail,
      timeLimitLabel: normalizedTimeLimitLabel,
    },
    content: {
      ...draft.content,
      sections: draft.content.sections.map((section, index) => {
        const logicalIndex = resolveDraftLogicalIndex(draft.metadata.type, draft.metadata.format, index);
        const normalizedLabel = `${sectionLabelPrefix} ${logicalIndex + 1}`;
        const trimmedTitle = section.title.trim();
        const normalizedTitle = draft.metadata.type === "listening"
          ? ((isGenericSectionTitle(trimmedTitle) || isGenericListeningIntroTitle(trimmedTitle)) ? "" : trimmedTitle)
          : (!trimmedTitle || isGenericSectionTitle(trimmedTitle)
              ? `${sectionTitlePrefix} ${logicalIndex + 1}`
              : trimmedTitle);

        return {
          ...section,
          label: normalizedLabel,
          title: normalizedTitle,
          content: draft.metadata.type === "listening"
            ? stripGeneratedListeningIntroFromContent(section.content)
            : section.content,
          subtitle: section.subtitle.trim(),
        };
      }),
    },
    questionGroups: (draft.questionGroups ?? []).map((group) => ({
      ...group,
      title: normalizeInlineBlankPlaceholders(group.title.trim()),
      instructions: normalizeInlineBlankPlaceholders(group.instructions.trim()),
      questionBlock: group.questionBlock !== undefined ? normalizeInlineBlankPlaceholders(group.questionBlock) : group.questionBlock,
      answerBlock: group.answerBlock !== undefined ? normalizeInlineBlankPlaceholders(group.answerBlock) : group.answerBlock,
      secondaryBlock: group.secondaryBlock !== undefined ? normalizeInlineBlankPlaceholders(group.secondaryBlock) : group.secondaryBlock,
      questions: group.questions.map((question) => ({
        ...question,
        prompt: normalizeInlineBlankPlaceholders(question.prompt),
        explanation: normalizeInlineBlankPlaceholders(question.explanation),
        variants: question.variants.map((variant) => normalizeInlineBlankPlaceholders(variant)),
      })),
    })),
  };
}

function prepareDraftForSave(draft: AdminTestDraftState): AdminTestDraftState {
  const normalizedDraft = normalizeBinaryDraftAnswers(draft);
  return normalizeMetadataQuickFixes(normalizedDraft);
}

function parseBraceBoldText(text: string) {
  const segments: Array<{ text: string; bold: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const openIndex = text.indexOf("{", cursor);
    if (openIndex === -1) {
      segments.push({ text: text.slice(cursor), bold: false });
      break;
    }

    if (openIndex > cursor) {
      segments.push({ text: text.slice(cursor, openIndex), bold: false });
    }

    const closeIndex = text.indexOf("}", openIndex + 1);
    if (closeIndex === -1) {
      segments.push({ text: text.slice(openIndex), bold: false });
      break;
    }

    const boldText = text.slice(openIndex + 1, closeIndex);
    if (boldText) {
      segments.push({ text: boldText, bold: true });
    }
    cursor = closeIndex + 1;
  }

  return segments;
}

function parseInlineItalicText(text: string) {
  const segments: Array<{ text: string; italic: boolean }> = [];
  const tokens = text.split(/(<\/?i>)/i);
  let italic = false;

  tokens.forEach((token) => {
    if (!token) {
      return;
    }
    if (/^<i>$/i.test(token)) {
      italic = true;
      return;
    }
    if (/^<\/i>$/i.test(token)) {
      italic = false;
      return;
    }
    segments.push({ text: token, italic });
  });

  return segments;
}

function renderBraceBoldInlineText(text: string, keyPrefix: string) {
  const italicSegments = parseInlineItalicText(text);
  if (italicSegments.length === 0) {
    return text;
  }

  return italicSegments.flatMap((italicSegment, italicIndex) => {
    const segments = parseBraceBoldText(italicSegment.text);
    if (segments.length === 0) {
      return [];
    }

    return segments.map((segment, index) => {
      const sharedClassName = italicSegment.italic ? "italic" : undefined;

      if (segment.bold) {
        return (
          <strong
            key={`${keyPrefix}-bold-${italicIndex}-${index}`}
            className={cn("font-bold text-inherit", sharedClassName)}
          >
            {segment.text}
          </strong>
        );
      }

      if (italicSegment.italic) {
        return (
          <em key={`${keyPrefix}-italic-${italicIndex}-${index}`} className="italic">
            {segment.text}
          </em>
        );
      }

      return <span key={`${keyPrefix}-plain-${italicIndex}-${index}`}>{segment.text}</span>;
    });
  });
}

function renderBraceBoldText(text: string, keyPrefix: string) {
  const normalizedText = normalizeInlineBlankPlaceholders(text);
  const lines = normalizedText.split("\n");
  if (lines.length === 1 && !/^\s*\*/.test(lines[0] ?? "")) {
    return renderBraceBoldInlineText(normalizedText, keyPrefix);
  }

  return lines.map((rawLine, index) => {
    const isBulletLine = /^\s*\*/.test(rawLine);
    const lineText = rawLine.replace(/^\s*\*\s?/, "");
    const renderedLine = renderBraceBoldInlineText(lineText, `${keyPrefix}-line-${index}`);

    return (
      <span key={`${keyPrefix}-row-${index}`}>
        {isBulletLine ? (
          <span className="my-0.5 inline-flex max-w-full items-start gap-2 align-top">
            <span className="mt-[0.55em] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
            <span className="min-w-0 flex-1">{lineText ? renderedLine : <>&nbsp;</>}</span>
          </span>
        ) : lineText ? (
          renderedLine
        ) : (
          <span>&nbsp;</span>
        )}
        {index < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}

function parseBinaryInstructionLayout(text: string) {
  const lines = text.split("\n");
  const prefixLines: string[] = [];
  const optionRows: Array<{ label: string; detail: string }> = [];
  let sawOptionRow = false;

  for (const line of lines) {
    const match = line.match(/^\{([^}]+)\}(?:\t+|\s{2,})(.+)$/);
    if (match) {
      sawOptionRow = true;
      optionRows.push({
        label: match[1]?.trim() ?? "",
        detail: match[2]?.trim() ?? "",
      });
      continue;
    }

    if (!sawOptionRow) {
      prefixLines.push(line);
    }
  }

  if (optionRows.length < 2) {
    return null;
  }

  return {
    prefix: prefixLines.join("\n").trimEnd(),
    optionRows,
  };
}

function parseCompletionTableLayout(text: string) {
  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    return null;
  }

  const parsedRows: Array<{ isHeader: boolean; cells: string[] }> = [];

  for (const line of rows) {
    if (!line.includes("|")) {
      const previousRow = parsedRows[parsedRows.length - 1];
      if (!previousRow) {
        return null;
      }

      const continuationTargetIndex = /^\(.*\)$/.test(line)
        ? 0
        : Math.max(0, previousRow.cells.length - 1);
      previousRow.cells[continuationTargetIndex] = previousRow.cells[continuationTargetIndex]
        ? `${previousRow.cells[continuationTargetIndex]}\n${line}`
        : line;
      continue;
    }

    const isHeader = line.startsWith("||") && line.endsWith("||");
    const body = isHeader ? line.slice(2, -2).trim() : line;
    const cells = body.split("|").map((cell) => cell.trim());
    if (cells.length < 2) {
      return null;
    }
    parsedRows.push({ isHeader, cells });
  }

  return parsedRows;
}

function renderInstructionPreviewText(text: string, keyPrefix: string) {
  const binaryLayout = parseBinaryInstructionLayout(text);
  if (!binaryLayout) {
    return <>{renderBraceBoldText(text, keyPrefix)}</>;
  }

  return (
    <div className="space-y-2">
      {binaryLayout.prefix ? (
        <div className="whitespace-pre-wrap">{renderBraceBoldText(binaryLayout.prefix, `${keyPrefix}-prefix`)}</div>
      ) : null}
      <div className="grid gap-y-1">
        {binaryLayout.optionRows.map((row, index) => (
          <div key={`${keyPrefix}-row-${row.label}-${index}`} className="grid grid-cols-[5.5rem_1fr] items-start gap-x-1">
            <strong className="font-bold text-foreground">{row.label}</strong>
            <span>{row.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


export function TestEditorWizard({ mode, testId, initialDraft }: Props) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<WizardStepId>("metadata");
  const draftSeed = useMemo(
    () => normalizeBinaryDraftAnswers(initialDraft ?? createEmptyDraft()),
    [initialDraft],
  );
  const draftSeedStr = useMemo(() => JSON.stringify(draftSeed), [draftSeed]);
  const [draft, setDraft] = useState<AdminTestDraftState>(draftSeed);
  const [resolvedTestId, setResolvedTestId] = useState<string | undefined>(testId);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<"idle" | "publishing" | "published" | "error">("idle");
  const activeStepIndex = stepOrder.indexOf(activeStep);
  const completionRatio = ((activeStepIndex + 1) / stepOrder.length) * 100;
  const isPublishedEdit = mode === "edit" && draft.metadata.status === "published";

  // Auto-Save Effect (Debounced)
  const [lastSavedDraftStr, setLastSavedDraftStr] = useState<string>("");
  const draftRef = useRef(draft);
  const lastHydratedDraftSeedRef = useRef(draftSeedStr);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (isPublishedEdit || saveState === "saving" || publishState === "publishing" || publishState === "published") return;

    const currentDraftStr = JSON.stringify(draft);
    if (currentDraftStr === lastSavedDraftStr) return;

    const handler = setTimeout(() => {
      if (hasMeaningfulDraftContent(draft)) {
        void saveDraft(true, currentDraftStr);
      }
    }, 2000);

    return () => {
      clearTimeout(handler);
    };
  }, [draft, isPublishedEdit, lastSavedDraftStr, saveState, publishState]);

  useEffect(() => {
    const currentDraftStr = JSON.stringify(draftRef.current);
    const previousHydratedSeedStr = lastHydratedDraftSeedRef.current;
    const canHydrateSafely =
      currentDraftStr === previousHydratedSeedStr
      || currentDraftStr === draftSeedStr;

    if (!canHydrateSafely) {
      return;
    }

    lastHydratedDraftSeedRef.current = draftSeedStr;
    setDraft(draftSeed);
    setLastSavedDraftStr(draftSeedStr);
  }, [draftSeed, draftSeedStr]);

  useEffect(() => {
    if (mode !== "edit" || !resolvedTestId) {
      return;
    }

    let cancelled = false;
    const seedAtRequest = draftSeedStr;

    void adminApi.getDraft(resolvedTestId)
      .then((latestDraft) => {
        if (cancelled) {
          return;
        }

        const normalizedLatestDraft = normalizeBinaryDraftAnswers(latestDraft);
        const latestDraftStr = JSON.stringify(normalizedLatestDraft);
        if (latestDraftStr === seedAtRequest) {
          return;
        }

        if (JSON.stringify(draftRef.current) !== seedAtRequest) {
          return;
        }

        setDraft(normalizedLatestDraft);
        setLastSavedDraftStr(latestDraftStr);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [draftSeedStr, mode, resolvedTestId]);

  async function saveDraft(isAutoSave = false, draftStr?: string) {
    try {
      setSaveState("saving");
      setSaveErrorMessage(null);
      const currentDraftToSave = prepareDraftForSave(draft);
      
      const saved = resolvedTestId
        ? await adminApi.updateDraft(resolvedTestId, currentDraftToSave)
        : await adminApi.createDraft(currentDraftToSave);

      const syncedDraft = {
        ...currentDraftToSave,
        metadata: {
          ...currentDraftToSave.metadata,
          title: saved.title,
          status: saved.status,
          version: saved.version,
          format: saved.format
        }
      };

      setResolvedTestId(saved.id);
      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          title: saved.title,
          status: saved.status,
          version: saved.version,
          format: saved.format,
        }
      }));
      
      // Update our tracking string to match what we just saved, 
      // preventing the effect from immediately firing again
      setLastSavedDraftStr(JSON.stringify(syncedDraft));
      
      setSaveState("saved");
      if (saved.id !== resolvedTestId) {
        if (!isAutoSave) {
          router.replace(`/tests/${saved.id}/edit`);
        } else {
          window.history.replaceState(null, "", `/tests/${saved.id}/edit`);
        }
      } else if (!testId && !isAutoSave) {
        router.replace(`/tests/${saved.id}/edit`);
      } else if (!testId && isAutoSave) {
        window.history.replaceState(null, "", `/tests/${saved.id}/edit`);
      }

      if (!isAutoSave) {
        router.refresh();
      }
      
      setTimeout(() => {
        setSaveState(current => current === "saved" ? "idle" : current);
      }, 3000);
    } catch (error) {
      setSaveErrorMessage(error instanceof Error ? error.message : "Save failed.");
      setSaveState("error");
    }
  }

  async function quickFixPublished() {
    if (!resolvedTestId) {
      return;
    }

    try {
      setSaveState("saving");
      const currentDraftToSave = prepareDraftForSave(draft);
      const saved = await adminApi.quickFixPublished(resolvedTestId, currentDraftToSave);
      const syncedDraft = {
        ...currentDraftToSave,
        metadata: {
          ...currentDraftToSave.metadata,
          title: saved.title,
          status: saved.status,
          version: saved.version,
          format: saved.format,
        },
      };

      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          title: saved.title,
          status: saved.status,
          version: saved.version,
          format: saved.format,
        },
      }));
      setLastSavedDraftStr(JSON.stringify(syncedDraft));
      setSaveState("saved");
      setTimeout(() => {
        setSaveState((current) => (current === "saved" ? "idle" : current));
      }, 3000);
    } catch {
      setSaveState("error");
    }
  }

  async function publishDraft() {
    let targetTestId = resolvedTestId;
    if (!targetTestId) {
      try {
        setSaveState("saving");
        setSaveErrorMessage(null);
        const preparedDraft = prepareDraftForSave(draft);
        const saved = await adminApi.createDraft(preparedDraft);
        targetTestId = saved.id;
        setResolvedTestId(saved.id);
        setDraft((current) => ({
          ...current,
          metadata: {
            ...current.metadata,
            title: saved.title,
            version: saved.version,
            status: saved.status
          }
        }));
        setSaveState("saved");
        router.replace(`/tests/${saved.id}/edit`);
      } catch (error) {
        setSaveErrorMessage(error instanceof Error ? error.message : "Save failed.");
        setSaveState("error");
        return;
      }
    }
    if (!targetTestId) {
      return;
    }

    try {
      setPublishState("publishing");
      const published = await adminApi.publishTest(targetTestId);
      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          status: published.status,
          version: published.version
        }
      }));
      setPublishState("published");
    } catch {
      setPublishState("error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <SectionHeader
          eyebrow={mode === "create" ? "Create test" : "Edit test"}
          title={mode === "create" ? "Professional Test Builder" : `Editing: ${draft.metadata.title}`}
          description="Build structured reading and listening tests with real-time user preview."
        />
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="mr-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {isPublishedEdit ? (
              <span className="whitespace-nowrap rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-warning">
                Quick Fix updates live. New Version creates a draft.
              </span>
            ) : null}
            {saveState === "saving" && (
              <span className="flex items-center gap-1.5 text-primary animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Saving...
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Saved
              </span>
            )}
            {saveState === "error" && <span className="text-destructive">{saveErrorMessage ?? "Save failed"}</span>}
            {saveState === "idle" && resolvedTestId && <span>Up to date</span>}
          </div>

          {isPublishedEdit ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void quickFixPublished()}
                disabled={saveState === "saving" || publishState === "publishing" || !resolvedTestId}
              >
                Quick Fix
              </Button>
              <Button
                type="button"
                variant="solid"
                size="sm"
                onClick={() => void saveDraft(false)}
                disabled={saveState === "saving" || publishState === "publishing"}
              >
                New Version
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => void saveDraft(false)}>
              Force Save
            </Button>
          )}

          {activeStep === "review" ? (
            !isPublishedEdit ? (
              <Button type="button" variant="solid" size="sm" onClick={() => void publishDraft()} disabled={publishState === "publishing" || saveState === "saving"}>
                {publishState === "publishing" ? "Publishing..." : publishState === "published" ? "Published" : publishState === "error" ? "Publish failed" : "Publish Test"}
              </Button>
            ) : null
          ) : (
            <Button type="button" variant="solid" size="sm" onClick={() => {
              const next = stepOrder[activeStepIndex + 1];
              if (next) setActiveStep(next);
            }}>
              Next step →
            </Button>
          )}
        </div>
      </div>

      {/* Horizontal Progress Bar */}
      <div className="bg-muted/30 p-1 rounded-xl border border-border flex items-center gap-1 overflow-x-auto no-scrollbar">
        {stepOrder.map((step, index) => (
          <button
            key={step}
            type="button"
            onClick={() => setActiveStep(step)}
            className={cn(
              "flex-1 min-w-[140px] flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-sm uppercase tracking-wider",
              activeStep === step 
                ? "bg-background text-primary shadow-sm border border-primary/20" 
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
          >
            <span className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2",
              activeStep === step ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
            )}>
              {index + 1}
            </span>
            {stepLabel(step)}
          </button>
        ))}
      </div>

      <div className="w-full min-w-0 pt-2">
        {activeStep === "metadata" ? <MetadataPanel draft={draft} setDraft={setDraft} /> : null}
        {activeStep === "content" ? <ContentPanel draft={draft} setDraft={setDraft} /> : null}
        {activeStep === "questions" ? <QuestionsPanel draft={draft} setDraft={setDraft} /> : null}
        {activeStep === "review" ? <ReviewPanel draft={draft} /> : null}
      </div>
    </div>
  );
}


function MetadataPanel({
  draft,
  setDraft
}: {
  draft: AdminTestDraftState;
  setDraft: React.Dispatch<React.SetStateAction<AdminTestDraftState>>;
}) {
  async function handleSourceChange(nextSource: AdminTestDraftState["metadata"]["source"]) {
    const shouldAutoApplyTitle =
      nextSource === "custom"
      && (
        draft.metadata.title.trim().length === 0
        || isExamPracticeAutoTitle(draft.metadata.title)
        || draft.metadata.source !== "custom"
      );

    if (!shouldAutoApplyTitle) {
      setDraft((current) => ({ ...current, metadata: { ...current.metadata, source: nextSource } }));
      return;
    }

    try {
      const tests = await adminApi.listTests();
      const nextTitle = getNextExamPracticeTitleFromTests(tests, draft.metadata.type);
      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          source: nextSource,
          title: nextTitle,
        },
      }));
    } catch {
      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          source: nextSource,
          title: nextSource === "custom" ? "Exam Practice Test" : current.metadata.title,
        },
      }));
    }
  }

  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle>Basic Configuration</CardTitle>
        <CardDescription>Essential details for identifying this test in the catalog.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 p-8 md:grid-cols-2">
        <div className="md:col-span-2">
          <EditableField label="Test Title">
            <Input 
              className="h-12 text-lg font-bold"
              placeholder="e.g. Cambridge 19 - Academic Reading Test 1"
              value={draft.metadata.title} 
              onChange={(event) => setDraft((current) => ({ ...current, metadata: { ...current.metadata, title: event.target.value } }))} 
            />
          </EditableField>
        </div>

        <div className="space-y-6">
          <ReadOnlyField label="Test Category" value={draft.metadata.type.toUpperCase()} />
          
          <EditableField label="Test Format">
            <Select 
              className="h-11 font-medium"
              value={draft.metadata.format} 
              onChange={(event) => setDraft((current) => ({ ...current, metadata: { ...current.metadata, format: event.target.value as AdminTestDraftState["metadata"]["format"] } }))}>
              <option value="full">Full Mock Test (All parts)</option>
              {draft.metadata.type === "reading" ? (
                <>
                  <option value="passage_1">Practice Passage 1</option>
                  <option value="passage_2">Practice Passage 2</option>
                  <option value="passage_3">Practice Passage 3</option>
                </>
              ) : (
                <>
                  <option value="part_1">Practice Part 1</option>
                  <option value="part_2">Practice Part 2</option>
                  <option value="part_3">Practice Part 3</option>
                  <option value="part_4">Practice Part 4</option>
                </>
              )}
            </Select>
          </EditableField>
        </div>

        <div className="space-y-6">
          <EditableField label="Access Rule">
            <Select 
              className="h-11 font-medium"
              value={draft.metadata.accessType} 
              onChange={(event) => setDraft((current) => ({ ...current, metadata: { ...current.metadata, accessType: event.target.value as AdminTestDraftState["metadata"]["accessType"] } }))}>
              <option value="public">Free (Public Access)</option>
              <option value="premium">Premium (Subscribers Only)</option>
            </Select>
          </EditableField>

          <EditableField label="Primary Source">
             <Select 
              className="h-11 font-medium"
              value={draft.metadata.source} 
              onChange={(event) => { void handleSourceChange(event.target.value as AdminTestDraftState["metadata"]["source"]); }}>
              {adminTestSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </EditableField>
        </div>
      </CardContent>
    </Card>
  );
}


function ContentPanel({
  draft,
  setDraft
}: {
  draft: AdminTestDraftState;
  setDraft: React.Dispatch<React.SetStateAction<AdminTestDraftState>>;
}) {
  const pathname = usePathname();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [deleteConfirmSectionId, setDeleteConfirmSectionId] = useState<string | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null);
  const [transcribingSectionId, setTranscribingSectionId] = useState<string | null>(null);
  const [transcriptProgressBySection, setTranscriptProgressBySection] = useState<Record<string, TranscriptProgressState>>({});
  const [collapseStateReady, setCollapseStateReady] = useState(false);
  const collapseStorageKey = useMemo(() => "admin-content-sections:" + pathname, [pathname]);

  const addSection = () => {
    setDraft((current) => ({
      ...current,
      content: {
        sections: [
          ...current.content.sections,
          {
            id: createDraftId("draft-section"),
            label: current.metadata.type === "listening" ? "Part " + (current.content.sections.length + 1) : "Passage " + (current.content.sections.length + 1),
            title: current.metadata.type === "listening" ? "" : "Reading Passage " + (current.content.sections.length + 1),
            subtitle: "",
            content: "",
            paragraphs: [],
            showLabels: false,
            mediaKind: current.metadata.type === "listening" ? "audio" : "text",
            audioUrl: "",
            audioDurationSeconds: current.metadata.type === "listening" ? 0 : null,
            transcript: "",
            transcriptSegments: [],
            transcriptQuestionLocations: [],
            markerCount: 0
          }
        ]
      }
    }));
  };

  const removeSection = (sectionId: string) => {
    setDraft((current) => ({
      ...current,
      content: { sections: current.content.sections.filter((s) => s.id !== sectionId) },
      questionGroups: (current.questionGroups ?? []).filter((g) => g.sectionId !== sectionId)
    }));
    setDeleteConfirmSectionId(null);
    setCollapsedSections((current) => {
      const next = { ...current };
      delete next[sectionId];
      return next;
    });
  };

  const updateSection = (sectionId: string, updates: Partial<AdminTestDraftContentSection>) => {
    setDraft((current) => ({
      ...current,
      content: {
        sections: current.content.sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s)
      }
    }));
  };

  const getSectionTranscriptQuestionPayload = (sectionId: string) =>
    (draft.questionGroups ?? [])
      .filter((group) => group.sectionId === sectionId)
      .flatMap((group) =>
        group.questions.flatMap((question) => {
          const labelMatch = question.label.match(/(\d+)\s*-\s*(\d+)/);
          if (labelMatch) {
            const start = Number(labelMatch[1]);
            const end = Number(labelMatch[2]);
            const labels = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => String(start + index));
            if (labels.length > 1 && question.acceptedAnswers.length >= labels.length) {
              return labels.map((label, index) => ({
                questionId: `${question.id}:${label}`,
                questionLabel: label,
                questionPrompt: question.prompt,
                acceptedAnswers: [
                  resolveChoiceAnswerText(group, question, question.acceptedAnswers[index] ?? "")
                ].filter(Boolean),
              }));
            }
          }

          return [{
            questionId: question.id,
            questionLabel: question.label,
            questionPrompt: question.prompt,
            acceptedAnswers: question.acceptedAnswers
              .map((answer) => resolveChoiceAnswerText(group, question, answer))
              .filter(Boolean),
          }];
        })
      );

  const regenerateTranscript = async (section: AdminTestDraftContentSection, audioMeta?: { filename?: string; contentType?: string }) => {
    if (!section.audioUrl) return;
    setTranscribingSectionId(section.id);
    setTranscriptProgressBySection((current) => ({
      ...current,
      [section.id]: {
        value: 4,
        label: "Starting transcript job...",
        startedAt: Date.now(),
      },
    }));
    try {
      const transcriptPayload = await adminApi.generateListeningTranscript({
        audioUrl: section.audioUrl,
        audioFilename: audioMeta?.filename,
        audioContentType: audioMeta?.contentType,
        sectionLabel: section.label,
        sectionTitle: section.title,
        transcript: section.transcript,
        transcriptSegments: section.transcriptSegments,
        onJobId: (jobId) => {
          setTranscriptProgressBySection((current) => ({
            ...current,
            [section.id]: {
              value: current[section.id]?.value ?? 6,
              label: current[section.id]?.label ?? "Starting transcript job...",
              startedAt: current[section.id]?.startedAt ?? Date.now(),
              jobId,
            },
          }));
        },
        onProgress: ({ value, label }) => {
          setTranscriptProgressBySection((current) => ({
            ...current,
            [section.id]: {
              value,
              label,
              startedAt: current[section.id]?.startedAt ?? Date.now(),
              jobId: current[section.id]?.jobId,
            },
          }));
        },
        questions: getSectionTranscriptQuestionPayload(section.id),
      });
      const transcriptText = transcriptPayload.transcript.trim() || buildTranscriptTextFromSegments(transcriptPayload.transcriptSegments);
      updateSection(section.id, {
        mediaKind: "audio",
        transcript: transcriptText,
        transcriptSegments: transcriptPayload.transcriptSegments,
        transcriptQuestionLocations: transcriptPayload.transcriptQuestionLocations,
      });
    } finally {
      setTranscribingSectionId((current) => (current === section.id ? null : current));
      setTranscriptProgressBySection((current) => {
        const next = { ...current };
        delete next[section.id];
        return next;
      });
    }
  };

  const cancelTranscriptGeneration = async (sectionId: string) => {
    const jobId = transcriptProgressBySection[sectionId]?.jobId;
    if (!jobId) return;
    try {
      await adminApi.cancelListeningTranscriptJob(jobId);
    } finally {
      setTranscribingSectionId((current) => (current === sectionId ? null : current));
      setTranscriptProgressBySection((current) => {
        const next = { ...current };
        delete next[sectionId];
        return next;
      });
    }
  };

  const handleAudioUpload = async (sectionId: string, file?: File | null) => {
    if (!file) return;
    setUploadingSectionId(sectionId);
    try {
      const [asset, duration] = await Promise.all([
        adminApi.uploadAudio(file),
        getAudioFileDurationSeconds(file),
      ]);
      const updatedSection = draft.content.sections.find((item) => item.id === sectionId);
      updateSection(sectionId, {
        audioUrl: asset.publicUrl,
        audioDurationSeconds: duration,
        mediaKind: "audio",
        transcript: "",
        transcriptSegments: [],
        transcriptQuestionLocations: [],
      });
    } finally {
      setUploadingSectionId((current) => (current === sectionId ? null : current));
      setDraggingSectionId((current) => (current === sectionId ? null : current));
    }
  };

  useEffect(() => {
    let storedCollapsedSections: Record<string, boolean> = {};
    if (typeof window !== "undefined") {
      try {
        storedCollapsedSections = JSON.parse(window.localStorage.getItem(collapseStorageKey) ?? "{}") as Record<string, boolean>;
      } catch {
        storedCollapsedSections = {};
      }
    }

    setCollapsedSections((current) => {
      const next: Record<string, boolean> = {};
      for (const section of draft.content.sections) {
        next[section.id] = current[section.id] ?? storedCollapsedSections[section.id] ?? false;
      }
      return next;
    });
    setCollapseStateReady(true);
  }, [collapseStorageKey, draft.content.sections]);

  useEffect(() => {
    if (!collapseStateReady || typeof window === "undefined") return;
    const snapshot: Record<string, boolean> = {};
    for (const section of draft.content.sections) {
      snapshot[section.id] = collapsedSections[section.id] ?? false;
    }
    window.localStorage.setItem(collapseStorageKey, JSON.stringify(snapshot));
  }, [collapseStateReady, collapseStorageKey, collapsedSections, draft.content.sections]);

  const resolveLogicalIndex = (uiIndex: number) => {
    if (draft.metadata.format === "full") return uiIndex;

    console.log("[DEBUG] format:", draft.metadata.format);

    if (draft.metadata.format.includes("_")) {
      const formatSuffix = parseInt(draft.metadata.format.split("_")[1]);
      if (!isNaN(formatSuffix)) return formatSuffix - 1;
    }

    return uiIndex;
  };

  const getIeltsRangeStr = (uiIndex: number) => {
    const index = resolveLogicalIndex(uiIndex);
    if (draft.metadata.type === "listening") {
      const start = index * 10 + 1;
      const end = (index + 1) * 10;
      return start + "-" + end;
    }
    if (index === 0) return "1-13";
    if (index === 1) return "14-26";
    if (index === 2) return "27-40";
    return "X-Y";
  };

  const getIeltsIntroStr = (uiIndex: number) => {
    const index = resolveLogicalIndex(uiIndex);
    const range = getIeltsRangeStr(uiIndex);
    if (draft.metadata.type === "listening") {
      return "Part " + (index + 1) + ". Questions " + range + ".";
    }
    return "You should spend about 20 minutes on Questions " + range + ", which are based on Reading Passage " + (index + 1) + " below.";
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(360px,0.72fr)]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Test Content</h3>
            <p className="text-sm text-muted-foreground">Compose your reading passages or listening parts.</p>
          </div>
          {draft.metadata.format === "full" || draft.content.sections.length === 0 ? (
            <Button type="button" variant="solid" onClick={addSection}>
              + Add Section
            </Button>
          ) : null}
        </div>

        {draft.content.sections.map((section, idx) => {
          const sectionLabel = draft.metadata.type === "reading" ? "Passage " + (resolveLogicalIndex(idx) + 1) : "Part " + (resolveLogicalIndex(idx) + 1);
          const contentBlocks = parsePassageContentBlocks(section.content, Boolean(section.showLabels));
          const labelledBlocks = contentBlocks.filter((block) => block.isLabelled).length;
          const isSectionCollapsed = collapsedSections[section.id] ?? false;
          const showDeleteConfirm = deleteConfirmSectionId === section.id;

          return (
            <Card key={section.id} className="overflow-hidden border-border shadow-md">
              <CardHeader className={cn("border-b bg-muted/30 px-5", isSectionCollapsed ? "py-3" : "pt-5 pb-4")}>
                <div className={cn("flex items-start justify-between gap-4", showDeleteConfirm ? "border-b border-border/70 pb-4" : "")}>
                  <div className={cn(isSectionCollapsed ? "space-y-1" : "space-y-2")}>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Content Section</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">
                        {sectionLabel}
                      </div>
                      <h3 className={cn("font-black tracking-tight text-foreground", isSectionCollapsed ? "text-base" : "text-lg")}>
                        {shouldRenderSectionTitle(draft.metadata.type, section.title) ? section.title.trim() : "Untitled section"}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={section.showLabels ? "success" : "neutral"}>{section.showLabels ? "Labels ON" : "Labels OFF"}</Badge>
                      <Badge tone="neutral">{contentBlocks.length} blocks</Badge>
                      <Badge tone="neutral">{labelledBlocks} labelled</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCollapsedSections((current) => ({
                          ...current,
                          [section.id]: !(current[section.id] ?? false),
                        }))
                      }
                    >
                      {isSectionCollapsed ? "Expand" : "Collapse"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmSectionId(section.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {showDeleteConfirm ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Remove this section?</p>
                      <p className="text-xs text-danger">This removes the content section and all question groups linked to it.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteConfirmSectionId(null)}>
                        Cancel
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => removeSection(section.id)}>
                        Remove section
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardHeader>

              {!isSectionCollapsed ? (
                <CardContent className="space-y-5 p-5">
                  <EditableField label="Section Title">
                    <Input
                      className="h-11 bg-background font-bold"
                      placeholder={draft.metadata.type === "listening" ? "Optional section title" : "Enter Passage Title (e.g. The Giant Squid)"}
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    />
                  </EditableField>

                  <div className="flex items-start gap-3 rounded-lg border border-primary/10 bg-primary/5 p-4">
                    <div className="rounded bg-primary/10 p-1.5 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary">Instruction Preview</p>
                      <p className="text-sm font-medium italic leading-relaxed text-foreground/80">
                        {getIeltsIntroStr(idx)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {draft.metadata.type === "listening" ? (
                      <>
                        <EditableField label="Audio URL">
                          <Input
                            className="h-11 bg-background font-medium"
                            placeholder="Uploaded audio URL appears here"
                            value={section.audioUrl || ""}
                            onChange={(e) => updateSection(section.id, {
                              audioUrl: e.target.value,
                              mediaKind: "audio",
                              transcript: "",
                              transcriptSegments: [],
                              transcriptQuestionLocations: [],
                            })}
                          />
                        </EditableField>

                        <div
                          className={cn(
                            "rounded-xl border border-dashed p-4 transition-colors",
                            draggingSectionId === section.id
                              ? "border-primary bg-primary/5"
                              : "border-border/70 bg-muted/20",
                          )}
                          onDragOver={(event: ReactDragEvent<HTMLDivElement>) => {
                            event.preventDefault();
                            if (event.dataTransfer.types.includes("Files")) {
                              event.dataTransfer.dropEffect = "copy";
                              setDraggingSectionId(section.id);
                            }
                          }}
                          onDragLeave={(event: ReactDragEvent<HTMLDivElement>) => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                              setDraggingSectionId((current) => (current === section.id ? null : current));
                            }
                          }}
                          onDrop={(event: ReactDragEvent<HTMLDivElement>) => {
                            event.preventDefault();
                            const file = event.dataTransfer.files?.[0] ?? null;
                            void handleAudioUpload(section.id, file);
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Audio Asset</p>
                              <p className="text-xs text-muted-foreground">
                                Drag and drop audio here. Transcript generation is paused for now.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {section.audioUrl ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={transcribingSectionId === section.id}
                                  onClick={() => void regenerateTranscript(section)}
                                >
                                  {transcribingSectionId === section.id ? "Generating..." : "Regenerate Transcript"}
                                </Button>
                              ) : null}
                              {transcribingSectionId === section.id ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => void cancelTranscriptGeneration(section.id)}
                                >
                                  Cancel
                                </Button>
                              ) : null}
                              <label
                                className={cn(
                                  "inline-flex items-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground",
                                  transcribingSectionId === section.id
                                    ? "cursor-not-allowed opacity-50"
                                    : "cursor-pointer hover:bg-muted/40"
                                )}
                              >
                                {uploadingSectionId === section.id ? "Uploading..." : "Upload Audio"}
                                <input
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  disabled={transcribingSectionId === section.id}
                                  onChange={(event) => void handleAudioUpload(section.id, event.target.files?.[0] ?? null)}
                                />
                              </label>
                            </div>
                          </div>
                          {section.audioDurationSeconds ? (
                            <p className="mt-3 text-xs font-medium text-muted-foreground">
                              Detected duration: {section.audioDurationSeconds}s
                            </p>
                          ) : null}
                          {section.audioUrl ? (
                            <audio className="mt-4 w-full" controls src={section.audioUrl} />
                          ) : null}
                        </div>

                        <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Generated Transcript</p>
                              <p className="text-xs text-muted-foreground">
                                Transcript generation is manual for now. Click regenerate only when you need it.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                              <span>{section.transcriptSegments?.length ?? 0} segments</span>
                              <span>{section.transcriptQuestionLocations?.length ?? 0} answer anchors</span>
                            </div>
                          </div>
                          {transcribingSectionId === section.id ? (
                            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">
                                  {transcriptProgressBySection[section.id]?.label ?? "Generating transcript with timestamps..."}
                                </p>
                                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                                  {formatElapsedDuration(
                                    Date.now() - (transcriptProgressBySection[section.id]?.startedAt ?? Date.now())
                                  )}
                                </span>
                              </div>
                              <ProgressBar
                                value={transcriptProgressBySection[section.id]?.value ?? 8}
                                className="h-2.5 bg-primary/10"
                              />
                              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
                                <span>{Math.round(transcriptProgressBySection[section.id]?.value ?? 8)}%</span>
                                <span>Transcript job is running in the background</span>
                              </div>
                            </div>
                          ) : section.transcriptSegments && section.transcriptSegments.length > 0 ? (
                            <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-background/90 p-3">
                              {section.transcriptSegments.map((segment) => (
                                <div key={segment.id} className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-3 rounded-lg px-2 py-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                    {formatTranscriptTimestamp(segment.startSec)}
                                  </span>
                                  <p className="text-sm leading-relaxed text-foreground">
                                    {renderBraceBoldText(segment.text, `${section.id}-segment-${segment.id}`)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : section.transcript?.trim() ? (
                            <div className="mt-4 max-h-[320px] overflow-y-auto rounded-xl border border-border/60 bg-background/90 p-4">
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                {renderBraceBoldText(section.transcript.trim(), `${section.id}-transcript`)}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-4 text-sm text-muted-foreground">
                              Upload audio first. Transcript, timestamps, and answer anchors are paused until you regenerate manually.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M9 12h6"/><path d="M8 17h8"/><path d="M12 12v10"/><path d="M12 22l-3-3"/><path d="M12 22l3-3"/></svg>
                            Writing Zone
                          </h4>
                          <Button
                            type="button"
                            variant={section.showLabels ? "solid" : "outline"}
                            size="sm"
                            className="h-8 text-xs font-bold"
                            onClick={() => updateSection(section.id, { showLabels: !section.showLabels })}
                          >
                            {section.showLabels ? "Labels: ON (A, B, C)" : "Labels: OFF"}
                          </Button>
                        </div>
                        <div className="relative">
                          <Textarea
                            className="min-h-[450px] resize-y border-2 p-6 font-serif text-base leading-relaxed shadow-inner transition-all focus-visible:border-primary"
                            value={section.content}
                            onChange={(e) => updateSection(section.id, { content: e.target.value, paragraphs: [] })}
                            placeholder="Type or paste the passage text here. Use a blank line (double Enter) to separate paragraphs."
                          />
                          <div className="pointer-events-none absolute bottom-4 right-4 opacity-20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold">User View Simulator</h3>
        <Card className="h-fit sticky top-6 border-border shadow-md overflow-hidden">
          <CardHeader className="bg-muted py-3 px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-400"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                 <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preview</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-12 max-h-[75vh] overflow-y-auto pt-8 px-6 pb-16">
            <EditorUserPreview
              draft={draft}
              previewId="content"
              resolveLogicalIndex={resolveLogicalIndex}
              getIeltsIntroStr={getIeltsIntroStr}
              compact
              showSectionIntro
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuestionsPanel({
  draft,
  setDraft
}: {
  draft: AdminTestDraftState;
  setDraft: React.Dispatch<React.SetStateAction<AdminTestDraftState>>;
}) {
  const pathname = usePathname();
  const sectionLabelPrefix = draft.metadata.type === "reading" ? "Passage" : "Part";
  const [questionBlockSizes, setQuestionBlockSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null);
  const [collapseStateReady, setCollapseStateReady] = useState(false);
  const [panelSplitOffset, setPanelSplitOffset] = useState<number>(0);
  const [isDraggingPanelSplit, setIsDraggingPanelSplit] = useState(false);
  const [questionEditorGridWidths, setQuestionEditorGridWidths] = useState<Record<string, number>>({});
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [groupDropTarget, setGroupDropTarget] = useState<{ sectionId: string; beforeGroupId: string | null } | null>(null);
  const questionBlockRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const questionEditorGridRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const questionsLayoutRef = useRef<HTMLDivElement | null>(null);
  const activeGroupDragRef = useRef<{ groupId: string } | null>(null);
  const collapseStorageKey = useMemo(() => `admin-question-groups:${pathname}`, [pathname]);
  const questionBlockSizeStorageKey = useMemo(() => `admin-question-block-sizes:${pathname}`, [pathname]);
  const panelSplitStorageKey = useMemo(() => `admin-question-panel-split:${pathname}`, [pathname]);
  const clampPanelSplitOffset = (value: number) => Math.max(-14, Math.min(18, value));

  useEffect(() => {
    let storedCollapsedGroups: Record<string, boolean> = {};
    let storedQuestionBlockSizes: Record<string, { width: number; height: number }> = {};
    if (typeof window !== "undefined") {
      try {
        storedCollapsedGroups = JSON.parse(window.localStorage.getItem(collapseStorageKey) ?? "{}") as Record<string, boolean>;
      } catch {
        storedCollapsedGroups = {};
      }
      try {
        storedQuestionBlockSizes = JSON.parse(window.localStorage.getItem(questionBlockSizeStorageKey) ?? "{}") as Record<string, { width: number; height: number }>;
      } catch {
        storedQuestionBlockSizes = {};
      }
    }

    setCollapsedGroups((current) => {
      const next: Record<string, boolean> = {};
      for (const group of draft.questionGroups ?? []) {
        next[group.id] = current[group.id] ?? storedCollapsedGroups[group.id] ?? false;
      }
      return next;
    });
    setQuestionBlockSizes((current) => {
      const next: Record<string, { width: number; height: number }> = {};
      for (const group of draft.questionGroups ?? []) {
        const existing = current[group.id] ?? storedQuestionBlockSizes[group.id];
        if (existing?.width && existing?.height) {
          next[group.id] = existing;
        }
      }
      return next;
    });
    setCollapseStateReady(true);
  }, [collapseStorageKey, draft.questionGroups, questionBlockSizeStorageKey]);

  useEffect(() => {
    if (!collapseStateReady || typeof window === "undefined") return;
    const snapshot: Record<string, boolean> = {};
    for (const group of draft.questionGroups ?? []) {
      snapshot[group.id] = collapsedGroups[group.id] ?? false;
    }
    window.localStorage.setItem(collapseStorageKey, JSON.stringify(snapshot));
  }, [collapseStateReady, collapseStorageKey, collapsedGroups, draft.questionGroups]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot: Record<string, { width: number; height: number }> = {};
    for (const group of draft.questionGroups ?? []) {
      const size = questionBlockSizes[group.id];
      if (size?.width && size?.height) {
        snapshot[group.id] = size;
      }
    }
    window.localStorage.setItem(questionBlockSizeStorageKey, JSON.stringify(snapshot));
  }, [draft.questionGroups, questionBlockSizes, questionBlockSizeStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(panelSplitStorageKey);
    if (!raw) return;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    setPanelSplitOffset(clampPanelSplitOffset(parsed));
  }, [panelSplitStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(panelSplitStorageKey, String(clampPanelSplitOffset(panelSplitOffset)));
  }, [panelSplitOffset, panelSplitStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return;
    const observers: ResizeObserver[] = [];

    for (const group of draft.questionGroups ?? []) {
      const node = questionBlockRefs.current[group.id];
      if (!node) continue;

      const observer = new ResizeObserver(() => {
        const width = node.offsetWidth;
        const height = node.offsetHeight;
        if (!width || !height) return;

        setQuestionBlockSizes((current) => {
          const existing = current[group.id];
          if (existing?.width === width && existing?.height === height) {
            return current;
          }
          return {
            ...current,
            [group.id]: { width, height },
          };
        });
      });

      observer.observe(node);
      observers.push(observer);
    }

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [draft.questionGroups]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return;
    const observers: ResizeObserver[] = [];

    for (const group of draft.questionGroups ?? []) {
      const node = questionEditorGridRefs.current[group.id];
      if (!node) continue;

      const observer = new ResizeObserver(() => {
        const width = node.offsetWidth;
        if (!width) return;

        setQuestionEditorGridWidths((current) => {
          if (current[group.id] === width) {
            return current;
          }
          return {
            ...current,
            [group.id]: width,
          };
        });
      });

      observer.observe(node);
      observers.push(observer);
    }

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [draft.questionGroups]);

  const addGroup = (sectionId?: string) => {
    const groups = draft.questionGroups ?? [];
    const typeId = draft.metadata.type === "listening" ? "listening_form_completion" : "reading_true_false_not_given";
    const targetSectionId = sectionId ?? draft.content.sections[0]?.id ?? "";
    const newGroup: AdminTestDraftQuestionGroup = {
      id: createDraftId("draft-group"),
      sectionId: targetSectionId,
      title: "",
      instructions: defaultInstructions[typeId] || "Enter instructions for this group of questions.",
      typeId,
      questionStart: 1,
      questionEnd: 1,
      sharedOptions: [],
      questions: []
    };
    setDraft((current) => ({
      ...current,
      questionGroups: normalizeQuestionGroups(
        reorderQuestionGroupsForDrop(
          [...(current.questionGroups ?? []), newGroup],
          current.content.sections,
          newGroup.id,
          targetSectionId,
          null,
        ),
        current.metadata.type,
        current.metadata.format,
      )
    }));
  };

  const moveGroup = (groupId: string, targetSectionId: string, beforeGroupId: string | null) => {
    setDraft((current) => ({
      ...current,
      questionGroups: normalizeQuestionGroups(
        reorderQuestionGroupsForDrop(
          current.questionGroups ?? [],
          current.content.sections,
          groupId,
          targetSectionId,
          beforeGroupId,
        ),
        current.metadata.type,
        current.metadata.format,
      ),
    }));
  };

  const handleDiagramImageUpload = (groupId: string, file?: File | null) => {
    if (!file) return;
    void adminApi.uploadImage(file).then((asset) => {
      updateGroup(groupId, { diagramImageUrl: asset.publicUrl });
    }).catch(() => undefined);
  };

  const handleDiagramImagePaste = (groupId: string, event: ReactClipboardEvent<HTMLDivElement>) => {
    const file = extractClipboardImageFile(event.clipboardData?.items);
    if (!file) {
      return;
    }

    event.preventDefault();
    handleDiagramImageUpload(groupId, file);
  };

  const pasteDiagramImageFromClipboard = async (groupId: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard || typeof navigator.clipboard.read !== "function") {
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));
        if (!imageType) {
          continue;
        }

        const blob = await clipboardItem.getType(imageType);
        const file = new File([blob], clipboardImageFileName(imageType), { type: imageType });
        handleDiagramImageUpload(groupId, file);
        return;
      }
    } catch {
      // Browser permission/security policies can block direct clipboard reads.
    }
  };

  const updateGroup = (groupId: string, updates: Partial<AdminTestDraftQuestionGroup>) => {
    setDraft((current) => ({
      ...current,
      questionGroups: normalizeQuestionGroups((() => {
        const nextGroups = (current.questionGroups ?? []).map((g) => {
          if (g.id !== groupId) return g;

          let newGroup = { ...g, ...updates };

          if (updates.typeId && updates.typeId !== g.typeId) {
            newGroup.instructions = defaultInstructions[updates.typeId] || newGroup.instructions;
            if (isListeningMapOptionType(updates.typeId)) {
              newGroup.sharedOptions = expandMapOptionRangeLines(newGroup.secondaryBlock ?? "");
            } else if (isListeningMapFreeTextType(updates.typeId)) {
              newGroup.sharedOptions = [];
            }
          }

          if (newGroup.typeId.includes("matching_headings")) {
            newGroup.answerBlock = normalizeMatchingHeadingsAnswerBlockInput(newGroup.answerBlock ?? "");
          }

          const shouldRebuildFromBlocks =
            updates.questionBlock !== undefined
            || updates.answerBlock !== undefined
            || updates.secondaryBlock !== undefined;
          const shouldRebuildMatchingHeadings =
            newGroup.typeId.includes("matching_headings")
            && (
              shouldRebuildFromBlocks
              || updates.sectionId !== undefined
              || updates.questionStart !== undefined
            );
          const shouldRebuildMatchingInformation =
            isMatchingInformationType(newGroup.typeId)
            && (
              shouldRebuildFromBlocks
              || updates.sectionId !== undefined
              || updates.questionStart !== undefined
            );
          const shouldRebuildBracketCompletion =
            isBracketCompletionType(newGroup.typeId)
            && (
              shouldRebuildFromBlocks
              || updates.questionStart !== undefined
            );
          const shouldRebuildBinaryStatements =
            isBinaryStatementType(newGroup.typeId)
            && (
              shouldRebuildFromBlocks
              || updates.questionStart !== undefined
            );

          if (shouldRebuildFromBlocks || shouldRebuildMatchingHeadings || shouldRebuildMatchingInformation || shouldRebuildBracketCompletion || shouldRebuildBinaryStatements) {
            const qBlock = updates.questionBlock ?? g.questionBlock ?? "";
            const aBlock = updates.answerBlock ?? g.answerBlock ?? "";
            const sBlock = updates.secondaryBlock ?? g.secondaryBlock ?? "";

            const isMatchingHeadings = newGroup.typeId.includes("matching_headings");
            const isMatchingInformation = isMatchingInformationType(newGroup.typeId);
            const isBracketCompletion = isBracketCompletionType(newGroup.typeId);
            const isBinaryStatements = isBinaryStatementType(newGroup.typeId);
            const isMultipleChoiceMultiple = isMultipleChoiceMultipleType(newGroup.typeId);
            const parsedMultipleChoiceBlocks = newGroup.typeId.includes("mc_")
              ? parseMultipleChoiceQuestionBlocks(qBlock)
              : [];
            const qLines = newGroup.typeId.includes("mc_")
              ? parsedMultipleChoiceBlocks.map((block) => block.prompt)
              : isMatchingInformation
                ? splitNonEmptyLines(qBlock)
                : qBlock.split("\n\n").map((line) => line.trim()).filter(Boolean);
            const aLines = aBlock.split("\n").map((line) => line.trim()).filter(Boolean);
            const newQuestions: AdminTestDraftQuestion[] = [];

            if (isMatchingInformation) {
              const targetSection = current.content.sections.find((section) => section.id === newGroup.sectionId);
              newGroup.sharedOptions = paragraphLabelsForSection(targetSection);
            } else if (
              newGroup.typeId.includes("matching_headings")
              || newGroup.typeId.includes("matching_features")
              || newGroup.typeId.includes("matching_sentence_endings")
              || newGroup.typeId.includes("wordbank")
            ) {
              newGroup.sharedOptions = sBlock.split("\n").map((line) => line.trim()).filter(Boolean);
            } else if (isListeningMapOptionType(newGroup.typeId)) {
              newGroup.sharedOptions = expandMapOptionRangeLines(sBlock);
            } else {
              newGroup.sharedOptions = [];
            }

            if (isMatchingHeadings) {
              newQuestions.push(...analyzeMatchingHeadingsGroup(newGroup, current.content.sections).generatedQuestions);
            } else if (isBracketCompletion) {
              const markerCount = (qBlock.match(/\[\]/g) ?? []).length;
              for (let index = 0; index < markerCount; index += 1) {
                const existingQuestion = g.questions[index];
                const questionNumber = newGroup.questionStart + index;
                newQuestions.push({
                  id: existingQuestion?.id ?? createDraftId("draft-q"),
                  label: `${questionNumber}`,
                  prompt: `Blank ${questionNumber}`,
                  acceptedAnswers: newGroup.typeId.includes("wordbank")
                    ? parseWordBankAcceptedAnswers(aLines[index] ?? "", newGroup.sharedOptions)
                    : parseBracketCompletionAnswers(aLines[index] ?? ""),
                  explanation: existingQuestion?.explanation ?? "",
                  variants: [],
                });
              }
            } else if (isBinaryStatements) {
              newQuestions.push(...analyzeBinaryStatementGroup(newGroup).generatedQuestions);
            } else {
              const multipleChoiceAnswerGroups = isMultipleChoiceMultiple
                ? parseMultipleChoiceMultipleAnswerGroups(aBlock)
                : [];
              let nextQuestionNumber = newGroup.questionStart;

              qLines.forEach((qText, index) => {
                const existingQuestion = g.questions[index];
                let prompt = qText;
                let variants: string[] = [];
                let acceptedAnswers: string[] = [];

                if (newGroup.typeId.includes("mc_")) {
                  const parsedQuestion = parsedMultipleChoiceBlocks[index] ?? parseMultipleChoiceQuestionBlock(qText);
                  prompt = parsedQuestion.prompt;
                  variants = parsedQuestion.variants;
                }

                if (isMultipleChoiceMultiple) {
                  acceptedAnswers = parseMcMultipleAcceptedAnswers(
                    multipleChoiceAnswerGroups[index] ?? [],
                    variants,
                  );
                } else if (newGroup.typeId.includes("mc_") && aLines[index]) {
                  acceptedAnswers = parseMcSingleAcceptedAnswers(aLines[index], variants);
                } else if (aLines[index]) {
                  acceptedAnswers = aLines[index].split("|").map((answer) => answer.trim()).filter(Boolean);
                }

                const slotCount = isMultipleChoiceMultiple ? Math.max(1, acceptedAnswers.length) : 1;
                const questionRange = {
                  start: nextQuestionNumber,
                  end: nextQuestionNumber + slotCount - 1,
                };
                nextQuestionNumber = questionRange.end + 1;

                newQuestions.push({
                  id: existingQuestion?.id ?? createDraftId("draft-q"),
                  label: formatQuestionRange(questionRange),
                  prompt,
                  acceptedAnswers,
                  explanation: existingQuestion?.explanation ?? "",
                  variants,
                });
              });
            }

            newGroup.questions = newQuestions;
            newGroup.questionEnd = newGroup.questionStart + Math.max(0, totalQuestionSlots({ ...newGroup, questions: newQuestions }) - 1);
          }

          return newGroup;
        });

        if (updates.sectionId) {
          return reorderQuestionGroupsForDrop(
            nextGroups,
            current.content.sections,
            groupId,
            updates.sectionId,
            null,
          );
        }

        return nextGroups;
      })(), current.metadata.type, current.metadata.format)
    }));
  };

  const removeGroup = (groupId: string) => {
    setDraft((current) => ({
      ...current,
      questionGroups: normalizeQuestionGroups((current.questionGroups ?? []).filter((g) => g.id !== groupId), current.metadata.type, current.metadata.format)
    }));
  };

  const updateQuestion = (groupId: string, questionId: string, updates: Partial<AdminTestDraftQuestion>) => {
    setDraft((current) => ({
      ...current,
      questionGroups: normalizeQuestionGroups((current.questionGroups ?? []).map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          questions: g.questions.map((q) => q.id === questionId ? { ...q, ...updates } : q)
        };
      }), current.metadata.type, current.metadata.format)
    }));
  };

  const removeQuestion = (groupId: string, questionId: string) => {
    setDraft((current) => ({
      ...current,
      questionGroups: normalizeQuestionGroups((current.questionGroups ?? []).map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          questions: g.questions.filter((q) => q.id !== questionId)
        };
      }), current.metadata.type, current.metadata.format)
    }));
  };



  const resolveLogicalIndex = (uiIndex: number) => {
    if (draft.metadata.format === "full") return uiIndex;
    
    // Log for debugging
    console.log("[DEBUG] format:", draft.metadata.format);
    
    // Support new explicit formats (passage_1, passage_2, part_3)
    if (draft.metadata.format.includes("_")) {
      const formatSuffix = parseInt(draft.metadata.format.split("_")[1]);
      if (!isNaN(formatSuffix)) return formatSuffix - 1; // 1-based to 0-based index
    }
    
    // Fallback for legacy "part" format if present
    return uiIndex;
  };

  const getIeltsRangeStr = (uiIndex: number) => {
    const index = resolveLogicalIndex(uiIndex);
    if (draft.metadata.type === "listening") {
      const start = index * 10 + 1;
      const end = (index + 1) * 10;
      return `${start}-${end}`;
    }
    if (index === 0) return "1-13";
    if (index === 1) return "14-26";
    if (index === 2) return "27-40";
    return "X-Y";
  };

  const getIeltsIntroStr = (uiIndex: number) => {
    const index = resolveLogicalIndex(uiIndex);
    const range = getIeltsRangeStr(uiIndex);
    if (draft.metadata.type === "listening") {
      return `Part ${index + 1}. Questions ${range}.`;
    }
    return `You should spend about 20 minutes on Questions ${range}, which are based on Reading Passage ${index + 1} below.`;
  };

  useEffect(() => {
    setDraft((current) => {
      const normalized = normalizeQuestionGroups(current.questionGroups ?? [], current.metadata.type, current.metadata.format);
      if (JSON.stringify(normalized) === JSON.stringify(current.questionGroups ?? [])) {
        return current;
      }
      return {
        ...current,
        questionGroups: normalized,
      };
    });
  }, [draft.metadata.format, draft.metadata.type, setDraft]);

  const groupedQuestionGroups = useMemo(() => {
    const grouped: Array<{
      key: string;
      sectionId: string | null;
      sectionLabel: string;
      groups: AdminTestDraftQuestionGroup[];
      canAddGroups: boolean;
    }> = draft.content.sections
      .map((section, index) => ({
        key: section.id,
        sectionId: section.id,
        sectionLabel: `${sectionLabelPrefix} ${index + 1}`,
        groups: (draft.questionGroups ?? []).filter((group) => group.sectionId === section.id),
        canAddGroups: true,
      }));

    const orphanGroups = (draft.questionGroups ?? []).filter(
      (group) => !draft.content.sections.some((section) => section.id === group.sectionId)
    );
    if (orphanGroups.length > 0) {
      grouped.push({
        key: "unassigned",
        sectionId: null,
        sectionLabel: `${sectionLabelPrefix} ?`,
        groups: orphanGroups,
        canAddGroups: false,
      });
    }
    return grouped;
  }, [draft.content.sections, draft.questionGroups, sectionLabelPrefix]);

  const widestQuestionBlockWidth = useMemo(() => {
    const widths = Object.values(questionBlockSizes)
      .map((size) => size.width)
      .filter((width): width is number => Number.isFinite(width) && width > 0);
    if (widths.length === 0) {
      return 620;
    }
    return Math.min(1280, Math.max(320, Math.max(...widths)));
  }, [questionBlockSizes]);

  const answerPanelMinWidth = 180;
  const questionAnswerGap = 12;
  const editorDemandWidth = widestQuestionBlockWidth + answerPanelMinWidth + questionAnswerGap;

  const baseReviewWidth = useMemo(() => {
    if (editorDemandWidth >= 1080) {
      return 24;
    }
    if (editorDemandWidth >= 980) {
      return 26;
    }
    if (editorDemandWidth >= 900) {
      return 28;
    }
    if (editorDemandWidth >= 820) {
      return 30;
    }
    if (editorDemandWidth >= 740) {
      return 32;
    }
    return 34;
  }, [editorDemandWidth]);

  const reviewWidthPercent = useMemo(() => {
    return Math.max(24, Math.min(48, baseReviewWidth + panelSplitOffset));
  }, [baseReviewWidth, panelSplitOffset]);

  const editorWidthPercent = 100 - reviewWidthPercent;
  const questionsGridColumns = `minmax(0,${editorWidthPercent}%) minmax(220px,${reviewWidthPercent}%)`;
  const dividerViewportLeft = (() => {
    const layout = questionsLayoutRef.current?.getBoundingClientRect();
    if (!layout) return null;
    return layout.left + (layout.width * editorWidthPercent) / 100;
  })();

  useEffect(() => {
    if (!isDraggingPanelSplit) return;

    const handlePointerMove = (event: PointerEvent) => {
      const layout = questionsLayoutRef.current?.getBoundingClientRect();
      if (!layout || layout.width <= 0) return;

      const pointerRatio = (event.clientX - layout.left) / layout.width;
      const nextEditorWidth = Math.max(52, Math.min(76, pointerRatio * 100));
      const nextReviewWidth = 100 - nextEditorWidth;
      setPanelSplitOffset(clampPanelSplitOffset(nextReviewWidth - baseReviewWidth));
    };

    const stopDragging = () => {
      setIsDraggingPanelSplit(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [baseReviewWidth, isDraggingPanelSplit]);

  const handleGroupDrop = (sectionId: string, beforeGroupId: string | null) => {
    if (!draggedGroupId) return;
    moveGroup(draggedGroupId, sectionId, beforeGroupId);
    setDraggedGroupId(null);
    setGroupDropTarget(null);
  };

  const resolveGroupDropTargetFromPoint = (clientX: number, clientY: number, draggedId: string) => {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const cardTarget = target?.closest("[data-group-card-id]") as HTMLElement | null;

    if (cardTarget) {
      const sectionId = cardTarget.dataset.groupSectionId ?? "";
      const currentGroupId = cardTarget.dataset.groupCardId ?? "";
      const nextGroupId = cardTarget.dataset.groupNextGroupId || null;
      if (!sectionId || !currentGroupId || currentGroupId === draggedId) {
        return null;
      }

      const bounds = cardTarget.getBoundingClientRect();
      const midpointY = bounds.top + bounds.height / 2;
      return {
        sectionId,
        beforeGroupId: clientY < midpointY ? currentGroupId : nextGroupId,
      };
    }

    const zoneTarget = target?.closest("[data-group-drop-section-id]") as HTMLElement | null;
    if (zoneTarget) {
      const sectionId = zoneTarget.dataset.groupDropSectionId ?? "";
      const beforeGroupId = zoneTarget.dataset.groupDropBeforeId || null;
      if (sectionId) {
        return { sectionId, beforeGroupId };
      }
    }

    return null;
  };

  const startGroupPointerDrag = (groupId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();

    activeGroupDragRef.current = { groupId };
    setDraggedGroupId(groupId);
    setGroupDropTarget(null);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const activeDrag = activeGroupDragRef.current;
      if (!activeDrag) return;
      setGroupDropTarget(resolveGroupDropTargetFromPoint(moveEvent.clientX, moveEvent.clientY, activeDrag.groupId));
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      activeGroupDragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setDraggedGroupId(null);
      setGroupDropTarget(null);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const activeDrag = activeGroupDragRef.current;
      if (!activeDrag) {
        cleanup();
        return;
      }

      const targetDrop = resolveGroupDropTargetFromPoint(upEvent.clientX, upEvent.clientY, activeDrag.groupId);
      if (targetDrop) {
        moveGroup(activeDrag.groupId, targetDrop.sectionId, targetDrop.beforeGroupId);
      }
      cleanup();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const renderGroupDropZone = (sectionId: string, beforeGroupId: string | null) => {
    const isActiveTarget =
      Boolean(draggedGroupId)
      && groupDropTarget?.sectionId === sectionId
      && groupDropTarget?.beforeGroupId === beforeGroupId;

    return (
      <div
        key={`${sectionId}-${beforeGroupId ?? "end"}`}
        data-group-drop-section-id={sectionId}
        data-group-drop-before-id={beforeGroupId ?? ""}
        className={cn(
          "rounded-lg border border-dashed px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] transition",
          draggedGroupId
            ? isActiveTarget
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border/70 bg-muted/20 text-muted-foreground hover:border-primary/40"
            : "pointer-events-none h-0 overflow-hidden border-transparent p-0 text-transparent"
        )}
      >
        Drop group here
      </div>
    );
  };

  return (
    <div className="relative">
      <div
        ref={questionsLayoutRef}
        className="grid gap-4 xl:gap-0 xl:[grid-template-columns:var(--questions-grid-cols)]"
        style={{ "--questions-grid-cols": questionsGridColumns } as CSSProperties}
      >
        <div className="min-w-0 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Questions Inventory</h3>
            <p className="text-sm text-muted-foreground">Manage question groups, then drag them between passages to fix order and numbering.</p>
          </div>
        </div>

        {groupedQuestionGroups.map((sectionGroup) => (
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
        {sectionGroup.groups.map((group, groupIndex) => {
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

          return (
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
          <Card
            className={cn(
              "overflow-hidden border-primary/20 bg-primary/5 shadow-sm transition",
              draggedGroupId === group.id && "opacity-65 ring-2 ring-primary/35"
            )}
          >
            <CardHeader className={cn("px-4", isGroupCollapsed ? "py-3" : "pt-4 pb-3")}>
              <div className={cn("flex items-start justify-between gap-4 border-b border-primary/10", isGroupCollapsed ? "pb-3" : "pb-4")}>
                <div className={cn(isGroupCollapsed ? "space-y-1" : "space-y-2")}>
                  <h3 className={cn("font-black tracking-tight text-foreground", isGroupCollapsed ? "text-[15px]" : "text-[17px]")}>{group.title}</h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="info">{questionTypeLabel}</Badge>
                    <Badge tone="neutral">{sectionGroup.sectionLabel}</Badge>
                    <Badge tone="neutral">{totalQuestionSlots(group)} questions</Badge>
                    <Badge tone={isGroupValid ? "success" : "warning"}>
                      {isGroupValid ? "Ready" : `${configuredQuestions}/${group.questions.length} ready`}
                    </Badge>
                    {groupIssues.length > 0 ? (
                      <Badge tone="warning">
                        {groupIssues.length} issue{groupIssues.length === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    onPointerDown={(event) => startGroupPointerDrag(group.id, event)}
                    className="flex h-8 items-center rounded-md border border-border/70 bg-background px-2 text-[11px] font-semibold text-muted-foreground cursor-grab active:cursor-grabbing select-none"
                    title="Drag to move this group"
                    aria-label="Drag to move this group"
                  >
                    Drag
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCollapsedGroups((current) => ({
                        ...current,
                        [group.id]: !(current[group.id] ?? false),
                      }))
                    }
                  >
                    {isGroupCollapsed ? "Expand" : "Collapse"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmGroupId(group.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {showDeleteConfirm ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Delete this group?</p>
                    <p className="text-xs text-danger">This removes the group and all questions inside it.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmGroupId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setDeleteConfirmGroupId(null);
                        removeGroup(group.id);
                      }}
                    >
                      Delete group
                    </Button>
                  </div>
                </div>
              ) : null}

              {!isGroupCollapsed ? (
                <div className="pt-4">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <EditableField label="Group Label / Title">
                      <Input 
                        className="bg-background font-bold" 
                        value={group.title} 
                        onChange={(e) => updateGroup(group.id, { title: e.target.value })} 
                      />
                    </EditableField>
                    <EditableField label="Question Type">
                      <Select
                        className="bg-background"
                        value={group.typeId}
                        onChange={(e) => updateGroup(group.id, { typeId: e.target.value })}
                      >
                        {(draft.metadata.type === "listening" ? listeningQuestionTypes : readingQuestionTypes).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </EditableField>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <EditableField label="Target Section">
                      <Select
                        className="bg-background"
                        value={group.sectionId}
                        onChange={(e) => updateGroup(group.id, { sectionId: e.target.value })}
                      >
                        {draft.content.sections.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </Select>
                    </EditableField>
                    <ReadOnlyField label="Question Range" value={`${formatQuestionRange({ start: group.questionStart, end: group.questionEnd })} (auto)`} />
                  </div>
                  <EditableField label="Group Instructions">
                    <Textarea className="bg-background min-h-[60px]" value={group.instructions} onChange={(e) => updateGroup(group.id, { instructions: e.target.value })} />
                  </EditableField>

                  {isDiagramLabelingType(group.typeId) ? (
                    <div className="grid gap-4">
                      <EditableField label="Diagram Image">
                        <div
                          className="space-y-3 rounded-xl border border-border/70 bg-card/45 p-3"
                          tabIndex={0}
                          onPaste={(event) => handleDiagramImagePaste(group.id, event)}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
                            onChange={(event) => handleDiagramImageUpload(group.id, event.target.files?.[0] ?? null)}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void pasteDiagramImageFromClipboard(group.id)}
                            >
                              Paste from Clipboard
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              You can also click here and press Ctrl+V / Cmd+V.
                            </p>
                          </div>
                          {group.diagramImageUrl ? (
                            <div className="space-y-3">
                              <div className="overflow-hidden rounded-xl border border-border bg-background/70 p-2">
                                <img
                                  src={group.diagramImageUrl}
                                  alt={group.title}
                                  className="max-h-[220px] w-full rounded-lg object-contain"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateGroup(group.id, { diagramImageUrl: "" })}
                              >
                                Remove image
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Upload or paste the diagram asset shown above the blanks in preview and exam mode.</p>
                          )}
                        </div>
                      </EditableField>
                    </div>
                  ) : null}

                  {(group.typeId.includes("matching_headings") || group.typeId.includes("matching_features") || group.typeId.includes("matching_sentence_endings") || group.typeId.includes("wordbank") || group.typeId.includes("listening_matching") || isListeningMapOptionType(group.typeId)) && (
                    <EditableField
                      label={
                        group.typeId.includes("matching_headings")
                          ? "Headings"
                          : group.typeId.includes("matching_sentence_endings")
                            ? "Sentence Endings"
                          : isListeningMapOptionType(group.typeId)
                            ? "Map Options / Range"
                          : group.typeId.includes("listening_matching")
                            ? "Options"
                          : group.typeId.includes("wordbank")
                            ? "Word Bank"
                            : "Options"
                      }
                    >
                      <Textarea
                        className="bg-muted/30 font-mono text-sm min-h-[100px]"
                        value={group.secondaryBlock || ""}
                        onChange={(e) => updateGroup(group.id, { secondaryBlock: e.target.value })}
                        placeholder={
                          group.typeId.includes("matching_headings")
                            ? "i. Planning a bigger idea\nii. Looking back at early mistakes\n..."
                            : group.typeId.includes("matching_sentence_endings")
                              ? "A. was first proposed in 1920.\nB. reduced travel costs for workers.\nC. remained popular in rural areas."
                            : isListeningMapOptionType(group.typeId)
                              ? "A-H\nor\nA\nB\nC\nD"
                            : group.typeId.includes("listening_matching")
                              ? "A. Option One\nB. Option Two\nC. Option Three\nD. Option Four"
                            : group.typeId.includes("wordbank")
                              ? "A. Option One\nB. Option Two\nC. Option Three"
                              : "A. Option One\nB. Option Two\n..."
                        }
                      />
                    </EditableField>
                  )}
                  
                  <div
                    ref={(node) => {
                      questionEditorGridRefs.current[group.id] = node;
                    }}
                    className="grid gap-3 border-t border-dashed border-primary/20 pt-4 md:[grid-template-columns:minmax(0,var(--question-block-width))_minmax(180px,1fr)]"
                    style={questionEditorGridStyle}
                  >
                    {!group.typeId.includes("matching_headings") && (
                      <div
                        className="min-w-0 overflow-hidden space-y-2"
                        style={{ width: clampedQuestionBlockWidth ? `${clampedQuestionBlockWidth}px` : undefined }}
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Questions</p>
                        <textarea
                          ref={(node) => {
                            questionBlockRefs.current[group.id] = node;
                          }}
                          className={cn(
                            "block rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                            "w-full md:min-w-[320px] max-w-[1200px] overflow-auto",
                            isMultipleChoiceMultipleType(group.typeId) ? "min-h-[132px]" : "min-h-[250px]"
                          )}
                          style={{
                            resize: "both",
                            height: questionBlockSizes[group.id]?.height ? `${questionBlockSizes[group.id].height}px` : undefined,
                          }}
                          value={group.questionBlock || ""}
                          onChange={(e) => updateGroup(group.id, { questionBlock: e.target.value })}
                          placeholder={isBracketCompletionType(group.typeId)
                            ? group.typeId.includes("wordbank")
                              ? "* Complete the summary below using [] markers.\nThe first visitors arrived in [] and stayed for [] days."
                              : "* Complete the summary below using [] markers.\nThe first visitors arrived in [] and stayed for [] days."
                            : isBinaryStatementType(group.typeId)
                              ? "Other countries had built underground railways before the Metropolitan line opened.\nThe first trains were designed for passengers in warmer climates.\nSteam engines were initially used on the route."
                                : isMatchingInformationType(group.typeId)
                                  ? "a reference to early transport problems\na comparison with a later engineering solution\nan example of public criticism"
                                : isMultipleChoiceMultipleType(group.typeId)
                                  ? "<Which TWO changes improved the service?>\nLower ticket prices\nFaster trains\nMore stations\nLonger opening hours\nBetter maps\n\n<Which TWO problems remained?>\nNoise\nCrowding\nLighting\nSignage\nCost"
                                  : group.typeId.includes("mc_") 
                                    ? "<Question Text?>\nOption One\nOption Two\nOption Three" 
                                    : "Statement or sentence here..."}
                        />
                      </div>
                    )}
                    {group.typeId.includes("matching_headings") ? (
                      <div className="md:col-span-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                        <div className="min-w-0 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Answers</p>
                          <Textarea 
                            className="bg-muted/30 font-mono text-sm min-h-[250px]"
                            value={group.answerBlock || ""}
                            onChange={(e) => updateGroup(group.id, { answerBlock: e.target.value })}
                            placeholder={"H\n-\nC\nA"}
                          />
                        </div>

                        <div className="space-y-4 rounded-md border border-border bg-card/45 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Label Preview</p>
                            {matchingHeadingsMeta?.validLabels.length ? (
                              <Badge tone="neutral">Valid: {matchingHeadingsMeta.validLabels.join(", ")}</Badge>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            {matchingHeadingsMeta?.previewRows.length ? (
                              matchingHeadingsMeta.previewRows.map((row, index) => (
                                <div
                                  key={`${group.id}-map-${index}`}
                                  className={cn(
                                    "rounded-lg border px-3 py-2 text-sm",
                                    row.isUnused
                                      ? "border-border/60 bg-muted/20"
                                      : row.label && row.isValidLabel && !row.isDuplicate
                                      ? "border-success/25 bg-success/5"
                                      : "border-danger/25 bg-danger/5"
                                  )}
                                >
                                  <p className="font-semibold text-foreground">
                                    {(row.label || "—").toUpperCase()} {"->"} {row.headingText || row.headingLine}
                                  </p>
                                  {row.isUnused ? (
                                    <p className="mt-1 text-xs text-muted-foreground">Unused heading.</p>
                                  ) : null}
                                  {row.label && row.isDuplicate ? (
                                    <p className="mt-1 text-xs text-danger">Duplicate paragraph label.</p>
                                  ) : null}
                                  {row.label && !row.isUnused && !row.isValidLabel ? (
                                    <p className="mt-1 text-xs text-danger">Label is outside the current passage range.</p>
                                  ) : null}
                                </div>
                              ))
                            ) : (
                              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                                Enter headings above and paragraph labels here to preview mappings like A {"->"} Planning a bigger idea.
                              </p>
                            )}
                          </div>

                          {matchingHeadingsMeta && matchingHeadingsMeta.issues.length > 0 ? (
                            <div className="space-y-2">
                              {matchingHeadingsMeta.issues.map((issue) => (
                                <div key={issue} className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
                                  {issue}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Notice
                              tone="success"
                              title="Heading map is valid"
                              description="Each heading is matched to one paragraph label inside the current passage."
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={cn("min-w-0 space-y-2 md:min-w-[180px]", isMultipleChoiceMultipleType(group.typeId) && "w-full md:max-w-[260px]")}>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Answers</p>
                          <Textarea 
                            className={cn("bg-muted/30 font-mono text-sm", isMultipleChoiceMultipleType(group.typeId) ? "min-h-[138px]" : "min-h-[250px]")}
                            value={group.answerBlock || ""}
                            onChange={(e) => updateGroup(group.id, { answerBlock: e.target.value })}
                            placeholder={isBracketCompletionType(group.typeId)
                              ? group.typeId.includes("wordbank")
                                ? "A\nC\nB\n\nor use the words directly:\nsolar gain\ninsulation\nshade"
                                : "fathers/dads\nthree weeks/21 days"
                              : isBinaryStatementType(group.typeId)
                                ? (binaryStatementsMeta?.allowedAnswers ?? []).join("\n")
                                : isMatchingInformationType(group.typeId)
                                  ? "A\nC\nB"
                                : isMultipleChoiceMultipleType(group.typeId)
                                    ? "A\nB\nD\n\nC\nE"
                                    : group.typeId.includes("mc_")
                                      ? "A\nC\nB"
                                      : "answer1|variant2\nanswer2|variant3"}
                          />
                        {group.typeId.includes("mc_single") ? (
                          <p className="text-xs leading-5 text-muted-foreground">
                            Use one answer line per question. You can enter either the option letter or the full option text.
                          </p>
                        ) : null}
                        {isMultipleChoiceMultipleType(group.typeId) ? (
                          <p className="text-xs leading-5 text-muted-foreground">
                            Use one answer block per question. Separate questions with a blank line, and put 2 or 3 option letters inside each block.
                          </p>
                        ) : null}
                        {isMatchingInformationType(group.typeId) ? (
                          <p className="text-xs leading-5 text-muted-foreground">
                            Use one paragraph label per statement. The preview will render these as paragraph dropdowns.
                          </p>
                        ) : null}
                        {group.typeId.includes("matching_headings") ? (
                          <p className="text-xs leading-5 text-muted-foreground">
                            Use one paragraph label per heading. Put `-` on a line when that heading is unused.
                          </p>
                        ) : null}
                        {group.typeId.includes("wordbank") ? (
                          <p className="text-xs leading-5 text-muted-foreground">
                            Use one answer line per blank. You can enter either the word-bank letter or the exact option text.
                          </p>
                        ) : null}
                        {isBinaryStatementType(group.typeId) ? (
                          <div className="space-y-3 rounded-md border border-border bg-card/45 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Allowed answers</p>
                              {(binaryStatementsMeta?.allowedAnswers ?? []).map((allowedAnswer) => (
                                <Badge key={allowedAnswer} tone="info">{allowedAnswer}</Badge>
                              ))}
                            </div>
                            {binaryStatementsMeta && binaryStatementsMeta.issues.length > 0 ? (
                              <div className="space-y-2">
                                {binaryStatementsMeta.issues.map((issue) => (
                                  <Notice key={issue} tone="warning" title="Answer block issue" description={issue} />
                                ))}
                              </div>
                            ) : (
                              <Notice
                                tone="success"
                                title="Answer block is valid"
                                description="Each statement has one allowed answer and generated correct answers come from this block."
                              />
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {group.typeId.includes("matching_information") && matchingInformationMeta ? (
                    <div className="rounded-md border border-border bg-card/45 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Paragraph Labels</p>
                        {matchingInformationMeta.validLabels.length > 0 ? (
                          <Badge tone="neutral">Valid: {matchingInformationMeta.validLabels.join(", ")}</Badge>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {!group.typeId.includes("matching_headings") && groupIssues.length > 0 ? (
                    <div className="space-y-2">
                      {groupIssues.map((issue) => (
                        <Notice key={`${group.id}-${issue}`} tone="warning" title="Group issue" description={issue} />
                      ))}
                    </div>
                  ) : null}
                  {!group.typeId.includes("matching_headings") && groupIssues.length === 0 && (matchingInformationMeta || completionMeta) ? (
                    <Notice
                      tone="success"
                      title="Group validator passed"
                      description="This group's generated questions, answers, and numbering look consistent."
                    />
                  ) : null}
                </div>
                </div>
              ) : null}
            </CardHeader>
            {!isGroupCollapsed ? (
            <CardContent className="space-y-4 px-4 pb-4">
              <div className="border-t border-primary/10 pt-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={isGroupValid ? "success" : "warning"}>
                      {isGroupValid ? "Ready" : `${configuredQuestions}/${group.questions.length} ready`}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  {group.questions.map((question, qIndex) => (
                    <div key={question.id} className="rounded-lg border border-border bg-background p-4 transition-all relative">
                      <div className="mb-3 flex items-center justify-between gap-3 border-b pb-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded bg-muted px-3 py-1 text-xs font-black text-foreground">
                            Q{formatQuestionRange(questionRangeAtIndex(group, qIndex))}
                          </div>
                          {isQuestionConfigured(group, question) ? (
                            <Badge tone="success">✓</Badge>
                          ) : (
                            <Badge tone="warning">Draft</Badge>
                          )}
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => removeQuestion(group.id, question.id)}>
                          Remove
                        </Button>
                      </div>

                      <div className="grid gap-5">
                        {isBracketCompletionType(group.typeId) ? (
                          <ReadOnlyField label="Generated Blank" value={`This blank comes from [] marker #${group.questionStart + qIndex}`} />
                        ) : isMatchingInformationType(group.typeId) ? (
                          <ReadOnlyField
                            label="Generated Statement"
                            value={question.prompt || "Enter statements in the question block above"}
                          />
                        ) : (
                          <EditableField label="Question Stem / Prompt">
                            <Textarea 
                              className="min-h-[60px] text-base"
                              placeholder="Enter the question text or blank stem..."
                              value={question.prompt} 
                              onChange={(e) => updateQuestion(group.id, question.id, { prompt: e.target.value })} 
                            />
                          </EditableField>
                        )}

                        {group.typeId.includes("mc_") && (
                          <EditableField label="Options">
                            <Input 
                              className="font-medium"
                              value={(question.variants ?? []).join(", ")} 
                              onChange={(e) => updateQuestion(group.id, question.id, { variants: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                              placeholder="e.g. 1992, 1995, 1998, 2001"
                            />
                          </EditableField>
                        )}

                        <div className="grid gap-5 md:grid-cols-2">
                          {isBracketCompletionType(group.typeId) ? (
                            <ReadOnlyField
                              label="Accepted Answers"
                              value={question.acceptedAnswers.join(" / ") || "Enter this in the answer block above"}
                            />
                          ) : isBinaryStatementType(group.typeId) ? (
                            <ReadOnlyField
                              label="Accepted Answer"
                              value={question.acceptedAnswers.join(" / ") || "Enter this in the answer block above"}
                            />
                          ) : isMatchingInformationType(group.typeId) ? (
                            <ReadOnlyField
                              label="Paragraph Label"
                              value={question.acceptedAnswers.join(" / ") || "Enter this in the answer block above"}
                            />
                          ) : isMultipleChoiceMultipleType(group.typeId) ? (
                            <ReadOnlyField
                              label="Accepted Answers"
                              value={question.acceptedAnswers.join(" / ") || "Enter grouped answer lines above"}
                            />
                          ) : group.typeId.includes("mc_") ? (
                            <ReadOnlyField
                              label="Accepted Answer"
                              value={question.acceptedAnswers.join(" / ") || "Enter this in the answer block above"}
                            />
                          ) : (
                          <EditableField label="Correct Answer Selection">
                            <Input
                              className="font-bold border-primary/20"
                              placeholder="Type answer(s)..."
                              value={question.acceptedAnswers.join(", ")}
                              onChange={(e) => updateQuestion(group.id, question.id, { acceptedAnswers: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                            />
                          </EditableField>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            ) : null}
          </Card>
          {sectionGroup.sectionId ? renderGroupDropZone(sectionGroup.sectionId, nextGroupId) : null}
          </div>
          );
        })}
            </div>
          </div>
        ))}
        </div>

        <div className="min-w-0 space-y-4">
          <h3 className="text-lg font-bold">Preview</h3>
          <Card className="h-fit min-w-0 sticky top-6 border-border shadow-md overflow-hidden bg-background">
            <CardContent className="space-y-8 max-h-[72vh] overflow-x-hidden overflow-y-auto p-4">
              <EditorUserPreview
                draft={draft}
                previewId="questions"
                resolveLogicalIndex={resolveLogicalIndex}
                getIeltsIntroStr={getIeltsIntroStr}
                showSectionIntro
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className="pointer-events-none hidden xl:block absolute inset-y-0 z-20"
        style={{ left: `${editorWidthPercent}%` }}
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/80" />
      </div>

      {dividerViewportLeft !== null ? (
        <button
          type="button"
          className={cn(
            "hidden xl:flex fixed top-1/2 z-30 h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border border-border bg-background font-mono text-[10px] font-black text-foreground shadow-sm transition",
            isDraggingPanelSplit ? "cursor-ew-resize bg-muted" : "cursor-ew-resize hover:bg-muted"
          )}
          style={{ left: `${dividerViewportLeft}px` }}
          onPointerDown={(event) => {
            event.preventDefault();
            setIsDraggingPanelSplit(true);
          }}
          title="Drag to resize panels"
          aria-label="Drag to resize panels"
        >
          {"<->"}
        </button>
      ) : null}
    </div>
  );
}

function EditorUserPreview({
  draft,
  previewId,
  resolveLogicalIndex,
  getIeltsIntroStr,
  compact = false,
  showSectionIntro = true,
}: {
  draft: AdminTestDraftState;
  previewId: string;
  resolveLogicalIndex: (uiIndex: number) => number;
  getIeltsIntroStr: (uiIndex: number) => string;
  compact?: boolean;
  showSectionIntro?: boolean;
}) {
  if (draft.content.sections.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm font-medium text-muted-foreground">Add a section to start simulating.</p>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full", compact ? "max-w-[760px] space-y-5" : "max-w-[900px] space-y-7")}>
      {draft.content.sections.map((section, idx) => {
        const relatedGroups = (draft.questionGroups ?? []).filter((group) => group.sectionId === section.id);

        return (
          <EditorPreviewSection
            key={`${previewId}-${section.id}`}
            previewId={previewId}
            draftType={draft.metadata.type}
            section={section}
            logicalIndex={resolveLogicalIndex(idx)}
            intro={getIeltsIntroStr(idx)}
            groups={relatedGroups}
            compact={compact}
            showSectionIntro={showSectionIntro}
          />
        );
      })}
    </div>
  );
}

function EditorPreviewSection({
  previewId,
  draftType,
  section,
  logicalIndex,
  intro,
  groups,
  compact = false,
  showSectionIntro = true,
}: {
  previewId: string;
  draftType: AdminTestDraftState["metadata"]["type"];
  section: AdminTestDraftState["content"]["sections"][number];
  logicalIndex: number;
  intro: string;
  groups: AdminTestDraftState["questionGroups"];
  compact?: boolean;
  showSectionIntro?: boolean;
}) {
  const formatPreviewGroupHeading = (group: AdminTestDraftState["questionGroups"][number]) => {
    if (isMultipleChoiceMultipleType(group.typeId)) {
      return "Multiple-answer questions";
    }
    return `Questions ${group.questionStart}-${group.questionEnd}`;
  };

  const formatPreviewQuestionHeading = (
    group: AdminTestDraftState["questionGroups"][number],
    questionNumber: string
  ) => {
    if (isMultipleChoiceMultipleType(group.typeId) && questionNumber.includes("-")) {
      return `Questions ${questionNumber}`;
    }
    if (isMatchingInformationType(group.typeId)) {
      return questionNumber;
    }
    return `Question ${questionNumber}`;
  };

  const matchingHeadingQuestions = useMemo(
    () =>
      groups
        .filter((group) => group.typeId.includes("matching_headings"))
        .flatMap((group) =>
          group.questions.map((question, index) => ({
            id: question.id,
            number: formatQuestionRange(questionRangeAtIndex(group, index)),
            label: paragraphLabelFromPrompt(question.prompt),
          }))
        ),
    [groups]
  );
  const matchingHeadingExamples = useMemo(() => {
    const exampleMap = new Map<string, string>();
    groups
      .filter((group) => group.typeId.includes("matching_headings"))
      .forEach((group) => {
        const meta = analyzeMatchingHeadingsGroup(group, [section]);
        meta.previewRows.forEach((row) => {
          if (row.isFixedExample && row.label && row.isValidLabel && !row.isDuplicate && !row.isUnused) {
            exampleMap.set(row.label, row.headingText || row.headingLine);
          }
        });
      });
    return exampleMap;
  }, [groups, section]);
  const matchingHeadingLabels = useMemo(
    () => new Set(matchingHeadingQuestions.map((question) => question.label).filter(Boolean) as string[]),
    [matchingHeadingQuestions]
  );
  const paragraphs = useMemo(
    () => parsePassageContentBlocks(section.content, Boolean(section.showLabels)),
    [section.content, section.showLabels]
  );
  const navQuestions = useMemo(
    () =>
      groups.flatMap((group) =>
        group.questions.map((question, index) => {
          const paragraphLabel = group.typeId.includes("matching_headings")
            ? paragraphLabelFromPrompt(question.prompt)
            : null;
          return {
            id: question.id,
            number: formatQuestionRange(questionRangeAtIndex(group, index)),
            targetId: paragraphLabel
              ? `${previewId}-${section.id}-paragraph-${paragraphLabel}`
              : `${previewId}-${section.id}-${question.id}`,
          };
        })
      ),
    [groups, previewId, section.id]
  );
  const [activeQuestionId, setActiveQuestionId] = useState<string>(navQuestions[0]?.id ?? "");
  const [showAnswerLocations, setShowAnswerLocations] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (navQuestions.length === 0) {
      setActiveQuestionId("");
      return;
    }
    if (!navQuestions.some((question) => question.id === activeQuestionId)) {
      setActiveQuestionId(navQuestions[0]?.id ?? "");
    }
  }, [activeQuestionId, navQuestions]);

  function scrollToPreviewQuestion(questionId: string) {
    const target = navQuestions.find((question) => question.id === questionId);
    setActiveQuestionId(questionId);
    const node = document.getElementById(target?.targetId ?? `${previewId}-${section.id}-${questionId}`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function seekPreviewAudio(second: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, second);
    void audioRef.current.play().catch(() => undefined);
  }

  function renderListeningTranscriptPreview() {
    if (draftType !== "listening") {
      return null;
    }

    const segments = section.transcriptSegments ?? [];
    const locations = section.transcriptQuestionLocations ?? [];
    const fallbackTranscript = section.transcript?.trim() || "";

    return (
      <div className={cn("space-y-4", compact ? "pt-1" : "pt-2")}>
        {section.audioUrl ? (
          <audio ref={audioRef} className="w-full" controls src={section.audioUrl} />
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Transcript Preview</p>
            <p className="text-xs text-muted-foreground">Click any transcript row to jump the audio to that timestamp.</p>
          </div>
          {locations.length > 0 ? (
            <Button
              type="button"
              variant={showAnswerLocations ? "solid" : "outline"}
              size="sm"
              onClick={() => setShowAnswerLocations((current) => !current)}
            >
              {showAnswerLocations ? "Hide Answer Locations" : "Show Answer Locations"}
            </Button>
          ) : null}
        </div>
        {segments.length > 0 ? (
          <div className={cn("rounded-2xl border border-border/75 bg-background/90", compact ? "p-3" : "p-4")}>
            <div className={cn("space-y-2 overflow-y-auto", compact ? "max-h-[320px]" : "max-h-[420px]")}>
              {segments.map((segment) => {
                const segmentLocations = locations.filter(
                  (location) =>
                    location.startSec <= segment.endSec
                    && location.endSec >= segment.startSec
                );
                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => seekPreviewAudio(segment.startSec)}
                    className="w-full rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                      <span className="pt-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                        {formatTranscriptTimestamp(segment.startSec)}
                      </span>
                      <div className="space-y-2">
                        <p className={cn("text-foreground", compact ? "text-[13px] leading-[1.45]" : "text-[14px] leading-[1.55]")}>
                          {renderBraceBoldText(segment.text, `${previewId}-${section.id}-${segment.id}`)}
                        </p>
                        {showAnswerLocations && segmentLocations.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {segmentLocations.map((location) => (
                              <span
                                key={`${segment.id}-${location.questionLabel}`}
                                className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                              >
                                {location.questionLabel}: {location.correctAnswer || location.answerText || "match"}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : fallbackTranscript ? (
          <div className="rounded-xl border border-border/70 bg-background/90 px-4 py-4">
            <p className={cn("whitespace-pre-wrap text-foreground", compact ? "text-[13px] leading-[1.45]" : "text-[14px] leading-[1.55]")}>
              {renderBraceBoldText(fallbackTranscript, `${previewId}-${section.id}-fallback-transcript`)}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-muted/10 px-4 py-5 text-sm text-muted-foreground">
            Upload audio to generate transcript preview.
          </div>
        )}
      </div>
    );
  }

  function renderCompletionPreview(group: AdminTestDraftState["questionGroups"][number]) {
    const questionBlock = group.questionBlock ?? "";
    const segments = questionBlock.split("[]");
    const isWordBankCompletion = group.typeId.includes("wordbank");

    function renderCompletionAnswer(question: AdminTestDraftQuestion, index: number, key: string) {
      const isActive = activeQuestionId === question.id;
      return isWordBankCompletion ? (
        <select
          key={`${key}-wordbank`}
          id={`${previewId}-${section.id}-${question.id}`}
          value=""
          onChange={() => undefined}
          onFocus={() => setActiveQuestionId(question.id)}
          className={cn(
            compact
              ? "mx-1 inline-flex h-8 min-w-[132px] rounded-md border bg-background px-3 text-[12px] font-semibold transition"
              : "mx-1 inline-flex h-9 min-w-[156px] rounded-md border bg-background px-3 text-sm font-semibold transition",
            isActive
              ? "border-primary text-primary shadow-sm"
              : "border-border text-muted-foreground"
          )}
        >
          <option value="">Select answer</option>
          {group.sharedOptions.map((option) => (
            <option key={`${question.id}-${option}`} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <button
          type="button"
          key={`${key}-input`}
          id={`${previewId}-${section.id}-${question.id}`}
          onClick={() => setActiveQuestionId(question.id)}
          className={cn(
            compact
              ? "mx-1 inline-flex h-8 min-w-[46px] items-center justify-center rounded-md border text-[12px] font-black transition"
              : "mx-1 inline-flex h-9 min-w-[52px] items-center justify-center rounded-md border text-sm font-black transition",
            isActive
              ? "border-primary bg-primary/12 text-primary shadow-sm"
              : "border-border bg-background text-muted-foreground"
          )}
        >
          {group.questionStart + index}
        </button>
      );
    }

    const tableLayout = parseCompletionTableLayout(questionBlock);
    if (tableLayout) {
      const questionIndexRef = { current: 0 };
      return (
        <div className="rounded-2xl border border-border/70 bg-muted/10 px-4 py-4">
          {group.title ? (
            <p className={cn("mb-4 text-center font-bold tracking-tight text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
              {renderBraceBoldText(group.title, `${group.id}-completion-title`)}
            </p>
          ) : null}
          <div className="inline-block max-w-full overflow-x-auto rounded-2xl border border-border bg-background p-1 shadow-[0_0_0_1px_hsl(var(--border)),0_8px_24px_-18px_hsl(var(--foreground)/0.28)]">
            <table className="w-auto border-collapse overflow-hidden rounded-[1rem] border border-border bg-background">
              <tbody>
                {tableLayout.map((row, rowIndex) => (
                  <tr
                    key={`${group.id}-table-row-${rowIndex}`}
                    className={row.isHeader ? "bg-muted/85" : "border-t border-border"}
                  >
                    {row.cells.map((cell, cellIndex) => {
                      const CellTag = row.isHeader ? "th" : "td";
                      const cellSegments = cell.split("[]");
                      return (
                        <CellTag
                          key={`${group.id}-table-cell-${rowIndex}-${cellIndex}`}
                          className={cn(
                            "align-middle border-l border-border px-3 py-2 text-left font-sans text-foreground first:border-l-0",
                            row.isHeader ? "text-sm font-bold" : compact ? "text-[14px] leading-[1.55]" : "text-[15px] leading-[1.7]"
                          )}
                        >
                          {cellSegments.map((segment, segmentIndex) => {
                            const question = segmentIndex < cellSegments.length - 1
                              ? group.questions[questionIndexRef.current]
                              : null;
                            const currentIndex = questionIndexRef.current;
                            if (question) {
                              questionIndexRef.current += 1;
                            }
                            return (
                              <span key={`${group.id}-table-fragment-${rowIndex}-${cellIndex}-${segmentIndex}`}>
                                {segment ? renderBraceBoldText(segment, `${group.id}-table-text-${rowIndex}-${cellIndex}-${segmentIndex}`) : null}
                                {question ? renderCompletionAnswer(question, currentIndex, `${group.id}-table-answer-${question.id}`) : null}
                              </span>
                            );
                          })}
                        </CellTag>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-border/70 bg-muted/10 px-4 py-4">
        {group.title ? (
          <p className={cn("mb-4 text-center font-bold tracking-tight text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
            {renderBraceBoldText(group.title, `${group.id}-completion-title`)}
          </p>
        ) : null}
        <div className={cn("whitespace-pre-wrap font-sans text-foreground", compact ? "text-[14px] leading-[1.55]" : "text-[15px] leading-[1.7]")}>
          {segments.map((segment, index) => {
            const question = group.questions[index];
            return (
              <span key={`${group.id}-completion-${index}`}>
                {renderBraceBoldText(segment, `${group.id}-completion-segment-${index}`)}
                {question ? renderCompletionAnswer(question, index, `${group.id}-inline-answer-${question.id}`) : null}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  function renderDiagramPreview(group: AdminTestDraftState["questionGroups"][number]) {
    if (!isDiagramLabelingType(group.typeId) || !group.diagramImageUrl) {
      return null;
    }

    return (
      <div className={cn("border border-border/70 bg-muted/20", compact ? "rounded-[1rem] p-3" : "rounded-2xl p-4")}>
        <div className="overflow-hidden rounded-xl border border-border bg-background/80 p-2">
          <img
            src={group.diagramImageUrl}
            alt={group.title}
            className={cn("w-full object-contain", compact ? "max-h-[220px]" : "max-h-[320px]")}
          />
        </div>
      </div>
    );
  }

  return (
      <div className={cn("overflow-hidden border border-border/70 bg-background/55 shadow-sm", compact ? "space-y-4 rounded-[1.2rem] p-4" : "space-y-6 rounded-[1.5rem] p-5")}>
      <div className={cn(compact ? "space-y-1.5" : "space-y-2")}>
        <p className={cn("font-bold text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
          {draftType === "reading" ? `Reading Passage ${logicalIndex + 1}` : `Listening Section ${logicalIndex + 1}`}
        </p>
        {showSectionIntro ? (
          <p className={cn("border-l-2 border-primary/40 pl-3 py-0.5 font-medium italic text-muted-foreground", compact ? "text-[12px] leading-[1.45]" : "text-[13px] leading-[1.55]")}>
            {renderBraceBoldText(intro, `${previewId}-${section.id}-intro`)}
          </p>
        ) : null}
        {shouldRenderSectionTitle(draftType, section.title) ? (
          <p className={cn("text-center font-black tracking-tight text-foreground", compact ? "pt-1 text-[19px]" : "pt-1.5 text-[22px]")}>
            {renderBraceBoldText(section.title, `${previewId}-${section.id}-title`)}
          </p>
        ) : null}
      </div>

      <div className={cn(compact ? "space-y-4" : "space-y-5")}>
        {draftType === "listening" ? renderListeningTranscriptPreview() : null}
        {draftType !== "listening" && paragraphs.length > 0 ? (
          paragraphs.map((paragraph, paragraphIndex) => {
            const paragraphId = paragraph.label || `block-${paragraphIndex}`;

            return (
              <div
                key={`${section.id}-${paragraphIndex}`}
                id={`${previewId}-${section.id}-paragraph-${paragraphId}`}
                className="space-y-2"
              >
                {paragraph.label ? (
                  <div className={cn("flex items-center justify-center rounded border bg-muted font-bold text-primary", compact ? "h-5 w-5 text-[11px]" : "h-6 w-6 text-[12px]")}>
                    {paragraph.label}
                  </div>
                ) : null}
                {paragraph.label && matchingHeadingLabels.has(paragraph.label) ? (
                  <div className={cn("flex items-center rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3.5 font-semibold text-muted-foreground", compact ? "min-h-[32px] text-[11px]" : "min-h-[38px] text-[13px]")}>
                    Drop heading here
                  </div>
                ) : null}
                {paragraph.label && matchingHeadingExamples.has(paragraph.label) ? (
                  <div className={cn("flex items-center rounded-xl border border-success/30 bg-success/5 px-3.5 font-semibold text-foreground", compact ? "min-h-[32px] text-[11px]" : "min-h-[38px] text-[13px]")}>
                    {matchingHeadingExamples.get(paragraph.label)}
                  </div>
                ) : null}
                <p
                  className={cn(
                    "whitespace-pre-wrap font-sans text-foreground",
                    compact ? "text-[13px] leading-[1.4]" : "text-[14px] leading-[1.45]",
                    paragraph.center && "text-center",
                    paragraph.italic && "italic",
                    paragraph.bold && "font-bold"
                  )}
                >
                  {renderBraceBoldText(paragraph.text, `${previewId}-${section.id}-paragraph-${paragraphIndex}`)}
                </p>
              </div>
            );
          })
        ) : null}
      </div>

      {groups.length > 0 ? (
        <div className={cn("border-t border-border/70", compact ? "space-y-4 pt-5" : "space-y-5 pt-7")}>
          {groups.map((group) => (
            <div key={group.id} className={cn("border border-border/80 bg-card shadow-sm", compact ? "rounded-[1.1rem]" : "rounded-[1.4rem]")}>
              <div className={cn("border-b border-border/70", compact ? "px-3.5 py-2.5" : "px-4 py-3.5")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className={cn("font-black uppercase tracking-[0.24em] text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>
                      {previewTypeLabel(group.typeId)}
                    </p>
                    <h3 className={cn("mt-1 font-black tracking-tight text-foreground", compact ? "text-[14px]" : "text-[15px]")}>
                      {formatPreviewGroupHeading(group)}
                    </h3>
                  </div>
                  <Badge tone="neutral">{totalQuestionSlots(group)} questions</Badge>
                </div>
                <div className={cn("mt-2.5 whitespace-pre-wrap font-medium text-muted-foreground", compact ? "text-[12px] leading-[1.35]" : "text-[13px] leading-[1.45]")}>
                  {renderInstructionPreviewText(group.instructions, `${group.id}-instructions`)}
                </div>
              </div>

              <div className={cn("space-y-3.5", compact ? "px-3 py-3 lg:px-3.5" : "px-3.5 py-3.5 lg:px-4")}>
                {renderDiagramPreview(group)}
                {((group.typeId.includes("matching") && !group.typeId.includes("matching_information")) || group.typeId.includes("wordbank")) && group.sharedOptions.length > 0 ? (
                  <div className={cn("border border-border/70 bg-muted/20", compact ? "rounded-[1rem] px-3 py-2.5" : "rounded-2xl px-4 py-3")}>
                    {group.typeId.includes("matching_headings") ? (
                      <p className={cn("mb-3 font-bold tracking-tight text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
                        List of Headings
                      </p>
                    ) : group.typeId.includes("matching_sentence_endings") ? (
                      <p className={cn("mb-3 font-bold tracking-tight text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
                        Sentence Endings
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                    {group.sharedOptions
                      .filter((option) => !(group.typeId.includes("matching_headings") && isFixedMatchingHeadingExample(option)))
                      .map((option, index) => {
                      const optionPreview = getMatchingOptionPreview(option, index, group.typeId);
                      return (
                      <span
                        key={option}
                        className={cn("rounded-full border border-border bg-card font-semibold text-foreground", compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs")}
                      >
                        {renderBraceBoldText(optionPreview.label, `${group.id}-option-${optionPreview.value}`)}
                      </span>
                      );
                    })}
                    </div>
                  </div>
                ) : null}

                {isBracketCompletionType(group.typeId) ? renderCompletionPreview(group) : null}

                {!group.typeId.includes("matching_headings") && !isBracketCompletionType(group.typeId) ? group.questions.map((question, questionIndex) => {
                  const questionNumber = formatQuestionRange(questionRangeAtIndex(group, questionIndex));
                  const active = activeQuestionId === question.id;
                  const hasRangeQuestionHeading = isMultipleChoiceMultipleType(group.typeId) && questionNumber.includes("-");

                  return (
                    <div
                      key={question.id}
                      id={`${previewId}-${section.id}-${question.id}`}
                      onClick={() => setActiveQuestionId(question.id)}
                      className={cn(
                            "rounded-[1.1rem] border border-border/75 bg-muted/20 p-3.5 transition",
                            compact && "rounded-[0.95rem] p-3",
                            active && "border-primary/40 bg-primary/5 shadow-[0_0_0_1px_rgba(255,138,25,0.16)]"
                          )}
                    >
                      <div className={cn(hasRangeQuestionHeading ? "space-y-2" : "flex items-start gap-2.5", compact ? "mb-2" : "mb-2.5")}>
                        <div className={cn("inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-2 font-black leading-none text-primary-foreground whitespace-nowrap", compact ? "h-6 min-w-[34px] text-[9px]" : "h-7 min-w-[40px] text-[10px]")}>
                          {formatPreviewQuestionHeading(group, questionNumber)}
                        </div>
                        <div className={cn("flex-1", compact ? "space-y-2" : "space-y-3")}>
                          {question.prompt ? (
                            <p className={cn("font-sans text-foreground", compact ? "text-[12px] leading-[1.32]" : "text-[13px] leading-[1.4]")}>
                              {renderBraceBoldText(question.prompt, `${group.id}-${question.id}-prompt`)}
                            </p>
                          ) : null}
                          {renderAdminPreviewAnswer(group, question)}
                        </div>
                      </div>
                    </div>
                  );
                }) : null}
              </div>
            </div>
          ))}

          {navQuestions.length > 0 ? (
            <div className={cn("sticky bottom-0 z-10 border-t border-border/80 bg-background/95 backdrop-blur-xl", compact ? "h-[40px]" : "h-[46px]")}>
              <div className="flex h-full items-center justify-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>
                  <div className={cn("flex shrink-0 items-center", compact ? "gap-1 pr-0.5" : "gap-1.5 pr-1")}>
                    <span className={cn("font-semibold tracking-tight text-foreground", compact ? "text-[11px]" : "text-[13px]")}>
                      {draftType === "reading" ? `Passage ${logicalIndex + 1}` : `Part ${logicalIndex + 1}`}
                    </span>
                    <span className={cn("font-medium text-muted-foreground", compact ? "text-[10px]" : "text-[12px]")}>
                      {groups.reduce((count, group) => count + totalQuestionSlots(group), 0)} questions
                    </span>
                  </div>

                  <div className="flex min-w-max items-center gap-0.5">
                    {navQuestions.map((question) => {
                      const active = activeQuestionId === question.id;

                      return (
                        <button
                          key={`${section.id}-${question.id}`}
                          type="button"
                          onClick={() => scrollToPreviewQuestion(question.id)}
                          className={cn(
                            compact
                              ? "flex h-6 min-w-[32px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-0.5 transition"
                              : "flex h-7 min-w-[38px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-0.5 transition",
                            active
                              ? "border-primary/45 bg-card text-primary shadow-sm"
                              : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/35"
                          )}
                        >
                          <span
                            className={cn(
                              compact ? "h-1 w-3 rounded-full transition" : "h-1 w-3.5 rounded-full transition",
                              active ? "bg-primary" : "bg-border"
                            )}
                          />
                          <span className={cn("font-semibold leading-none whitespace-nowrap", compact ? "text-[8px]" : "text-[9px]")}>{question.number}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function previewTypeLabel(typeId: string) {
  if (typeId.includes("true_false")) return "True / False / Not Given";
  if (typeId.includes("yes_no")) return "Yes / No / Not Given";
  if (typeId.includes("mc_")) return "Multiple Choice";
  if (typeId.includes("matching")) return "Matching";
  if (typeId.includes("summary") || typeId.includes("sentence_completion") || typeId.includes("note_completion")) return "Completion";
  if (isListeningMapOptionType(typeId)) return "Map Labeling";
  if (isListeningMapFreeTextType(typeId)) return "Map Labeling (free text)";
  if (typeId.includes("diagram")) return "Diagram Labeling";
  if (typeId.includes("short_answer")) return "Short Answer";
  return "Question Group";
}

function renderAdminPreviewAnswer(
  group: AdminTestDraftState["questionGroups"][number],
  question: AdminTestDraftState["questionGroups"][number]["questions"][number]
) {
  if (group.typeId.includes("true_false")) {
    return (
      <div className="flex flex-wrap gap-2">
        {["TRUE", "FALSE", "NOT GIVEN"].map((option) => (
          <span
            key={option}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground"
          >
            {option}
          </span>
        ))}
      </div>
    );
  }

  if (group.typeId.includes("yes_no")) {
    return (
      <div className="flex flex-wrap gap-2">
        {["YES", "NO", "NOT GIVEN"].map((option) => (
          <span
            key={option}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground"
          >
            {option}
          </span>
        ))}
      </div>
    );
  }

  if (group.typeId.includes("mc_multiple")) {
    return (
      <div className="space-y-2">
        {(question.variants ?? []).map((option, index) => {
          const optionLetter = String.fromCharCode(65 + index);
          return (
            <div key={`${question.id}-${optionLetter}`} className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 rounded border-2 border-border bg-background" />
              <span className="font-sans text-[14px] leading-[1.45] text-foreground">
                <span className="mr-2 font-black">{optionLetter}.</span>
                {option}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (group.typeId.includes("mc_")) {
    return (
      <div className="space-y-2">
        {(question.variants ?? []).map((option, index) => {
          const optionLetter = String.fromCharCode(65 + index);
          return (
            <div key={`${question.id}-${optionLetter}`} className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black text-foreground">
                {optionLetter}
              </span>
              <span className="font-sans text-[15px] leading-[1.5] text-foreground">{option}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (group.typeId.includes("matching_information")) {
    return (
      <div className="max-w-[180px]">
        <select
          value=""
          onChange={() => undefined}
          className="flex h-10 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground"
        >
          <option value="">Select paragraph</option>
          {group.sharedOptions.map((option) => {
            const value = extractMatchingOptionValue(option);
            return (
              <option key={`${question.id}-${value}`} value={value}>
                {value}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (group.typeId.includes("matching_features") || group.typeId.includes("matching_sentence_endings")) {
    return (
      <div className="max-w-[260px]">
        <select
          value=""
          onChange={() => undefined}
          className="flex h-10 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground"
        >
          <option value="">Select answer</option>
          {group.sharedOptions.map((option, index) => {
            const optionPreview = getMatchingOptionPreview(option, index, group.typeId);
            return (
              <option key={`${question.id}-${optionPreview.value}`} value={optionPreview.value}>
                {optionPreview.label}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (isListeningMapLabelingType(group.typeId)) {
    if (group.sharedOptions.length > 0) {
      return (
        <div className="max-w-[220px]">
          <select
            value=""
            onChange={() => undefined}
            className="flex h-10 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground"
          >
            <option value="">Select map label</option>
            {group.sharedOptions.map((option) => {
              const value = extractMatchingOptionValue(option) || option.trim();
              return (
                <option key={`${question.id}-${value}`} value={value}>
                  {value}
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    return (
      <div className="max-w-xs rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground">
        Type map label
      </div>
    );
  }

  return (
    <div className="max-w-xs rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground">
      Answer input
    </div>
  );
}

function ReviewPanel({ draft }: { draft: AdminTestDraftState }) {
  const validations = useMemo(() => {
    const checks: { label: string; status: "success" | "warning" | "error"; detail: string }[] = [];
    
    // Metadata checks
    if (!draft.metadata.title) checks.push({ label: "Title", status: "error", detail: "Test title is required." });
    
    // Content checks
    if (draft.content.sections.length === 0) {
      checks.push({ label: "Sections", status: "error", detail: "At least one passage/section is required." });
    } else {
      draft.content.sections.forEach((s, i) => {
        if (!s.content || s.content.length < 50) {
          checks.push({ label: `Section ${i+1} Content`, status: "warning", detail: "Content seems too short or empty." });
        }
      });
    }

    // Question Group checks
    const groups = draft.questionGroups ?? [];
    if (groups.length === 0) {
      checks.push({ label: "Questions", status: "error", detail: "No question groups created." });
    } else {
      let totalQ = 0;
      groups.forEach((g) => {
        totalQ += totalQuestionSlots(g);
        if (g.questions.length === 0) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: "This group has no questions." });
        }
        if (g.questionEnd < g.questionStart) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: "Question range is invalid (End < Start)." });
        }
        for (const issue of collectGroupIssues(g, draft.content.sections)) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: issue });
        }
      });
      
      if (draft.metadata.type === "reading" && totalQ < 40) {
        checks.push({ label: "Question Count", status: "warning", detail: `Full reading usually has 40 questions (currently ${totalQ}).` });
      }
    }

    return checks;
  }, [draft]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Automated Validation</CardTitle>
            <CardDescription>System checks for structure, numbering, and completeness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {validations.map((v, i) => (
              <div key={i} className={cn(
                "rounded-md border px-4 py-3 flex items-center justify-between gap-3",
                v.status === "error" ? "border-danger/30 bg-danger/5" : v.status === "warning" ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"
              )}>
                <div>
                  <p className="font-medium text-sm">{v.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.detail}</p>
                </div>
                <Badge tone={v.status === "error" ? "danger" : v.status === "warning" ? "warning" : "success"}>
                  {v.status.toUpperCase()}
                </Badge>
              </div>
            ))}
            {validations.length === 0 && (
              <p className="text-sm text-center py-4 text-muted-foreground">No issues found. Ready to publish!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
            <CardDescription>Review state is derived from the draft.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.review.checklist.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-card/45 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Publisher notes</CardTitle>
          <CardDescription>Critical reminders before publish.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <div className="bg-muted p-4 rounded-lg border border-border space-y-2">
            <p className="font-semibold text-foreground">Summary Statistics</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p>Type: <span className="text-foreground uppercase">{draft.metadata.type}</span></p>
              <p>Access: <span className="text-foreground uppercase">{draft.metadata.accessType}</span></p>
              <p>Sections: <span className="text-foreground">{draft.content.sections.length}</span></p>
              <p>Groups: <span className="text-foreground">{draft.questionGroups?.length ?? 0}</span></p>
              <p>Total Questions: <span className="text-foreground">{(draft.questionGroups ?? []).reduce((acc, g) => acc + totalQuestionSlots(g), 0)}</span></p>
            </div>
          </div>
          <div className="space-y-3">
            {draft.review.notes.map((note) => (
              <p key={note}>• {note}</p>
            ))}
            <p>• <code>{"{{N}}"}</code> markers stay canonical for every completion renderer.</p>
            <p>• Explanations remain premium-only at runtime, even for public tests.</p>
            <p>• Published edits create a new version and preserve attempt snapshots.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-card/45 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}


function EditableField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-card/45 px-4 py-3">
      <p className="break-words text-xs uppercase leading-snug tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}


function stepLabel(step: WizardStepId): string {
  if (step === "metadata") return "Metadata";
  if (step === "content") return "Content";
  if (step === "questions") return "Questions";
  return "Review";
}


function stepDescription(step: WizardStepId, draft: AdminTestDraftState): string {
  if (step === "metadata") return `${draft.metadata.type} · ${draft.metadata.timeLimitLabel}`;
  if (step === "content") return `${draft.content.sections.length} content sections`;
  if (step === "questions") return `${draft.questions.length} draft questions`;
  return `${draft.review.checklist.length} review checks`;
}


function statusTone(status: AdminDraftChecklistStatus): "success" | "warning" | "danger" | "neutral" {
  if (status === "ready") return "success";
  if (status === "blocked") return "danger";
  return "warning";
}
