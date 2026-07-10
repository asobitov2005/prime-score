"use client";

import { AdminTestDraftContentSection } from "./dependencies";

import { clipboardImageFileName, extractMatchingOptionValue, normalizeMatchingPrefix, stripMatchingOptionPrefix } from "./shared-part-01";



export function extractClipboardImageFile(items: DataTransferItemList | null | undefined) {
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

export function alphabetLabelFromIndex(index: number) {
  let current = index;
  let label = "";

  do {
    label = String.fromCharCode(65 + (current % 26)) + label;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);

  return label;
}

export function alphabetLabelToIndex(label: string) {
  let value = 0;

  for (const char of label.toUpperCase()) {
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) {
      return -1;
    }
    value = value * 26 + (code - 64);
  }

  return value - 1;
}

export function romanNumeralFromIndex(index: number) {
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
  return normalizeMatchingPrefix(result);
}

export function shouldAutoLetterMatchingOptions(typeId: string) {
  return typeId.includes("matching_features") || typeId.includes("listening_matching");
}

export function getMatchingOptionPreview(option: string, index: number, typeId: string) {
  const fixedExampleMatch = option.trim().match(/^([A-Z]+)\s*->\s*(.+)$/i);
  const optionBody = fixedExampleMatch ? fixedExampleMatch[2].trim() : option.trim();
  const explicitValue = extractMatchingOptionValue(optionBody);
  const explicitText = stripMatchingOptionPrefix(optionBody);

  if (explicitValue !== optionBody.trim()) {
    const normalizedValue = normalizeMatchingPrefix(explicitValue);
    return {
      value: normalizedValue,
      label: explicitText ? `${normalizedValue}. ${explicitText}` : normalizedValue,
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

export type PassageContentBlock = {
  text: string;
  label: string;
  isLabelled: boolean;
  isStyled: boolean;
  italic: boolean;
  center: boolean;
  bold: boolean;
};

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
    text: isStyled ? body : rawText.trim(),
    isStyled,
    italic,
    center,
    bold: isStyled && hasOuterBraces,
  };
}

export function parsePassageContentBlocks(content: string, showLabels: boolean): PassageContentBlock[] {
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

export function paragraphLabelsForSection(section?: AdminTestDraftContentSection) {
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

export function paragraphLabelFromPrompt(prompt: string) {
  const match = prompt.trim().match(/paragraph\s+([a-z])/i);
  return match ? match[1].toUpperCase() : null;
}

export type MatchingHeadingPreviewRow = {
  label: string;
  headingLine: string;
  headingText: string;
  answerValue: string;
  isDuplicate: boolean;
  isValidLabel: boolean;
  isUnused: boolean;
  isFixedExample: boolean;
};

export function normalizeMatchingHeadingAnswerLine(line: string) {
  const trimmed = line.trim().toUpperCase();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "—" || trimmed === "_") {
    return "-";
  }
  return trimmed;
}

export type MatchingHeadingEntry = {
  fixedParagraphLabel: string | null;
  headingText: string;
  answerValue: string;
  displayLabel: string;
  rawLine: string;
};

export function parseMatchingHeadingEntry(line: string, index: number) {
  const fixedExampleMatch = line.trim().match(/^([A-Z]+)\s*->\s*(.+)$/i);
  const fixedParagraphLabel = fixedExampleMatch ? fixedExampleMatch[1].toUpperCase() : null;
  const headingBody = fixedExampleMatch ? fixedExampleMatch[2].trim() : line.trim();
  const explicitValue = extractMatchingOptionValue(headingBody);
  const explicitText = stripMatchingOptionPrefix(headingBody) || headingBody;
  const hasExplicitValue = explicitValue !== headingBody;
  const answerValue = hasExplicitValue ? normalizeMatchingPrefix(explicitValue) : romanNumeralFromIndex(index);
  const headingText = hasExplicitValue ? explicitText : headingBody;

  return {
    fixedParagraphLabel,
    headingText,
    answerValue,
    displayLabel: `${answerValue}. ${headingText}`.trim(),
    rawLine: line,
  } satisfies MatchingHeadingEntry;
}

export function isFixedMatchingHeadingExample(line: string) {
  return /^[A-Z]+\s*->\s*.+$/i.test(line.trim());
}
