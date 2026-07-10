export const dynamic = "force-dynamic";

export const fetchCache = "force-no-store";

export const revalidate = 0;

export interface ListeningExamPreviewPageProps {
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

export type RawParagraph = string | { id?: string; text?: string; label?: string };

export function normalizeTranscriptSegments(
  segments:
    | Array<{
        id?: string;
        start_sec?: number;
        end_sec?: number;
        text?: string;
        speaker?: string | null;
      }>
    | null
    | undefined
) {
  return (segments ?? [])
    .filter((segment) => typeof segment?.text === "string" && segment.text.trim().length > 0)
    .map((segment, index) => ({
      id: String(segment.id ?? `segment-${index + 1}`),
      startSec: Math.max(0, Number(segment.start_sec ?? 0)),
      endSec: Math.max(0, Number(segment.end_sec ?? segment.start_sec ?? 0)),
      text: String(segment.text ?? "").trim(),
      speaker: segment.speaker ? String(segment.speaker).trim() : undefined,
    }));
}

export function normalizeTranscriptQuestionLocations(
  locations:
    | Array<{
        question_id?: string | null;
        question_label?: string;
        question_prompt?: string;
        start_sec?: number;
        end_sec?: number;
        answer_text?: string;
        correct_answer?: string;
      }>
    | null
    | undefined
) {
  return (locations ?? [])
    .filter((location) => typeof location?.question_label === "string" && location.question_label.trim().length > 0)
    .map((location) => ({
      questionId: location.question_id ?? undefined,
      questionLabel: String(location.question_label ?? "").trim(),
      questionPrompt: String(location.question_prompt ?? "").trim(),
      startSec: Math.max(0, Number(location.start_sec ?? 0)),
      endSec: Math.max(0, Number(location.end_sec ?? location.start_sec ?? 0)),
      answerText: String(location.answer_text ?? "").trim(),
      correctAnswer: String(location.correct_answer ?? "").trim(),
    }));
}

export function listeningSectionQuestionOffset(partNumber: number) {
  if (partNumber <= 1) return 0;
  if (partNumber === 2) return 10;
  if (partNumber === 3) return 20;
  if (partNumber === 4) return 30;
  return 0;
}

export function resolveEffectiveListeningQuestionOffset(partNumber: number, sectionQuestionStart: number | null) {
  const baseOffset = listeningSectionQuestionOffset(partNumber);
  if (baseOffset === 0) {
    return 0;
  }
  if ((sectionQuestionStart ?? 0) > 1) {
    return 0;
  }
  return baseOffset;
}

export function resolveListeningSectionNumber(snapshotFormat: string | null | undefined, fallbackNumber: number, sectionIndex: number, totalSections: number) {
  if (totalSections > 1) {
    return fallbackNumber || sectionIndex + 1;
  }

  const formatMatch = String(snapshotFormat ?? "").match(/^part_(\d+)$/i);
  if (formatMatch) {
    return Number(formatMatch[1]);
  }

  return fallbackNumber || 1;
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

export function buildSubtitle(questionStart: number | null, questionEnd: number | null, isFullTest: boolean) {
  if (questionStart === null || questionEnd === null) {
    return "Listen to the audio and answer the questions in the panel on the right.";
  }

  if (isFullTest) {
    return `Listen to the recording and answer questions ${questionStart}-${questionEnd} in the panel on the right.`;
  }

  return `Listen to the recording and answer questions ${questionStart}-${questionEnd} in the panel on the right.`;
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
