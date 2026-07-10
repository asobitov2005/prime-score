export const dynamic = "force-dynamic";

export const fetchCache = "force-no-store";

export const revalidate = 0;

export interface ReadingExamPreviewPageProps {
  searchParams?: {
    mode?: string;
    attemptId?: string;
    testId?: string;
    sectionId?: string;
    questionId?: string;
    questionType?: string;
    start?: string;
    scope?: string;
    forceNew?: string;
  };
}

export function buildSubtitle(questionStart: number | null, questionEnd: number | null, isFullTest: boolean) {
  if (questionStart === null || questionEnd === null) {
    return "Read the passage and answer the questions in the panel on the right.";
  }

  if (isFullTest) {
    return `Read the passages and answer questions ${questionStart}-${questionEnd} in the panel on the right.`;
  }

  return `Read the passage and answer questions ${questionStart}-${questionEnd} in the panel on the right.`;
}

export type RawParagraph = string | { id?: string; text?: string; label?: string };

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

  return {
    isStyled: italic || center,
  };
}

export function extractParagraphText(paragraph: RawParagraph) {
  if (typeof paragraph !== "string") {
    return paragraph.text ?? "";
  }

  const trimmed = paragraph.trim();
  if (!trimmed.startsWith("{") || !trimmed.includes("text")) {
    return paragraph;
  }

  const textMarker = trimmed.match(/['"]text['"]\s*:\s*/);
  if (!textMarker) {
    return paragraph;
  }

  const textStart = textMarker.index! + textMarker[0].length;
  const quote = trimmed[textStart];
  const labelMarker = trimmed.lastIndexOf(", 'label':");
  const doubleLabelMarker = trimmed.lastIndexOf(', "label":');
  const endMarker = Math.max(labelMarker, doubleLabelMarker);

  if ((quote !== "'" && quote !== '"') || endMarker <= textStart) {
    return paragraph;
  }

  return trimmed.slice(textStart + 1, endMarker - 1);
}

export function extractExplicitParagraphLabel(paragraph: RawParagraph) {
  if (typeof paragraph !== "string") {
    return Object.prototype.hasOwnProperty.call(paragraph, "label") ? paragraph.label ?? "" : null;
  }

  const match = paragraph.match(/['"]label['"]\s*:\s*['"]([^'"]*)['"]/);
  return match ? match[1] ?? "" : null;
}

export function buildReadingSectionIntro(sectionNumber: number, questionStart: number | null, questionEnd: number | null) {
  if (questionStart === null || questionEnd === null) {
    return null;
  }
  return `You should spend about 20 minutes on Questions ${questionStart}-${questionEnd}, which are based on Reading Passage ${sectionNumber} below.`;
}

export function resolveReadingSectionNumber(snapshotFormat: string | null | undefined, fallbackNumber: number, sectionIndex: number, totalSections: number) {
  if (totalSections > 1) {
    return fallbackNumber || sectionIndex + 1;
  }

  const formatMatch = String(snapshotFormat ?? "").match(/^passage_(\d+)$/i);
  if (formatMatch) {
    return Number(formatMatch[1]);
  }

  return fallbackNumber || 1;
}

export function readingSectionQuestionOffset(sectionNumber: number) {
  if (sectionNumber <= 1) return 0;
  if (sectionNumber === 2) return 13;
  if (sectionNumber === 3) return 26;
  return 0;
}

export function resolveEffectiveReadingQuestionOffset(sectionNumber: number, sectionQuestionStart: number | null) {
  const baseOffset = readingSectionQuestionOffset(sectionNumber);
  if (baseOffset === 0) {
    return 0;
  }
  if ((sectionQuestionStart ?? 0) > 1) {
    return 0;
  }
  return baseOffset;
}

export function offsetQuestionLabel(label: string | null | undefined, offset: number) {
  if (!label || offset === 0) {
    return label ?? undefined;
  }
  return label.replace(/\d+/g, (value) => String(Number(value) + offset));
}

export function offsetQuestionReferences(text: string | null | undefined, offset: number) {
  if (!text || offset === 0) {
    return text ?? undefined;
  }
  return text.replace(/\bQuestions?\s+(\d+)(?:-(\d+))?/g, (_, start, end) => {
    if (end) {
      return `Questions ${Number(start) + offset}-${Number(end) + offset}`;
    }
    return `Question ${Number(start) + offset}`;
  });
}
