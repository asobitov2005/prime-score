"use client";

import { getMatchingOptionViewModel, groupUsesOptionBank, readBrowserSessionCookies } from "./dependencies";

import { PreviewGroup, PreviewQuestion } from "./shared-part-01";



export function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatMinutesLeft(totalSeconds: number) {
  const minutesLeft = Math.max(1, Math.ceil(totalSeconds / 60));
  return `${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`;
}

export function getDocumentTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem("prime-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function buildAttemptRequestHeaders(accessToken: string | null | undefined) {
  const fallbackToken = readBrowserSessionCookies().accessToken;
  const resolvedToken = accessToken ?? fallbackToken;

  return {
    "Content-Type": "application/json",
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
  };
}

export function inlineAnswerWidth(value: string | undefined, placeholder: string) {
  const contentLength = Math.max((value ?? "").length, placeholder.length, 8);
  return Math.min(260, Math.max(132, contentLength * 9 + 32));
}

export function clampSplitRatio(value: number) {
  return Number(Math.min(58, Math.max(42, value)).toFixed(1));
}

export function clampFontScale(value: number) {
  return Number(Math.min(1.2, Math.max(0.9, value)).toFixed(2));
}

export function typeLabel(type: PreviewGroup["type"]) {
  const explicit: Record<string, string> = {
    tfng: "True / False / Not Given",
    mcq: "Multiple Choice",
    gap: "Gap Filling",
    reading_mc_single: "Multiple Choice",
    reading_mc_multiple: "Multiple Choice",
    reading_true_false_not_given: "True / False / Not Given",
    reading_yes_no_not_given: "Yes / No / Not Given",
    reading_matching_information: "Matching Information",
    reading_matching_headings: "Matching Headings",
    reading_matching_features: "Matching Features",
    reading_matching_sentence_endings: "Matching Sentence Endings",
    reading_sentence_completion: "Sentence Completion",
    reading_summary_completion_wordbank: "Summary Completion",
    reading_summary_completion_freetext: "Summary Completion",
    reading_note_completion: "Note Completion",
    reading_table_completion: "Table Completion",
    reading_flowchart_completion: "Flow-Chart Completion",
    reading_diagram_labeling: "Diagram / Map Labeling",
    reading_short_answer: "Short Answer",
  };

  return explicit[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isMcq(type: PreviewQuestion["type"]) {
  return type === "mcq" || type.includes("mc_single");
}

export function isMcqMultiple(type: PreviewQuestion["type"]) {
  return type.includes("mc_multiple");
}

export function isTfng(type: PreviewQuestion["type"]) {
  return type === "tfng" || type.includes("true_false");
}

export function isYnng(type: PreviewQuestion["type"]) {
  return type.includes("yes_no");
}

export function isMatching(type: PreviewQuestion["type"]) {
  return type.includes("matching");
}

export function isCompletion(type: PreviewQuestion["type"]) {
  return type === "gap" || type.includes("completion") || type.includes("short_answer") || type.includes("labeling");
}

export function isWordBankCompletion(type: PreviewQuestion["type"]) {
  return type.includes("summary_completion_wordbank");
}

export function isFreeTextSummaryCompletion(type: PreviewQuestion["type"]) {
  return type.includes("summary_completion_freetext");
}

export function isPlanMapLabeling(type: PreviewQuestion["type"]) {
  return type.includes("plan_map_labeling");
}

export function paragraphLabelFromPrompt(prompt: string) {
  const match = prompt.trim().match(/paragraph\s+([a-z])/i);
  return match ? match[1].toUpperCase() : null;
}

export function usesBracketCompletionLayout(type: PreviewGroup["type"]) {
  return (
    type.includes("form_completion")
    || type.includes("sentence_completion")
    || type.includes("note_completion")
    || type.includes("table_completion")
    || type.includes("flowchart_completion")
    || type.includes("summary_completion")
    || type.includes("short_answer")
  );
}

export function splitOptionLines(block?: string) {
  return (block ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeInlineBlankPlaceholders(text: string) {
  return text.replace(/_{3,}/g, "........................");
}

export function hasFlowChartSeparators(text: string) {
  return /\r?\n\s*\\+\s*\r?\n/.test(text);
}

export function optionValue(option: unknown) {
  const safeOption = typeof option === "string" ? option : "";
  if (!safeOption) {
    return "";
  }
  const match = safeOption.match(/^([A-Za-z0-9ivxIVX]+)[.)]\s*(.*)$/);
  return match ? match[1] : safeOption;
}

export function optionText(option: unknown) {
  const safeOption = typeof option === "string" ? option : "";
  if (!safeOption) {
    return "";
  }
  const match = safeOption.match(/^([A-Za-z0-9ivxIVX]+)[.)]\s*(.*)$/);
  return match ? match[2] : safeOption;
}

export function normalizeOptionList(options: Array<string | null | undefined>) {
  return options
    .map((option) => (typeof option === "string" ? option.trim() : ""))
    .filter(Boolean);
}

export function typedOptionLines(group: PreviewGroup) {
  if (!groupUsesOptionBank(group.type)) {
    return [];
  }
  return group.secondaryBlock?.trim()
    ? splitOptionLines(group.secondaryBlock)
    : normalizeOptionList(group.sharedOptions ?? []);
}

export function sharedOrQuestionOptions(group: PreviewGroup, question: PreviewQuestion) {
  // sharedOptions arrives as an array (never undefined), so `??` would never fall
  // through to question.options. Pick whichever list actually has entries.
  const shared = normalizeOptionList(group.sharedOptions ?? []);
  return shared.length > 0 ? shared : normalizeOptionList(question.options ?? []);
}

export function typedQuestionOptionLines(group: PreviewGroup, question: PreviewQuestion, matchingInformationOptions: string[]) {
  if (question.type.includes("matching_information")) {
    return matchingInformationOptions.length > 0
      ? matchingInformationOptions
      : sharedOrQuestionOptions(group, question);
  }

  if (question.type.includes("plan_map_labeling")) {
    return sharedOrQuestionOptions(group, question);
  }

  if (!groupUsesOptionBank(question.type)) {
    return normalizeOptionList(question.options ?? []);
  }

  return group.secondaryBlock?.trim()
    ? splitOptionLines(group.secondaryBlock)
    : sharedOrQuestionOptions(group, question);
}

export function typedOptionView(option: string, index: number, type: PreviewGroup["type"] | PreviewQuestion["type"]) {
  return getMatchingOptionViewModel(option, index, type);
}

export function normalizeHeadingComparableValue(value: string | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

export function parsePassageBlockStyle(rawText: string) {
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
    text: isStyled ? body : rawText,
    isStyled,
    italic,
    center,
    bold: isStyled && hasOuterBraces,
  };
}
