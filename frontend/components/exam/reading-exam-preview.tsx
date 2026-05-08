"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, ChevronDown, Eraser, Expand, GripVertical, Highlighter, Lightbulb, Minus, Moon, MoveHorizontal, Plus, SendHorizontal, Shrink, SunMedium } from "lucide-react";
import {
  ListeningTranscriptPanel,
  type ListeningTranscriptQuestionLocation as PreviewTranscriptQuestionLocation,
  type ListeningTranscriptSegment as PreviewTranscriptSegment,
} from "@/components/exam/listening-transcript-panel";
import { ListeningWaveformPlayer } from "@/components/exam/listening-waveform-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  formatMatchingAnswerForReview,
  getMatchingOptionViewModel,
  normalizeMatchingAnswerValue,
  shouldAutoLetterMatchingOptions,
} from "@/lib/matching-option-format";
import { readBrowserSessionCookies } from "@/lib/user-session-cookies";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

type PreviewMode = "practice" | "exam" | "review";
type PreviewDialog = "submit" | "leave" | null;
type TextHighlight = { id: string; start: number; end: number };
type PreviewUiState = {
  theme?: "light" | "dark";
  splitRatio?: number;
  fontScale?: number;
  activeQuestionId?: string;
};
type TextRange = { start: number; end: number };
type SelectionToolbarState = {
  blockKey: string;
  start: number;
  end: number;
  top: number;
  left: number;
} | null;

interface PreviewParagraph {
  paragraphKey: string;
  label?: string;
  text: string;
  sectionId?: string;
  sectionPreviewLabel?: string;
  sectionIntro?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  sectionLabel?: string;
  sectionAudioUrl?: string;
  sectionAudioDurationSeconds?: number;
  sectionTranscriptSegments?: PreviewTranscriptSegment[];
  sectionTranscriptQuestionLocations?: PreviewTranscriptQuestionLocation[];
}

interface PreviewQuestion {
  id: string;
  number: number;
  label?: string;
  selectionLimit?: number;
  type: QuestionType | "tfng" | "mcq" | "gap";
  prompt: string;
  options?: string[];
  instruction?: string;
}

interface PreviewGroup {
  id: string;
  title: string;
  instruction: string;
  type: QuestionType | "tfng" | "mcq" | "gap";
  sectionId?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  sectionLabel?: string;
  sectionAudioUrl?: string;
  sectionAudioDurationSeconds?: number;
  sectionTranscriptSegments?: PreviewTranscriptSegment[];
  sectionTranscriptQuestionLocations?: PreviewTranscriptQuestionLocation[];
  questionBlock?: string;
  secondaryBlock?: string;
  diagramTitle?: string;
  diagramImageUrl?: string;
  sharedOptions?: string[];
  questions: PreviewQuestion[];
}

interface PreviewSection {
  id: string;
  label: string;
  title?: string;
  subtitle?: string;
  previewLabel?: string;
  audioUrl?: string;
  audioDurationSeconds?: number;
  transcriptSegments?: PreviewTranscriptSegment[];
  transcriptQuestionLocations?: PreviewTranscriptQuestionLocation[];
  paragraphs: PreviewParagraph[];
  questionGroups: PreviewGroup[];
  questions: PreviewQuestion[];
}

export interface ReadingExamPreviewData {
  attemptId?: string;
  exitHref?: string;
  title: string;
  subtitle: string;
  partLabel: string;
  testType?: "reading" | "listening";
  timeLimitSeconds?: number;
  paragraphs: PreviewParagraph[];
  questionGroups: PreviewGroup[];
  initialAnswers?: Record<string, string>;
  initialTextHighlights?: Record<string, TextHighlight[]>;
  initialTimeSpentSeconds?: number;
  initialUiState?: PreviewUiState;
  reviewItems?: Record<string, {
    answerValue?: string | null;
    isCorrect?: boolean | null;
    correctAnswers: string[];
    options?: string[];
    questionType?: string;
    explanation?: string | null;
    explanationReference?: { quote?: string } | null;
  }>;
}

const PASSAGE_PARAGRAPHS: PreviewParagraph[] = [
  {
    paragraphKey: "A",
    label: "A",
    sectionPreviewLabel: "Reading Passage 1",
    sectionIntro: "You should spend about 20 minutes on Questions 1-13, which are based on Reading Passage 1 below.",
    sectionTitle: "Urban Rooftops and Hidden Ecology",
    text:
      "In many large cities, flat rooftops were once ignored spaces used only for ventilation units and storage. Over the last decade, however, architects and local councils have started to treat those surfaces as a practical environmental resource. Research teams working in Seoul, Rotterdam, and Toronto found that well-designed rooftop gardens can lower the temperature of the top floor, reduce storm-water pressure during heavy rain, and create small but measurable habitats for insects and birds.",
  },
  {
    paragraphKey: "B",
    label: "B",
    text:
      "Early projects focused mainly on appearance, yet the strongest results came from buildings that treated rooftops as working systems. A shallow layer of engineered soil, a drainage mat, and carefully selected native plants proved more effective than decorative flowerbeds that required constant replacement. In one Canadian study, energy use for summer cooling fell by roughly twelve percent in offices where the roof system had been installed and maintained for at least two years.",
  },
  {
    paragraphKey: "C",
    label: "C",
    text:
      "Not every claim about rooftop planting has been confirmed. Some property owners assume that any green roof will immediately improve air quality across a district, but most published studies describe the effect as local and limited. Researchers also warn that poorly planned installations can fail if they use unsuitable soil depth or if maintenance teams do not check irrigation during unusually dry months. For this reason, several city guidelines now require an inspection plan before a project is approved.",
  },
  {
    paragraphKey: "D",
    label: "D",
    text:
      "Despite those cautions, rooftop ecology is now part of mainstream urban planning. Developers increasingly include it because the long-term savings can offset the initial installation cost, especially on large commercial buildings. City officials are also interested in its educational value: schools with accessible roof plots often use them for science lessons, allowing students to measure temperature differences, monitor pollinators, and study how engineered landscapes behave through the year.",
  },
];

const QUESTION_GROUPS: PreviewGroup[] = [
  {
    id: "group-tfng",
    title: "Questions 1-5",
    instruction: "Do the following statements agree with the information in the passage? Choose TRUE, FALSE, or NOT GIVEN.",
    type: "tfng",
    questions: [
      { id: "q1", number: 1, type: "tfng", prompt: "Rooftops in large cities were traditionally valued as useful environmental spaces." },
      { id: "q2", number: 2, type: "tfng", prompt: "Researchers found that rooftop gardens can reduce pressure on drainage systems during storms." },
      { id: "q3", number: 3, type: "tfng", prompt: "Decorative flowerbeds performed better than native plant systems in long-term trials." },
      { id: "q4", number: 4, type: "tfng", prompt: "Every study reviewed by researchers reported major improvements in city-wide air quality." },
      { id: "q5", number: 5, type: "tfng", prompt: "Some schools use rooftop plots as part of classroom learning." },
    ],
  },
  {
    id: "group-mcq",
    title: "Questions 6-9",
    instruction: "Choose the correct letter, A, B, C, or D.",
    type: "mcq",
    questions: [
      {
        id: "q6",
        number: 6,
        type: "mcq",
        prompt: "What was the main weakness of many early rooftop projects?",
        options: [
          "They were designed mainly to look attractive.",
          "They used too many native plants.",
          "They were built only on schools.",
          "They relied on excessive irrigation technology.",
        ],
      },
      {
        id: "q7",
        number: 7,
        type: "mcq",
        prompt: "According to the Canadian study, what happened after roof systems were established?",
        options: [
          "Winter heating demand rose sharply.",
          "Cooling energy use dropped by around twelve percent.",
          "Bird populations disappeared from the area.",
          "Office workers moved to top floors more often.",
        ],
      },
      {
        id: "q8",
        number: 8,
        type: "mcq",
        prompt: "Why do some city guidelines require an inspection plan?",
        options: [
          "To ensure roofs are open to the public every weekend.",
          "To reduce the number of native species being planted.",
          "To prevent failures caused by poor planning or maintenance.",
          "To compare rooftop projects with underground gardens.",
        ],
      },
      {
        id: "q9",
        number: 9,
        type: "mcq",
        prompt: "Why are developers increasingly willing to include rooftop ecology?",
        options: [
          "It guarantees immediate improvements in district-wide air quality.",
          "It usually costs less than installing drainage systems.",
          "Long-term savings can balance the initial cost.",
          "It removes the need for building inspections.",
        ],
      },
    ],
  },
  {
    id: "group-gap",
    title: "Questions 10-13",
    instruction: "Complete the sentences below. Write {NO MORE THAN TWO WORDS} for each answer.",
    type: "gap",
    questions: [
      { id: "q10", number: 10, type: "gap", prompt: "Researchers measured rooftop gardens as small habitats for insects and ________." },
      { id: "q11", number: 11, type: "gap", prompt: "A layer of engineered soil and a ________ mat formed part of the effective roof system." },
      { id: "q12", number: 12, type: "gap", prompt: "Researchers describe air-quality improvements as ________ and limited." },
      { id: "q13", number: 13, type: "gap", prompt: "Students can study how engineered landscapes behave through the ________." },
    ],
  },
];

const DEFAULT_EXAM_DATA: ReadingExamPreviewData = {
  title: "Urban Rooftops and Hidden Ecology",
  subtitle: "Read the passage and answer questions 1-13. Keep your answers in the question panel on the right.",
  partLabel: "Part 1",
  timeLimitSeconds: 20 * 60,
  paragraphs: PASSAGE_PARAGRAPHS,
  questionGroups: QUESTION_GROUPS,
};

const attemptApiBaseUrl = "/internal-api";

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutesLeft(totalSeconds: number) {
  const minutesLeft = Math.max(1, Math.ceil(totalSeconds / 60));
  return `${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`;
}

function getDocumentTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "dark";
  }

  const savedTheme = window.localStorage.getItem("prime-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function buildAttemptRequestHeaders(accessToken: string | null | undefined) {
  const fallbackToken = readBrowserSessionCookies().accessToken;
  const resolvedToken = accessToken ?? fallbackToken;

  return {
    "Content-Type": "application/json",
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
  };
}

function inlineAnswerWidth(value: string | undefined, placeholder: string) {
  const contentLength = Math.max((value ?? "").length, placeholder.length, 8);
  return Math.min(260, Math.max(132, contentLength * 9 + 32));
}

function clampSplitRatio(value: number) {
  return Number(Math.min(58, Math.max(42, value)).toFixed(1));
}

function clampFontScale(value: number) {
  return Number(Math.min(1.2, Math.max(0.9, value)).toFixed(2));
}

function typeLabel(type: PreviewGroup["type"]) {
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

function isMcq(type: PreviewQuestion["type"]) {
  return type === "mcq" || type.includes("mc_single");
}

function isMcqMultiple(type: PreviewQuestion["type"]) {
  return type.includes("mc_multiple");
}

function isTfng(type: PreviewQuestion["type"]) {
  return type === "tfng" || type.includes("true_false");
}

function isYnng(type: PreviewQuestion["type"]) {
  return type.includes("yes_no");
}

function isMatching(type: PreviewQuestion["type"]) {
  return type.includes("matching");
}

function isCompletion(type: PreviewQuestion["type"]) {
  return type === "gap" || type.includes("completion") || type.includes("short_answer") || type.includes("labeling");
}

function isWordBankCompletion(type: PreviewQuestion["type"]) {
  return type.includes("summary_completion_wordbank");
}

function isPlanMapLabeling(type: PreviewQuestion["type"]) {
  return type.includes("plan_map_labeling");
}

function paragraphLabelFromPrompt(prompt: string) {
  const match = prompt.trim().match(/paragraph\s+([a-z])/i);
  return match ? match[1].toUpperCase() : null;
}

function usesBracketCompletionLayout(type: PreviewGroup["type"]) {
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

function splitOptionLines(block?: string) {
  return (block ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeInlineBlankPlaceholders(text: string) {
  return text.replace(/_{3,}/g, "........................");
}

function optionValue(option: unknown) {
  const safeOption = typeof option === "string" ? option : "";
  if (!safeOption) {
    return "";
  }
  const match = safeOption.match(/^([A-Za-z0-9ivxIVX]+)[.)]\s*(.*)$/);
  return match ? match[1] : safeOption;
}

function optionText(option: unknown) {
  const safeOption = typeof option === "string" ? option : "";
  if (!safeOption) {
    return "";
  }
  const match = safeOption.match(/^([A-Za-z0-9ivxIVX]+)[.)]\s*(.*)$/);
  return match ? match[2] : safeOption;
}

function normalizeOptionList(options: Array<string | null | undefined>) {
  return options
    .map((option) => (typeof option === "string" ? option.trim() : ""))
    .filter(Boolean);
}

function typedOptionLines(group: PreviewGroup) {
  return group.secondaryBlock?.trim()
    ? splitOptionLines(group.secondaryBlock)
    : normalizeOptionList(group.sharedOptions ?? []);
}

function typedQuestionOptionLines(group: PreviewGroup, question: PreviewQuestion, matchingInformationOptions: string[]) {
  if (question.type.includes("matching_information")) {
    return matchingInformationOptions.length > 0
      ? matchingInformationOptions
      : normalizeOptionList(group.sharedOptions ?? question.options ?? []);
  }

  if (question.type.includes("plan_map_labeling")) {
    return normalizeOptionList(group.sharedOptions ?? question.options ?? []);
  }

  return group.secondaryBlock?.trim()
    ? splitOptionLines(group.secondaryBlock)
    : normalizeOptionList(group.sharedOptions ?? question.options ?? []);
}

function typedOptionView(option: string, index: number, type: PreviewGroup["type"] | PreviewQuestion["type"]) {
  return getMatchingOptionViewModel(option, index, type);
}

function normalizeHeadingComparableValue(value: string | undefined) {
  return String(value ?? "").trim().toUpperCase();
}

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
    text: isStyled ? body : rawText,
    isStyled,
    italic,
    center,
    bold: isStyled && hasOuterBraces,
  };
}
function parseBraceBoldSegments(text: string) {
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

function parseInlineItalicSegments(text: string) {
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

function parseBraceBoldText(text: string) {
  const normalizedText = normalizeInlineBlankPlaceholders(text);
  const boldRanges: TextRange[] = [];
  const italicRanges: TextRange[] = [];
  const bulletLineIndexes = new Set<number>();
  let plainText = "";

  normalizedText.split("\n").forEach((rawLine, lineIndex, lines) => {
    const isBulletLine = /^\s*\*/.test(rawLine);
    const line = rawLine.replace(/^\s*\*\s?/, "");
    if (isBulletLine) {
      bulletLineIndexes.add(lineIndex);
    }

    if (lineIndex > 0) {
      plainText += "\n";
    }

    parseBraceBoldSegments(line).forEach((boldSegment) => {
      parseInlineItalicSegments(boldSegment.text).forEach((italicSegment) => {
        const segmentStart = plainText.length;
        plainText += italicSegment.text;
        const segmentEnd = plainText.length;

        if (segmentEnd <= segmentStart) {
          return;
        }
        if (boldSegment.bold) {
          boldRanges.push({ start: segmentStart, end: segmentEnd });
        }
        if (italicSegment.italic) {
          italicRanges.push({ start: segmentStart, end: segmentEnd });
        }
      });
    });

    if (line.length === 0 && lineIndex < lines.length - 1) {
      plainText += "";
    }
  });

  return { plainText, boldRanges, italicRanges, bulletLineIndexes };
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


function toggleMultiValue(current: string | undefined, next: string, maxValues = 2) {
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

function hasMultiValue(current: string | undefined, value: string) {
  return (current ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(value);
}

function mcMultipleQuestionWeight(question: PreviewQuestion) {
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

function answeredQuestionWeight(question: PreviewQuestion, answerValue: string | undefined) {
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

function isQuestionFullyAnswered(question: PreviewQuestion, answerValue: string | undefined) {
  if (!isMcqMultiple(question.type)) {
    return Boolean(answerValue?.trim());
  }

  return answeredQuestionWeight(question, answerValue) >= mcMultipleQuestionWeight(question);
}

function questionDisplaySlots(question: PreviewQuestion) {
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

function primaryQuestionDisplayLabel(question: PreviewQuestion) {
  return questionDisplaySlots(question)[0] ?? String(question.number);
}

function questionRangeLabelForGroup(group: PreviewGroup) {
  const groupSlots = group.questions.flatMap((question) => questionDisplaySlots(question));
  const startLabel = groupSlots[0] ?? String(group.questions[0]?.number ?? group.title);
  const endLabel = groupSlots[groupSlots.length - 1] ?? String(group.questions[group.questions.length - 1]?.number ?? group.title);
  return `Questions ${startLabel} - ${endLabel}`;
}

function isGenericQuestionGroupTitle(title: string) {
  return /^Question Group(?:\s+\d+(?:\s*[-,]\s*\d+)*)?$/i.test(title);
}

function shouldRenderCustomGroupTitle(group: PreviewGroup) {
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

function sectionKeyForParagraph(paragraph: PreviewParagraph) {
  return paragraph.sectionId ?? paragraph.sectionLabel ?? "section";
}

function sectionKeyForGroup(group: PreviewGroup) {
  return group.sectionId ?? group.sectionLabel ?? "section";
}

function findSectionIdForQuestion(
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

export function ReadingExamPreview({ mode, data }: { mode: PreviewMode; data?: ReadingExamPreviewData }) {
  const router = useRouter();
  const isAttemptPreview = Boolean(data?.attemptId);
  const storedCandidateName = useAuthStore((state) => state.name);
  const accessToken = useAuthStore((state) => state.accessToken);
  const containerRef = useRef<HTMLElement | null>(null);
  const readingPaneRef = useRef<HTMLDivElement | null>(null);
  const questionPaneRef = useRef<HTMLDivElement | null>(null);
  const listeningAudioRef = useRef<HTMLAudioElement | null>(null);
  const textBlockRefs = useRef<Record<string, HTMLElement | null>>({});
  const examData = data ?? DEFAULT_EXAM_DATA;
  const initialTimeSpentSeconds = Math.max(0, examData.initialTimeSpentSeconds ?? 0);
  const initialQuestionId = examData.initialUiState?.activeQuestionId ?? examData.questionGroups[0]?.questions[0]?.id ?? "";
  const [answers, setAnswers] = useState<Record<string, string>>(examData.initialAnswers ?? {});
  const [hasMounted, setHasMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [splitRatio, setSplitRatio] = useState(clampSplitRatio(examData.initialUiState?.splitRatio ?? 54));
  const [fontScale, setFontScale] = useState(clampFontScale(examData.initialUiState?.fontScale ?? 1));
  const [timeLeft, setTimeLeft] = useState(
    mode === "exam"
      ? Math.max(0, (examData.timeLimitSeconds ?? 20 * 60) - initialTimeSpentSeconds)
      : initialTimeSpentSeconds
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculatingResults, setIsCalculatingResults] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<PreviewDialog>(null);
  const [activeQuestionId, setActiveQuestionId] = useState(initialQuestionId);
  const [activeSectionId, setActiveSectionId] = useState(
    findSectionIdForQuestion(initialQuestionId, examData.questionGroups, examData.paragraphs)
  );
  const [showPassageQuestionNav, setShowPassageQuestionNav] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [draggingHeading, setDraggingHeading] = useState<{ groupId: string; value: string; sourceQuestionId?: string } | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);
  const [dragOverHeadingBankGroupId, setDragOverHeadingBankGroupId] = useState<string | null>(null);
  const [draggingWordBank, setDraggingWordBank] = useState<{
    groupId: string;
    value: string;
    sourceQuestionId?: string;
    previewLabel?: string;
  } | null>(null);
  const [dragOverWordBankQuestionId, setDragOverWordBankQuestionId] = useState<string | null>(null);
  const [dragOverWordBankGroupId, setDragOverWordBankGroupId] = useState<string | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [textHighlights, setTextHighlights] = useState<Record<string, TextHighlight[]>>(examData.initialTextHighlights ?? {});
  const [explanationHighlightQuote, setExplanationHighlightQuote] = useState<string | null>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbarState>(null);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">(
    examData.attemptId ? "saved" : "idle"
  );
  const allowLeaveRef = useRef(false);
  const saveTimersRef = useRef<Record<string, number>>({});
  const pendingAnswerValuesRef = useRef<Record<string, string>>({});
  const latestAnswersRef = useRef<Record<string, string>>(examData.initialAnswers ?? {});
  const progressSaveTimerRef = useRef<number | null>(null);
  const latestProgressRef = useRef<{
    timeSpentSec: number;
    activeQuestionId: string;
    textHighlights: Record<string, TextHighlight[]>;
    uiState: PreviewUiState;
  }>({
    timeSpentSec: initialTimeSpentSeconds,
    activeQuestionId: examData.initialUiState?.activeQuestionId ?? examData.questionGroups[0]?.questions[0]?.id ?? "",
    textHighlights: examData.initialTextHighlights ?? {},
    uiState: {
      theme: examData.initialUiState?.theme === "light" ? "light" : "dark",
      splitRatio: clampSplitRatio(examData.initialUiState?.splitRatio ?? 54),
      fontScale: clampFontScale(examData.initialUiState?.fontScale ?? 1),
      activeQuestionId: examData.initialUiState?.activeQuestionId ?? examData.questionGroups[0]?.questions[0]?.id ?? "",
    },
  });

  function handlePaneWheel(event: ReactWheelEvent<HTMLDivElement>) {
    const pane = event.currentTarget;
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

    if (!Number.isFinite(delta) || delta === 0) {
      return;
    }

    const canScrollDown = delta > 0 && pane.scrollTop + pane.clientHeight < pane.scrollHeight - 1;
    const canScrollUp = delta < 0 && pane.scrollTop > 0;

    if (!canScrollDown && !canScrollUp) {
      return;
    }

    pane.scrollTop += delta;
    event.preventDefault();
    event.stopPropagation();
  }
  const headingDragStateRef = useRef<{
    startX: number;
    startY: number;
    groupId: string;
    value: string;
    sourceQuestionId?: string;
    dragging: boolean;
  } | null>(null);
  const allQuestions = useMemo(() => examData.questionGroups.flatMap((group) => group.questions), [examData.questionGroups]);
  const previewSections = useMemo(() => {
    const ordered: PreviewSection[] = [];
    const byId = new Map<string, PreviewSection>();

    const ensureSection = (id: string, fallbackLabel: string) => {
      const existing = byId.get(id);
      if (existing) {
        return existing;
      }

      const next = {
        id,
        label: fallbackLabel,
        title: undefined as string | undefined,
        subtitle: undefined as string | undefined,
        previewLabel: undefined as string | undefined,
        audioUrl: undefined as string | undefined,
        audioDurationSeconds: undefined as number | undefined,
        transcriptSegments: undefined as PreviewTranscriptSegment[] | undefined,
        transcriptQuestionLocations: undefined as PreviewTranscriptQuestionLocation[] | undefined,
        paragraphs: [] as PreviewParagraph[],
        questionGroups: [] as PreviewGroup[],
        questions: [] as PreviewQuestion[],
      };
      byId.set(id, next);
      ordered.push(next);
      return next;
    };

    examData.paragraphs.forEach((paragraph) => {
      const id = sectionKeyForParagraph(paragraph);
      const section = ensureSection(id, paragraph.sectionLabel ?? `Passage ${ordered.length + 1}`);
      if (paragraph.sectionLabel) {
        section.label = paragraph.sectionLabel;
      }
      if (paragraph.sectionTitle && !section.title) {
        section.title = paragraph.sectionTitle;
      }
      if (paragraph.sectionSubtitle && !section.subtitle) {
        section.subtitle = paragraph.sectionSubtitle;
      }
      if (paragraph.sectionPreviewLabel && !section.previewLabel) {
        section.previewLabel = paragraph.sectionPreviewLabel;
      }
      if (paragraph.sectionAudioUrl && !section.audioUrl) {
        section.audioUrl = paragraph.sectionAudioUrl;
      }
      if (paragraph.sectionAudioDurationSeconds && !section.audioDurationSeconds) {
        section.audioDurationSeconds = paragraph.sectionAudioDurationSeconds;
      }
      if (paragraph.sectionTranscriptSegments && !section.transcriptSegments) {
        section.transcriptSegments = paragraph.sectionTranscriptSegments;
      }
      if (paragraph.sectionTranscriptQuestionLocations && !section.transcriptQuestionLocations) {
        section.transcriptQuestionLocations = paragraph.sectionTranscriptQuestionLocations;
      }
      section.paragraphs.push(paragraph);
    });

    examData.questionGroups.forEach((group) => {
      const id = sectionKeyForGroup(group);
      const section = ensureSection(id, group.sectionLabel ?? `Passage ${ordered.length + 1}`);
      if (group.sectionLabel) {
        section.label = group.sectionLabel;
      }
      if (group.sectionTitle && !section.title) {
        section.title = group.sectionTitle;
      }
      if (group.sectionSubtitle && !section.subtitle) {
        section.subtitle = group.sectionSubtitle;
      }
      if (group.sectionAudioUrl && !section.audioUrl) {
        section.audioUrl = group.sectionAudioUrl;
      }
      if (group.sectionAudioDurationSeconds && !section.audioDurationSeconds) {
        section.audioDurationSeconds = group.sectionAudioDurationSeconds;
      }
      if (group.sectionTranscriptSegments && !section.transcriptSegments) {
        section.transcriptSegments = group.sectionTranscriptSegments;
      }
      if (group.sectionTranscriptQuestionLocations && !section.transcriptQuestionLocations) {
        section.transcriptQuestionLocations = group.sectionTranscriptQuestionLocations;
      }
      section.questionGroups.push(group);
      section.questions.push(...group.questions);
    });

    return ordered;
  }, [examData.paragraphs, examData.questionGroups]);
  const currentSection = useMemo(
    () => previewSections.find((section) => section.id === activeSectionId) ?? previewSections[0],
    [activeSectionId, previewSections]
  );
  const currentParagraphs = currentSection?.paragraphs ?? examData.paragraphs;
  const currentQuestionGroups = currentSection?.questionGroups ?? examData.questionGroups;
  const currentQuestions = currentSection?.questions ?? allQuestions;
  const isListeningPreview = examData.testType === "listening";
  const isReviewMode = mode === "review";
  const isSinglePaneListeningMode = isListeningPreview && !isReviewMode;
  const currentTranscriptSegments = currentSection?.transcriptSegments ?? [];
  const currentTranscriptQuestionLocations = currentSection?.transcriptQuestionLocations ?? [];
  const reviewItems = examData.reviewItems ?? {};
  const candidateName = hasMounted ? (storedCandidateName || "Guest Candidate") : "Guest Candidate";
  const [showListeningTranscript, setShowListeningTranscript] = useState(false);
  const [showTranscriptAnswerLocations, setShowTranscriptAnswerLocations] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const currentTheme = getDocumentTheme();
    const backup = readAttemptBackup();
    const serverAnswers = examData.initialAnswers ?? {};
    const backupAnswers = backup?.answers ?? {};
    const serverHighlights = examData.initialTextHighlights ?? {};
    const backupHighlights = backup?.textHighlights ?? {};
    const backupAnswerCount = Object.values(backupAnswers).filter((value) => value.trim().length > 0).length;
    const backupHighlightCount = Object.values(backupHighlights).reduce((count, items) => count + items.length, 0);
    const serverTimeSpentSeconds = Math.max(0, examData.initialTimeSpentSeconds ?? 0);
    const backupTimeSpentSeconds = Math.max(0, backup?.timeSpentSec ?? 0);
    const shouldUseBackup = Boolean(backup) && backupTimeSpentSeconds >= serverTimeSpentSeconds;
    const nextTheme = currentTheme;
    const nextAnswers = shouldUseBackup && backupAnswerCount > 0 ? { ...serverAnswers, ...backupAnswers } : serverAnswers;
    const nextTextHighlights = shouldUseBackup && backupHighlightCount > 0 ? { ...serverHighlights, ...backupHighlights } : serverHighlights;
    const nextSplitRatio = clampSplitRatio((shouldUseBackup ? backup?.uiState?.splitRatio : undefined) ?? examData.initialUiState?.splitRatio ?? 54);
    const nextFontScale = clampFontScale((shouldUseBackup ? backup?.uiState?.fontScale : undefined) ?? examData.initialUiState?.fontScale ?? 1);
    const nextActiveQuestionId = (shouldUseBackup ? backup?.uiState?.activeQuestionId : undefined) ?? initialQuestionId;
    const nextSectionId = findSectionIdForQuestion(nextActiveQuestionId, examData.questionGroups, examData.paragraphs);
    const nextTimeSpentSeconds = shouldUseBackup ? Math.max(serverTimeSpentSeconds, backupTimeSpentSeconds) : serverTimeSpentSeconds;

    document.documentElement.classList.add(nextTheme);
    document.documentElement.classList.remove(nextTheme === "light" ? "dark" : "light");
    setTheme(nextTheme);
    setAnswers(nextAnswers);
    setTextHighlights(nextTextHighlights);
    setSplitRatio(nextSplitRatio);
    setFontScale(nextFontScale);
    setActiveQuestionId(nextActiveQuestionId);
    setActiveSectionId(nextSectionId);
    setShowPassageQuestionNav(previewSections.length <= 1);
    setTimeLeft(
      mode === "exam"
        ? Math.max(0, (examData.timeLimitSeconds ?? 20 * 60) - nextTimeSpentSeconds)
        : nextTimeSpentSeconds
    );
    setShowListeningTranscript(false);
    setShowTranscriptAnswerLocations(false);
    latestAnswersRef.current = nextAnswers;
    latestProgressRef.current = {
      timeSpentSec: nextTimeSpentSeconds,
      activeQuestionId: nextActiveQuestionId,
      textHighlights: nextTextHighlights,
      uiState: {
        theme: nextTheme,
        splitRatio: nextSplitRatio,
        fontScale: nextFontScale,
        activeQuestionId: nextActiveQuestionId,
      },
    };
    setIsSubmitted(false);
    setIsSubmitting(false);
    setActiveDialog(null);
    setSyncState(examData.attemptId ? "saved" : "idle");
    pendingAnswerValuesRef.current = {};
  }, [examData, initialQuestionId, mode, previewSections.length]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (isSubmitted) return;
    if (mode === "exam") {
      const timer = window.setInterval(() => {
        setTimeLeft((current) => (current <= 1 ? 0 : current - 1));
      }, 1000);
      return () => window.clearInterval(timer);
    }

    if (isReviewMode) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isReviewMode, isSubmitted, mode]);

  useEffect(() => {
    if (timeLeft === 0 && mode === "exam" && !isSubmitted) {
      void submitAttempt();
    }
  }, [timeLeft, mode, isSubmitted]);

  const answeredCount = useMemo(
    () => allQuestions.reduce((count, question) => count + answeredQuestionWeight(question, answers[question.id]), 0),
    [allQuestions, answers]
  );
  const totalQuestions = useMemo(
    () => allQuestions.reduce((count, question) => count + (isMcqMultiple(question.type) ? mcMultipleQuestionWeight(question) : 1), 0),
    [allQuestions]
  );
  const currentAnsweredCount = useMemo(
    () => currentQuestions.reduce((count, question) => count + answeredQuestionWeight(question, answers[question.id]), 0),
    [answers, currentQuestions]
  );
  const currentTotalQuestions = useMemo(
    () => currentQuestions.reduce((count, question) => count + (isMcqMultiple(question.type) ? mcMultipleQuestionWeight(question) : 1), 0),
    [currentQuestions]
  );
  const matchingInformationParagraphOptions = useMemo(() => {
    const optionsBySection = new Map<string, string[]>();
    const seenBySection = new Map<string, Set<string>>();

    examData.paragraphs.forEach((paragraph) => {
      const option = paragraph.label ?? paragraph.paragraphKey;
      if (!/^[A-Z]+$/.test(option)) {
        return;
      }

      const sectionKey = paragraph.sectionId ?? paragraph.sectionLabel ?? "section";
      const seen = seenBySection.get(sectionKey) ?? new Set<string>();
      if (seen.has(option)) {
        return;
      }

      seen.add(option);
      seenBySection.set(sectionKey, seen);
      optionsBySection.set(sectionKey, [...(optionsBySection.get(sectionKey) ?? []), option]);
    });

    return optionsBySection;
  }, [examData.paragraphs]);
  const matchingHeadingTargets = useMemo(() => {
    const targets = new Map<string, { group: PreviewGroup; question: PreviewQuestion }>();
    examData.questionGroups
      .filter((group) => group.type.includes("matching_headings"))
      .forEach((group) => {
        group.questions.forEach((question) => {
          const paragraphKey = paragraphLabelFromPrompt(question.prompt);
          if (!paragraphKey) {
            return;
          }
          targets.set(`${group.sectionId ?? group.sectionLabel ?? "section"}:${paragraphKey}`, {
            group,
            question,
          });
        });
      });
    return targets;
  }, [examData.questionGroups]);
  const matchingHeadingExamples = useMemo(() => {
    const examples = new Map<string, { groupId: string; value: string; text: string }>();
    examData.questionGroups
      .filter((group) => group.type.includes("matching_headings"))
      .forEach((group) => {
        const options = group.secondaryBlock?.trim()
          ? splitOptionLines(group.secondaryBlock)
          : (group.sharedOptions ?? []);

        options.forEach((option, index) => {
          const optionView = typedOptionView(option, index, group.type);
          if (!optionView.fixedParagraphLabel) {
            return;
          }
          examples.set(`${group.sectionId ?? group.sectionLabel ?? "section"}:${optionView.fixedParagraphLabel}`, {
            groupId: group.id,
            value: optionView.value,
            text: optionView.text,
          });
        });
      });
    return examples;
  }, [examData.questionGroups]);
  const headingOptionLookup = useMemo(() => {
    const lookup = new Map<string, { value: string; text: string }>();
    examData.questionGroups
      .filter((group) => group.type.includes("matching_headings"))
      .forEach((group) => {
        const options = group.secondaryBlock?.trim()
          ? splitOptionLines(group.secondaryBlock)
          : (group.sharedOptions ?? []);

        options.forEach((option, index) => {
          const optionView = typedOptionView(option, index, group.type);
          lookup.set(`${group.id}:${optionView.value}`, {
            value: optionView.value,
            text: optionView.text,
          });
        });
      });
    return lookup;
  }, [examData.questionGroups]);
  const unansweredCount = totalQuestions - answeredCount;
  const isExamMode = mode === "exam";
  const isLastFiveMinutes = isExamMode && timeLeft <= 5 * 60;
  const isLastMinute = isExamMode && timeLeft <= 60;
  const effectiveFontScale = fontScale * 0.93;
  const bodyFontSize = 17 * effectiveFontScale;
  const timerDisplay = isExamMode
    ? isLastFiveMinutes
      ? formatCountdown(timeLeft)
      : formatMinutesLeft(timeLeft)
    : formatCountdown(timeLeft);
  const inputFocusClass = theme === "light"
    ? "focus-visible:border-[#2f436f] focus-visible:ring-1 focus-visible:ring-[#2f436f]/20"
    : "focus-visible:border-primary/45 focus-visible:ring-1 focus-visible:ring-primary/20";
  const activeInputClass = theme === "light"
    ? "border-[#2f436f]/70 ring-1 ring-[#2f436f]/20"
    : "border-primary/45 ring-1 ring-primary/20";
  const numberedPlaceholderClass = theme === "light"
    ? "placeholder:text-[#2f436f]/90"
    : "placeholder:text-primary/85";
  const layoutStyle = {
    "--reading-pane": `${splitRatio}%`,
    "--question-pane": `${100 - splitRatio}%`,
  } as CSSProperties;
  const examToneStyle = (theme === "light"
    ? {
        "--foreground": "222 47% 11%",
        "--card-foreground": "222 47% 11%",
        "--popover-foreground": "222 47% 11%",
        "--muted-foreground": "215 16% 47%",
      }
    : {
        "--foreground": "210 33% 99%",
        "--card-foreground": "210 33% 99%",
        "--popover-foreground": "210 33% 99%",
        "--muted-foreground": "210 20% 92%",
      }) as CSSProperties;
  const attemptBackupKey = examData.attemptId ? `prime-attempt-backup:${examData.attemptId}` : null;

  function readAttemptBackup() {
    if (!attemptBackupKey || typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(attemptBackupKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as {
        answers?: Record<string, string>;
        textHighlights?: Record<string, TextHighlight[]>;
        timeSpentSec?: number;
        uiState?: PreviewUiState;
        updatedAt?: number;
      };
      return parsed;
    } catch {
      return null;
    }
  }

  function writeAttemptBackup() {
    if (!attemptBackupKey || typeof window === "undefined" || isSubmitted || isReviewMode) {
      return;
    }

    try {
      window.localStorage.setItem(attemptBackupKey, JSON.stringify({
        answers: latestAnswersRef.current,
        textHighlights: latestProgressRef.current.textHighlights,
        timeSpentSec: latestProgressRef.current.timeSpentSec,
        uiState: latestProgressRef.current.uiState,
        updatedAt: Date.now(),
      }));
    } catch {}
  }

  function clearAttemptBackup() {
    if (!attemptBackupKey || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(attemptBackupKey);
    } catch {}
  }

  useEffect(() => {
    if (!allQuestions.some((question) => question.id === activeQuestionId)) {
      setActiveQuestionId(allQuestions[0]?.id ?? "");
    }
  }, [activeQuestionId, allQuestions]);

  useEffect(() => {
    if (!previewSections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(previewSections[0]?.id ?? "section");
    }
  }, [activeSectionId, previewSections]);

  function markSyncSaved() {
    setSyncState("saved");
  }

  function markSyncError() {
    setSyncState("error");
  }

  function currentTimeSpentSeconds() {
    if (mode === "exam") {
      return Math.max(0, (examData.timeLimitSeconds ?? 20 * 60) - timeLeft);
    }
    return Math.max(0, timeLeft);
  }

  useEffect(() => {
    latestProgressRef.current = {
      timeSpentSec: currentTimeSpentSeconds(),
      activeQuestionId,
      textHighlights,
      uiState: {
        theme,
        splitRatio,
        fontScale,
        activeQuestionId,
      },
    };
  }, [activeQuestionId, examData.timeLimitSeconds, fontScale, mode, splitRatio, textHighlights, theme, timeLeft]);

  useEffect(() => {
    latestAnswersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!examData.attemptId || isSubmitted || isReviewMode) {
      return;
    }
    writeAttemptBackup();
  }, [answers, examData.attemptId, isSubmitted, isReviewMode, textHighlights, theme, splitRatio, fontScale, activeQuestionId, timeLeft]);

  useEffect(() => {
    if (!examData.attemptId || isSubmitted || isReviewMode) {
      return;
    }

    const handlePageHide = () => {
      writeAttemptBackup();
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [examData.attemptId, isSubmitted, isReviewMode, answers, textHighlights, theme, splitRatio, fontScale, activeQuestionId, timeLeft]);

  async function persistProgressNow() {
    if (!examData.attemptId || isSubmitted || isReviewMode) {
      return;
    }

    setSyncState("saving");
    try {
      const response = await fetch(`${attemptApiBaseUrl}/attempts/${examData.attemptId}/progress`, {
        method: "PATCH",
        headers: buildAttemptRequestHeaders(accessToken),
        credentials: "same-origin",
        body: JSON.stringify({
          time_spent_sec: latestProgressRef.current.timeSpentSec,
          active_question_id: latestProgressRef.current.activeQuestionId,
          text_highlights: latestProgressRef.current.textHighlights,
          ui_state: {
            theme: latestProgressRef.current.uiState.theme,
            split_ratio: latestProgressRef.current.uiState.splitRatio,
            font_scale: latestProgressRef.current.uiState.fontScale,
          },
        }),
      });
      if (!response.ok) {
        throw new Error("Progress save failed");
      }
      markSyncSaved();
    } catch {
      markSyncError();
    }
  }

  function queueProgressPersist(delay = 700) {
    if (!examData.attemptId || isSubmitted || isReviewMode) {
      return;
    }
    setSyncState("saving");
    if (progressSaveTimerRef.current) {
      window.clearTimeout(progressSaveTimerRef.current);
    }
    progressSaveTimerRef.current = window.setTimeout(() => {
      progressSaveTimerRef.current = null;
      void persistProgressNow();
    }, delay);
  }

  async function flushPendingAnswerSaves() {
    if (!examData.attemptId || isReviewMode) {
      return;
    }

    const pendingEntries = Object.entries(pendingAnswerValuesRef.current);
    pendingAnswerValuesRef.current = {};

    for (const timer of Object.values(saveTimersRef.current)) {
      window.clearTimeout(timer);
    }
    saveTimersRef.current = {};

    let hadError = false;
    await Promise.all(
      pendingEntries.map(async ([questionId, value]) => {
        try {
          const response = await fetch(`${attemptApiBaseUrl}/attempts/${examData.attemptId}/answer`, {
            method: "PATCH",
            headers: buildAttemptRequestHeaders(accessToken),
            credentials: "same-origin",
            body: JSON.stringify({
              question_id: questionId,
              value,
            }),
          });
          if (!response.ok) {
            throw new Error("Answer save failed");
          }
        } catch {
          hadError = true;
        }
      })
    );

    if (hadError) {
      markSyncError();
      throw new Error("Answer flush failed");
    }

    markSyncSaved();
  }

  async function flushPendingProgressSave() {
    if (progressSaveTimerRef.current) {
      window.clearTimeout(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }
    await persistProgressNow();
  }

  useEffect(() => {
    if (!examData.attemptId || isSubmitted || isReviewMode) {
      return;
    }
    queueProgressPersist(700);
  }, [activeQuestionId, examData.attemptId, fontScale, isSubmitted, isReviewMode, splitRatio, textHighlights, theme]);

  useEffect(() => {
    if (!examData.attemptId || isSubmitted || isReviewMode) {
      return;
    }

    const timer = window.setInterval(() => {
      void persistProgressNow();
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [examData.attemptId, isSubmitted, isReviewMode]);

  useEffect(() => {
    return () => {
      if (progressSaveTimerRef.current) {
        window.clearTimeout(progressSaveTimerRef.current);
      }
      for (const timer of Object.values(saveTimersRef.current)) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  function updateTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    localStorage.setItem("prime-theme", nextTheme);
    document.documentElement.classList.add(nextTheme);
    document.documentElement.classList.remove(nextTheme === "light" ? "dark" : "light");
  }

  function handleSubmit() {
    if (isSubmitted || isReviewMode) return;
    if (unansweredCount === 0) {
      void submitAttempt();
      return;
    }
    setActiveDialog("submit");
  }

  function persistAnswer(questionId: string, value: string) {
    if (isReviewMode) {
      return;
    }

    setAnswers((current) => {
      const next = { ...current, [questionId]: value };
      latestAnswersRef.current = next;
      return next;
    });

    if (!examData.attemptId) {
      return;
    }

    pendingAnswerValuesRef.current[questionId] = value;
    setSyncState("saving");

    if (saveTimersRef.current[questionId]) {
      window.clearTimeout(saveTimersRef.current[questionId]);
    }

    saveTimersRef.current[questionId] = window.setTimeout(async () => {
      try {
        const response = await fetch(`${attemptApiBaseUrl}/attempts/${examData.attemptId}/answer`, {
          method: "PATCH",
          headers: buildAttemptRequestHeaders(accessToken),
          credentials: "same-origin",
          body: JSON.stringify({
            question_id: questionId,
            value,
          }),
        });
        if (!response.ok) {
          throw new Error("Answer save failed");
        }
        delete pendingAnswerValuesRef.current[questionId];
        delete saveTimersRef.current[questionId];
        markSyncSaved();
      } catch {
        markSyncError();
      }
    }, 220);
  }

  async function submitAttempt() {
    if (isSubmitting) return;
    setActiveDialog(null);
    setIsSubmitting(true);
    setIsSubmitted(true);

    if (!examData.attemptId) {
      return;
    }

    try {
      await flushPendingAnswerSaves();
      await flushPendingProgressSave();
      const response = await fetch(`${attemptApiBaseUrl}/attempts/${examData.attemptId}/submit`, {
        method: "POST",
        headers: buildAttemptRequestHeaders(accessToken),
        credentials: "same-origin",
        body: JSON.stringify({ confirm: true, reason: mode === "exam" && timeLeft === 0 ? "time_up" : "user_confirmed" }),
      });
      if (!response.ok) {
        throw new Error("Submit failed");
      }
      clearAttemptBackup();
      allowLeaveRef.current = true;
      setIsCalculatingResults(true);
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      router.replace(`/attempts/${examData.attemptId}/result`);
    } catch {
      setIsCalculatingResults(false);
      setIsSubmitted(false);
      setIsSubmitting(false);
    }
  }

  async function confirmSubmit() {
    if (!examData.attemptId) {
      setActiveDialog(null);
      setIsSubmitted(true);
      return;
    }
    await submitAttempt();
  }

  function selectSection(sectionId: string) {
    const targetSection = previewSections.find((section) => section.id === sectionId);
    if (!targetSection) {
      return;
    }

    setActiveSectionId(sectionId);
    setShowPassageQuestionNav(true);
    setActiveQuestionId(targetSection.questions[0]?.id ?? "");
    readingPaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    questionPaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToQuestion(questionId: string) {
    setActiveSectionId(findSectionIdForQuestion(questionId, examData.questionGroups, examData.paragraphs));
    setActiveQuestionId(questionId);

    const inlineBlank = questionPaneRef.current?.querySelector<HTMLElement>(`[data-question-anchor="${questionId}"]`);
    if (inlineBlank) {
      inlineBlank.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        if ("focus" in inlineBlank && typeof inlineBlank.focus === "function") {
          inlineBlank.focus();
        }
      }, 120);
      return;
    }

    const questionCard = questionPaneRef.current?.querySelector<HTMLElement>(`[id="${questionId}"]`);
    if (questionCard) {
      questionCard.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    document
      .querySelector<HTMLElement>(`[data-heading-drop-question-id="${questionId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        return;
      }
      await document.exitFullscreen();
    } catch {}
  }

  const headerControlClass = cn(
    "border-border bg-card text-foreground transition-colors hover:bg-muted"
  );

  useEffect(() => {
    if (!isDraggingSplit) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextRatio = ((event.clientX - rect.left) / rect.width) * 100;
      const clampedRatio = Math.min(58, Math.max(42, nextRatio));
      setSplitRatio(Number(clampedRatio.toFixed(1)));
    };

    const stopDragging = () => setIsDraggingSplit(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDraggingSplit]);

  useEffect(() => {
    if (isReviewMode) {
      allowLeaveRef.current = true;
      return;
    }

    if (isSubmitted) {
      allowLeaveRef.current = true;
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      if (allowLeaveRef.current) return;
      window.history.pushState({ examPreviewGuard: true }, "", window.location.href);
      setActiveDialog("leave");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isRefreshShortcut =
        event.key === "F5" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r");

      if (!isRefreshShortcut) return;
      event.preventDefault();
      setActiveDialog("leave");
    };

    window.history.pushState({ examPreviewGuard: true }, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isReviewMode, isSubmitted]);

  async function confirmLeave() {
    allowLeaveRef.current = true;
    setActiveDialog(null);
    writeAttemptBackup();

    if (examData.attemptId && !isSubmitted) {
      try {
        await flushPendingAnswerSaves();
        await flushPendingProgressSave();
      } catch {
        markSyncError();
      }
    }

    const exitHref = examData.exitHref ?? "/tests?type=reading";
    const separator = exitHref.includes("?") ? "&" : "?";
    router.push(`${exitHref}${separator}refresh=${Date.now()}`);
  }

  function startSplitDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDraggingSplit(true);
  }

  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    setSelectionToolbar(null);
  }

  function hasActiveSelection() {
    const selection = window.getSelection();
    return Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
  }

  function getTextOffsets(blockNode: HTMLElement, range: Range) {
    const fullRange = document.createRange();
    fullRange.selectNodeContents(blockNode);

    const startRange = fullRange.cloneRange();
    startRange.setEnd(range.startContainer, range.startOffset);
    const start = startRange.toString().length;

    const endRange = fullRange.cloneRange();
    endRange.setEnd(range.endContainer, range.endOffset);
    const end = endRange.toString().length;

    return { start, end };
  }

  function handleTextBlockMouseUp(blockKey: string, event?: ReactMouseEvent<HTMLElement>) {
    const pointerTop = event ? event.clientY + 12 : null;
    const pointerLeft = event ? event.clientX : null;

    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed || selection.toString().trim().length === 0) {
        setSelectionToolbar(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const blockNode = textBlockRefs.current[blockKey];
      if (!blockNode || !blockNode.contains(range.commonAncestorContainer)) {
        setSelectionToolbar(null);
        return;
      }

      const { start, end } = getTextOffsets(blockNode, range);
      if (start === end) {
        setSelectionToolbar(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      setSelectionToolbar({
        blockKey,
        start,
        end,
        top: pointerTop ?? (rect.bottom + 10),
        left: pointerLeft ?? (rect.left + rect.width / 2),
      });
    }, 0);
  }

  function normalizeHighlights(highlights: TextHighlight[]) {
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    const merged: TextHighlight[] = [];

    for (const highlight of sorted) {
      const last = merged[merged.length - 1];
      if (!last || highlight.start > last.end) {
        merged.push(highlight);
        continue;
      }
      last.end = Math.max(last.end, highlight.end);
    }

    return merged;
  }

  function applyHighlight() {
    if (!selectionToolbar) return;

    setTextHighlights((current) => {
      const existing = current[selectionToolbar.blockKey] ?? [];
      const next = normalizeHighlights([
        ...existing,
        {
          id: `${selectionToolbar.blockKey}-${selectionToolbar.start}-${selectionToolbar.end}-${Date.now()}`,
          start: selectionToolbar.start,
          end: selectionToolbar.end,
        },
      ]);

      return {
        ...current,
        [selectionToolbar.blockKey]: next,
      };
    });

    clearSelection();
  }

  function clearHighlight() {
    if (!selectionToolbar) return;

    setTextHighlights((current) => {
      const existing = current[selectionToolbar.blockKey] ?? [];
      const next = existing.filter(
        (highlight) =>
          highlight.end <= selectionToolbar.start || highlight.start >= selectionToolbar.end
      );

      return {
        ...current,
        [selectionToolbar.blockKey]: next,
      };
    });

    clearSelection();
  }

  function startHeadingDrag(groupId: string, value: string, sourceQuestionId?: string) {
    setDraggingHeading({
      groupId,
      value,
      sourceQuestionId,
    });
  }

  function resolveHeadingDropTarget(clientX: number, clientY: number, groupId: string) {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const dropTarget = target?.closest("[data-heading-drop-question-id]") as HTMLElement | null;
    if (!dropTarget) {
      return null;
    }

    if (dropTarget.dataset.headingDropGroupId !== groupId) {
      return null;
    }

    return dropTarget.dataset.headingDropQuestionId ?? null;
  }

  function isHeadingBankDropTarget(clientX: number, clientY: number, groupId: string) {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const bankTarget = target?.closest("[data-heading-bank-group-id]") as HTMLElement | null;
    if (!bankTarget) {
      return false;
    }

    return bankTarget.dataset.headingBankGroupId === groupId;
  }

  function resolveWordBankDropTarget(clientX: number, clientY: number, groupId: string) {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const dropTarget = target?.closest("[data-wordbank-drop-question-id]") as HTMLElement | null;
    if (!dropTarget) {
      return null;
    }

    if (dropTarget.dataset.wordbankDropGroupId !== groupId) {
      return null;
    }

    return dropTarget.dataset.wordbankDropQuestionId ?? null;
  }

  function isWordBankBankDropTarget(clientX: number, clientY: number, groupId: string) {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const bankTarget = target?.closest("[data-wordbank-bank-group-id]") as HTMLElement | null;
    if (!bankTarget) {
      return false;
    }

    return bankTarget.dataset.wordbankBankGroupId === groupId;
  }

  function beginHeadingPointerDrag(
    event: ReactPointerEvent<HTMLElement>,
    payload: { groupId: string; value: string; sourceQuestionId?: string }
  ) {
    if (event.button !== 0) {
      return;
    }

    headingDragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      groupId: payload.groupId,
      value: payload.value,
      sourceQuestionId: payload.sourceQuestionId,
      dragging: false,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const state = headingDragStateRef.current;
      if (!state) {
        return;
      }

      if (!state.dragging) {
        const deltaX = Math.abs(moveEvent.clientX - state.startX);
        const deltaY = Math.abs(moveEvent.clientY - state.startY);
        if (Math.max(deltaX, deltaY) < 10) {
          return;
        }

        state.dragging = true;
        startHeadingDrag(state.groupId, state.value, state.sourceQuestionId);
        setDragPreviewPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        window.getSelection()?.removeAllRanges();
      }

      setDragPreviewPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      const targetQuestionId = resolveHeadingDropTarget(moveEvent.clientX, moveEvent.clientY, state.groupId);
      setDragOverQuestionId(targetQuestionId);
      setDragOverHeadingBankGroupId(
        targetQuestionId ? null : (isHeadingBankDropTarget(moveEvent.clientX, moveEvent.clientY, state.groupId) ? state.groupId : null)
      );
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      headingDragStateRef.current = null;
      setDraggingHeading(null);
      setDragOverQuestionId(null);
      setDragOverHeadingBankGroupId(null);
      setDragPreviewPosition(null);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const state = headingDragStateRef.current;
      if (state?.dragging) {
        const targetQuestionId = resolveHeadingDropTarget(upEvent.clientX, upEvent.clientY, state.groupId);
        const droppedBackToBank = isHeadingBankDropTarget(upEvent.clientX, upEvent.clientY, state.groupId);
        if (targetQuestionId) {
          setActiveQuestionId(targetQuestionId);
          if (state.sourceQuestionId && state.sourceQuestionId !== targetQuestionId) {
            persistAnswer(state.sourceQuestionId, "");
          }
          persistAnswer(targetQuestionId, state.value);
        } else if (droppedBackToBank && state.sourceQuestionId) {
          persistAnswer(state.sourceQuestionId, "");
        }
      }

      cleanup();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  function beginWordBankPointerDrag(
    event: ReactPointerEvent<HTMLElement>,
    payload: { groupId: string; value: string; sourceQuestionId?: string; previewLabel?: string }
  ) {
    if (event.button !== 0) {
      return;
    }

    const state = {
      startX: event.clientX,
      startY: event.clientY,
      groupId: payload.groupId,
      value: payload.value,
      sourceQuestionId: payload.sourceQuestionId,
      dragging: false,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!state.dragging) {
        const deltaX = Math.abs(moveEvent.clientX - state.startX);
        const deltaY = Math.abs(moveEvent.clientY - state.startY);
        if (Math.max(deltaX, deltaY) < 10) {
          return;
        }

        state.dragging = true;
        setDraggingWordBank({
          groupId: state.groupId,
          value: state.value,
          sourceQuestionId: state.sourceQuestionId,
          previewLabel: payload.previewLabel,
        });
        setDragPreviewPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        window.getSelection()?.removeAllRanges();
      }

      setDragPreviewPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      const targetQuestionId = resolveWordBankDropTarget(moveEvent.clientX, moveEvent.clientY, state.groupId);
      setDragOverWordBankQuestionId(targetQuestionId);
      setDragOverWordBankGroupId(
        targetQuestionId ? null : (isWordBankBankDropTarget(moveEvent.clientX, moveEvent.clientY, state.groupId) ? state.groupId : null)
      );
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setDraggingWordBank(null);
      setDragOverWordBankQuestionId(null);
      setDragOverWordBankGroupId(null);
      setDragPreviewPosition(null);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (state.dragging) {
        const targetQuestionId = resolveWordBankDropTarget(upEvent.clientX, upEvent.clientY, state.groupId);
        const droppedBackToBank = isWordBankBankDropTarget(upEvent.clientX, upEvent.clientY, state.groupId);
        if (targetQuestionId) {
          setActiveQuestionId(targetQuestionId);
          if (state.sourceQuestionId && state.sourceQuestionId !== targetQuestionId) {
            persistAnswer(state.sourceQuestionId, "");
          }
          persistAnswer(targetQuestionId, state.value);
        } else if (droppedBackToBank && state.sourceQuestionId) {
          persistAnswer(state.sourceQuestionId, "");
        }
      }

      cleanup();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  function renderHighlightedText(blockKey: string, text: string) {
    const { plainText, boldRanges, italicRanges, bulletLineIndexes } = parseBraceBoldText(text);
    let highlights = (textHighlights[blockKey] ?? []).slice();

    if (explanationHighlightQuote && blockKey.startsWith("passage-")) {
      const normalizedQuote = explanationHighlightQuote.trim();
      if (normalizedQuote.length > 3) {
        try {
          const escapedQuote = normalizedQuote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
          const regex = new RegExp(escapedQuote, 'g');
          let match;
          while ((match = regex.exec(plainText)) !== null) {
            highlights.push({
              id: `explanation-highlight-${match.index}`,
              start: match.index,
              end: match.index + match[0].length,
            });
          }
        } catch (e) {
          // fallback to simple indexOf
          let searchStartIndex = 0;
          while (true) {
            const index = plainText.indexOf(normalizedQuote, searchStartIndex);
            if (index === -1) break;
            highlights.push({
              id: `explanation-highlight-${index}`,
              start: index,
              end: index + normalizedQuote.length,
            });
            searchStartIndex = index + normalizedQuote.length;
          }
        }
      }
    }

    highlights = highlights.sort((a, b) => a.start - b.start);

    function renderFormattedSlice(start: number, end: number, keyPrefix: string) {
      if (start >= end) {
        return null;
      }

      const parts: ReactNode[] = [];
      const overlappingBoldRanges = boldRanges.filter((range) => range.end > start && range.start < end);
      const overlappingItalicRanges = italicRanges.filter((range) => range.end > start && range.start < end);
      const boundaries = new Set<number>([start, end]);

      overlappingBoldRanges.forEach((range) => {
        boundaries.add(Math.max(start, range.start));
        boundaries.add(Math.min(end, range.end));
      });
      overlappingItalicRanges.forEach((range) => {
        boundaries.add(Math.max(start, range.start));
        boundaries.add(Math.min(end, range.end));
      });

      const sortedBoundaries = Array.from(boundaries).sort((left, right) => left - right);
      for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
        const segmentStart = sortedBoundaries[index] ?? start;
        const segmentEnd = sortedBoundaries[index + 1] ?? end;
        if (segmentEnd <= segmentStart) {
          continue;
        }

        const segmentText = plainText.slice(segmentStart, segmentEnd);
        const isBold = overlappingBoldRanges.some((range) => range.start < segmentEnd && range.end > segmentStart);
        const isItalic = overlappingItalicRanges.some((range) => range.start < segmentEnd && range.end > segmentStart);

        if (isBold) {
          parts.push(
            <strong
              key={`${keyPrefix}-segment-${index}-${segmentStart}`}
              className={cn("font-bold text-inherit", isItalic && "italic")}
            >
              {segmentText}
            </strong>
          );
          continue;
        }

        if (isItalic) {
          parts.push(
            <em key={`${keyPrefix}-segment-${index}-${segmentStart}`} className="italic">
              {segmentText}
            </em>
          );
          continue;
        }

        parts.push(<span key={`${keyPrefix}-segment-${index}-${segmentStart}`}>{segmentText}</span>);
      }

      return parts.length > 0 ? parts : plainText.slice(start, end);
    }

    function renderHighlightedSlice(start: number, end: number, keyPrefix: string) {
      if (start >= end) {
        return null;
      }

      if (highlights.length === 0) {
        return renderFormattedSlice(start, end, `${keyPrefix}-base`);
      }

      const parts: ReactNode[] = [];
      let cursor = start;
      const overlappingHighlights = highlights.filter((highlight) => highlight.end > start && highlight.start < end);

      overlappingHighlights.forEach((highlight, index) => {
        const segmentStart = Math.max(start, highlight.start);
        const segmentEnd = Math.min(end, highlight.end);

        if (cursor < segmentStart) {
          parts.push(
            <span key={`${keyPrefix}-before-${index}-${cursor}`}>
              {renderFormattedSlice(cursor, segmentStart, `${keyPrefix}-before-${index}`)}
            </span>
          );
        }

        if (segmentStart < segmentEnd) {
          const isExplanation = highlight.id.startsWith("explanation-highlight-");
          parts.push(
            <mark
              key={`${highlight.id}-${segmentStart}-${segmentEnd}`}
              className={cn(
                "rounded-[0.25rem] px-[1px] text-inherit",
                isExplanation
                  ? "bg-orange-400/80 ring-2 ring-orange-500/50 dark:bg-orange-500/50 dark:ring-orange-400/50 transition-all duration-300"
                  : "bg-amber-300/65 dark:bg-[#5b4618]/50 dark:ring-1 dark:ring-[#c9952f]/40"
              )}
            >
              {renderFormattedSlice(segmentStart, segmentEnd, `${keyPrefix}-mark-${index}`)}
            </mark>
          );
        }

        cursor = segmentEnd;
      });

      if (cursor < end) {
        parts.push(
          <span key={`${keyPrefix}-tail-${cursor}`}>
            {renderFormattedSlice(cursor, end, `${keyPrefix}-tail`)}
          </span>
        );
      }

      if (parts.length === 0) {
        return renderFormattedSlice(start, end, `${keyPrefix}-plain`);
      }

      return parts;
    }

    const lines = plainText.split("\n");
    if (lines.length === 1 && bulletLineIndexes.size === 0) {
      return renderHighlightedSlice(0, plainText.length, `${blockKey}-single`);
    }

    const rows: ReactNode[] = [];
    let lineStart = 0;

    lines.forEach((line, index) => {
      const lineEnd = lineStart + line.length;
      const lineContent = line.length > 0
        ? renderHighlightedSlice(lineStart, lineEnd, `${blockKey}-line-${index}`)
        : <span>&nbsp;</span>;

      rows.push(
        <span key={`${blockKey}-row-${index}`}>
          {bulletLineIndexes.has(index) ? (
            <span className="my-0.5 ml-4 inline-flex max-w-full items-start gap-2 align-top">
              <span className="mt-[0.55em] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              <span className="min-w-0 flex-1">{lineContent}</span>
            </span>
          ) : (
            lineContent
          )}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      );

      lineStart = lineEnd + 1;
    });

    return rows;
  }

  function renderFormattedText(text: string, keyPrefix: string) {
    return renderHighlightedText(keyPrefix, text);
  }

  function renderInstructionText(blockKey: string, text: string) {
    const binaryLayout = parseBinaryInstructionLayout(text);
    if (!binaryLayout) {
      return renderHighlightedText(blockKey, text);
    }

    return (
      <div className="space-y-2">
        {binaryLayout.prefix ? (
          <div className="whitespace-pre-wrap">
            {renderHighlightedText(`${blockKey}-prefix`, binaryLayout.prefix)}
          </div>
        ) : null}
        <div className="grid gap-y-1">
          {binaryLayout.optionRows.map((row, index) => (
            <div key={`${blockKey}-row-${row.label}-${index}`} className="grid grid-cols-[5.5rem_1fr] items-start gap-x-1">
              <strong className="font-bold text-foreground">{row.label}</strong>
              <span>{row.detail}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-selection-toolbar]")) {
        return;
      }
      if (target?.closest("[data-highlight-text]")) {
        return;
      }
      setSelectionToolbar(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  function optionBankWidthForGroup(group: PreviewGroup) {
    const longestChars = typedOptionLines(group).reduce((maxLength, option, index) => {
      const optionView = typedOptionView(option, index, group.type);
      const text = optionView.text || optionView.label || optionView.value;
      const hasPrefix =
        !group.type.includes("matching_headings")
        && (optionView.hasExplicitPrefix || shouldAutoLetterMatchingOptions(group.type));
      const displayText = hasPrefix ? `${optionView.value}. ${text}` : text;
      return Math.max(maxLength, displayText.trim().length);
    }, 18);

    return `${Math.max(18, longestChars + 6)}ch`;
  }

  function renderOptionBank(group: PreviewGroup) {
    if (group.type.includes("matching_information") || group.type.includes("plan_map_labeling")) {
      return null;
    }

    const baseOptions = typedOptionLines(group);
    const baseOptionEntries = baseOptions.map((option, index) => ({
      option,
      index,
      optionView: typedOptionView(option, index, group.type),
    }));

    const selectedValues = group.type.includes("matching_headings")
      ? new Set<string>([
          ...group.questions
            .map((question) => normalizeHeadingComparableValue(answers[question.id] ?? ""))
            .filter(Boolean),
          ...examData.paragraphs
            .map((paragraph) => matchingHeadingExamples.get(`${paragraph.sectionId ?? paragraph.sectionLabel ?? "section"}:${paragraph.paragraphKey}`))
            .filter((entry): entry is { groupId: string; value: string; text: string } => Boolean(entry && entry.groupId === group.id))
            .map((entry) => normalizeHeadingComparableValue(entry.value)),
        ])
      : group.type.includes("wordbank") || group.type.includes("listening_matching")
        ? new Set<string>(
          group.questions
              .map((question) => {
                const groupOptions = typedQuestionOptionLines(group, question, []);
                return normalizeMatchingAnswerValue(String(answers[question.id] ?? "").trim(), groupOptions, question.type);
              })
              .filter(Boolean)
              .map((value) => normalizeHeadingComparableValue(value))
          )
        : new Set<string>();

    const isWordBankLikeGroup = group.type.includes("wordbank") || group.type.includes("listening_matching");
    const bankOptions = group.type.includes("matching_headings") || isWordBankLikeGroup
      ? baseOptionEntries.filter((entry) => {
          const value = normalizeHeadingComparableValue(
            isWordBankLikeGroup
              ? entry.optionView.value
              : entry.optionView.value
          );
          return !selectedValues.has(value);
        })
      : baseOptionEntries;

    if (bankOptions.length === 0 && !isWordBankLikeGroup) {
      return null;
    }

    const isBankDropReady = draggingHeading?.groupId === group.id || draggingWordBank?.groupId === group.id;
    const optionBankWidth = optionBankWidthForGroup(group);

    return (
      <div
        data-heading-bank-group-id={group.type.includes("matching_headings") ? group.id : undefined}
        data-wordbank-bank-group-id={isWordBankLikeGroup ? group.id : undefined}
        className={cn(
          "w-full p-1 transition",
          (dragOverHeadingBankGroupId === group.id || dragOverWordBankGroupId === group.id) && isBankDropReady && "rounded-xl bg-primary/5"
        )}
        style={group.type.includes("listening_matching") ? { width: optionBankWidth } : undefined}
      >
        {!group.type.includes("listening_matching") ? (
          <p
            className={cn(
              "mb-3 font-black uppercase tracking-[0.18em]",
              group.type.includes("matching_headings")
                ? "text-[13px] text-foreground"
                : "text-[10px] text-foreground/80"
            )}
          >
            {group.type.includes("matching_headings") ? "List of Headings" : "Options"}
          </p>
        ) : null}
        <div className={cn(
          group.type.includes("wordbank")
            ? "flex flex-wrap gap-2"
            : group.type.includes("listening_matching")
              ? "flex flex-col gap-2"
            : "space-y-2"
        )}>
          {bankOptions.map((entry) => {
            const { option, index, optionView } = entry;
            const value = optionView.value;
            const text = optionView.text || optionView.label;
            const hasPrefix = !group.type.includes("matching_headings")
              && (optionView.hasExplicitPrefix || shouldAutoLetterMatchingOptions(group.type));
            const optionBlockKey = `option-bank-${group.id}-${value}-${text}`;
            const isDraggingOption = group.type.includes("matching_headings")
              ? (
                  draggingHeading?.groupId === group.id &&
                  normalizeHeadingComparableValue(draggingHeading?.value) === normalizeHeadingComparableValue(value) &&
                  !draggingHeading?.sourceQuestionId
                )
              : (
                  isWordBankLikeGroup
                  && draggingWordBank?.groupId === group.id
                  && normalizeHeadingComparableValue(draggingWordBank?.value) === normalizeHeadingComparableValue(value)
                  && !draggingWordBank?.sourceQuestionId
                );

            if (isDraggingOption) {
              return null;
            }

            return (
              <div
                key={`${group.id}-${value}-${text}-${index}`}
                onPointerDown={(event) => {
                  if (group.type.includes("matching_headings")) {
                    beginHeadingPointerDrag(event, { groupId: group.id, value });
                    return;
                  }
                  if (isWordBankLikeGroup) {
                    beginWordBankPointerDrag(event, {
                      groupId: group.id,
                      value: entry.optionView.value,
                      previewLabel: entry.optionView.label,
                    });
                  }
                }}
                className={cn(
                  "rounded-xl px-3 py-2 transition-transform duration-150",
                  group.type.includes("matching_headings")
                    ? "w-full min-w-0 border border-[#2f436f]/55 bg-[#2f436f]/[0.035] dark:border-[#4b6498]/55 dark:bg-[#4b6498]/[0.08]"
                    : group.type.includes("wordbank")
                      ? "inline-flex min-w-[16rem] max-w-full cursor-grab items-center border border-border/55 bg-card active:cursor-grabbing hover:bg-muted/20"
                      : group.type.includes("listening_matching")
                        ? "w-full min-w-0 cursor-grab rounded-lg border border-border/90 bg-card px-3 py-1.5 shadow-sm active:cursor-grabbing dark:border-slate-500/80"
                        : "border border-border/55 bg-card",
                  hasPrefix ? "flex items-start gap-0.5" : "block"
                )}
                style={group.type.includes("matching_headings") || isWordBankLikeGroup ? { width: optionBankWidth } : undefined}
              >
              {hasPrefix ? (
                  <>
                    {group.type.includes("matching_headings") ? (
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md border border-[#2f436f]/35 bg-[#2f436f]/[0.07] text-[#2f436f] transition active:cursor-grabbing dark:border-[#4b6498]/45 dark:bg-[#4b6498]/[0.12] dark:text-[#89a4d8]"
                        aria-hidden="true"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                    ) : null}
                    <span
                      ref={(node) => {
                        textBlockRefs.current[optionBlockKey] = node;
                      }}
                      data-highlight-text
                      onMouseUp={(event) => handleTextBlockMouseUp(optionBlockKey, event)}
                      className={cn(
                        "select-text flex-1 whitespace-nowrap text-[16px] leading-6 text-foreground",
                        group.type.includes("listening_matching") && "min-w-0 leading-5"
                      )}
                    >
                      {group.type.includes("listening_matching") ? (
                        <>
                          <span className="font-black">{value}.</span>{" "}
                          <span className="font-normal">{renderHighlightedText(optionBlockKey, text)}</span>
                        </>
                      ) : (
                        renderHighlightedText(optionBlockKey, `${value}. ${text}`)
                      )}
                    </span>
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    {group.type.includes("matching_headings") ? (
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md border border-[#2f436f]/35 bg-[#2f436f]/[0.07] text-[#2f436f] transition active:cursor-grabbing dark:border-[#4b6498]/45 dark:bg-[#4b6498]/[0.12] dark:text-[#89a4d8]"
                        aria-hidden="true"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                    ) : null}
                    <span
                      ref={(node) => {
                        textBlockRefs.current[optionBlockKey] = node;
                        }}
                      data-highlight-text
                      onMouseUp={(event) => handleTextBlockMouseUp(optionBlockKey, event)}
                      className={cn(
                        "select-text whitespace-nowrap text-[16px] font-bold leading-6 text-foreground",
                        group.type.includes("wordbank") ? "block" : "block flex-1"
                      )}
                    >
                      {renderHighlightedText(optionBlockKey, text)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {bankOptions.length === 0 && isWordBankLikeGroup ? (
            <div className="rounded-xl border border-dashed border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
              All options are in use
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderDiagramBlock(group: PreviewGroup) {
    if ((!group.type.includes("diagram") && !group.type.includes("plan_map_labeling")) || !group.diagramImageUrl) {
      return null;
    }

    return (
      <div className="p-1">
        <div className="overflow-hidden rounded-xl p-2">
          <img
            src={group.diagramImageUrl}
            alt={group.title}
            className="max-h-[340px] w-full object-contain object-left"
          />
        </div>
      </div>
    );
  }

  function renderGroupQuestionList(group: PreviewGroup) {
    if (usesBracketCompletionLayout(group.type) && group.questionBlock?.trim()) {
      return renderInlineCompletionGroup(group);
    }

    if (group.type.includes("matching_headings")) {
      return null;
    }

    return group.questions.map((question) => {
      const isBinaryQuestion = isTfng(question.type) || isYnng(question.type);
      const isMatchingInformationQuestion = question.type.includes("matching_information");
      const isMatchingFeaturesQuestion = question.type.includes("matching_features");
      const isListeningMatchingQuestion = question.type.includes("listening_matching");
      const isPlanMapQuestion = question.type.includes("plan_map_labeling");
      const isInlineMatchingQuestion =
        isMatchingInformationQuestion
        || isMatchingFeaturesQuestion
        || isListeningMatchingQuestion
        || isPlanMapQuestion;
      const inlineQuestionLabel = question.label ?? String(question.number);

      return (
        <div
          key={question.id}
          id={question.id}
          onClick={() => setActiveQuestionId(question.id)}
          className={cn(
            "px-0 transition",
            isInlineMatchingQuestion ? "py-0" : "py-2",
            activeQuestionId === question.id && ""
          )}
        >
          <div className={cn(
            "mb-2.5 flex items-start gap-3",
            isBinaryQuestion && "mb-1.5",
            isInlineMatchingQuestion && "mb-0 gap-1 items-start",
            isListeningMatchingQuestion && "gap-4",
            isPlanMapQuestion && "gap-2 items-center"
          )}>
            <div className={cn(
              isPlanMapQuestion
                ? "inline-grid max-w-[456px] grid-cols-[minmax(0,252px)_188px] items-center gap-4"
                : "min-w-0 flex-1 space-y-1",
              isInlineMatchingQuestion && !isPlanMapQuestion && "flex flex-1 flex-wrap items-start gap-1 space-y-0",
              isListeningMatchingQuestion && "w-auto flex-none",
              isMcqMultiple(question.type) && "space-y-0"
            )}>
              <p
                ref={(node) => {
                  textBlockRefs.current[`question-prompt-${question.id}`] = node;
                }}
                data-highlight-text
                onMouseUp={(event) => handleTextBlockMouseUp(`question-prompt-${question.id}`, event)}
                className={cn(
                  "select-text font-sans text-foreground",
                  isMatchingInformationQuestion && "min-w-[160px] flex-1",
                  isMatchingFeaturesQuestion && "min-w-[180px] flex-1",
                  isListeningMatchingQuestion && "w-[260px] max-w-[260px] flex-none",
                  isPlanMapQuestion && "min-w-0 max-w-none"
                )}
                style={{ fontSize: `${bodyFontSize}px`, lineHeight: isInlineMatchingQuestion ? 1.35 : 1.5 }}
              >
                <span className="mr-3 inline-block whitespace-nowrap text-[16px] font-bold tracking-tight text-foreground">
                  {inlineQuestionLabel}
                </span>
                {renderHighlightedText(`question-prompt-${question.id}`, question.prompt)}
              </p>
              {isInlineMatchingQuestion ? renderQuestionControl(question, group) : null}
              {question.instruction && !group.instruction?.trim() && !isBinaryQuestion && !isMatching(question.type) ? (
                <p
                  ref={(node) => {
                    textBlockRefs.current[`question-instruction-${question.id}`] = node;
                  }}
                  data-highlight-text
                  onMouseUp={(event) => handleTextBlockMouseUp(`question-instruction-${question.id}`, event)}
                  className="select-text text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {renderHighlightedText(`question-instruction-${question.id}`, question.instruction)}
                </p>
              ) : null}
            </div>
          </div>

          {!isInlineMatchingQuestion ? renderQuestionControl(question, group) : null}
        </div>
      );
    });
  }

  function renderMatchingHeadingDropArea(paragraph: PreviewParagraph) {
    const paragraphKey = `${paragraph.sectionId ?? paragraph.sectionLabel ?? "section"}:${paragraph.paragraphKey}`;
    const target = matchingHeadingTargets.get(paragraphKey);
    const fixedExample = matchingHeadingExamples.get(paragraphKey);

    if (!target && !fixedExample) {
      return null;
    }

    if (!target && fixedExample) {
      return (
        <div className={cn(
          "mb-2 flex min-h-[28px] items-center justify-center rounded-md border border-success/40 bg-success/8 px-2.5 py-1 text-sm font-semibold text-foreground transition-all duration-150"
        )}>
          <span className="ml-2.5 flex-1 text-left text-[15px] font-bold leading-6 text-inherit">
            {renderFormattedText(fixedExample.text, `selected-heading-example-${paragraph.paragraphKey}`)}
          </span>
        </div>
      );
    }

    if (!target) {
      return null;
    }

    const isDraggingSelectedHeading =
      draggingHeading?.groupId === target.group.id &&
      normalizeHeadingComparableValue(draggingHeading?.value) === normalizeHeadingComparableValue(answers[target.question.id] ?? "") &&
      draggingHeading?.sourceQuestionId === target.question.id;
    const currentValue = isDraggingSelectedHeading ? "" : (answers[target.question.id] ?? "");
    const optionLines = typedOptionLines(target.group);
    const currentOption = optionLines.find(
      (option, index) =>
        normalizeHeadingComparableValue(typedOptionView(option, index, target.group.type).value) === normalizeHeadingComparableValue(currentValue)
    );
    const currentHeadingText = currentOption
      ? optionText(currentOption)
      : headingOptionLookup.get(`${target.group.id}:${currentValue}`)?.text ?? currentValue;
    const isActive = activeQuestionId === target.question.id;
    const isDropReady = draggingHeading?.groupId === target.group.id;
    const isDropHover = dragOverQuestionId === target.question.id && isDropReady;
    const hasValue = Boolean(currentValue);
    const dropTone = theme === "light"
      ? {
          hover: "border-[#2f436f] text-[#2f436f] bg-[#2f436f]/16 ring-2 ring-[#2f436f]/18 shadow-sm",
          filled: "border-[#2f436f]/75 text-[#2f436f] bg-[#2f436f]/8",
          idle: "border-[#2f436f]/70 text-[#2f436f]/90",
        }
      : {
          hover: "border-slate-300 text-[#FBFCFD] bg-slate-700/70 ring-2 ring-slate-300/18 shadow-sm",
          filled: "border-slate-500/80 text-[#FBFCFD] bg-slate-700/35",
          idle: "border-slate-500/75 text-[#FBFCFD]/88",
        };

    return (
      <div
        id={target.question.id}
        data-heading-drop-question-id={target.question.id}
        data-heading-drop-group-id={target.group.id}
        onClick={() => setActiveQuestionId(target.question.id)}
        onPointerDown={(event) => {
          if (!hasValue) {
            return;
          }
          beginHeadingPointerDrag(event, {
            groupId: target.group.id,
            value: currentValue,
            sourceQuestionId: target.question.id,
          });
        }}
        className={cn(
          "mb-2 flex min-h-[28px] items-center justify-center rounded-md border border-dashed px-2.5 py-1 text-sm font-semibold transition-all duration-150",
          hasValue ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          isDropHover
            ? dropTone.hover
            : hasValue
              ? dropTone.filled
              : isActive
                ? "border-[#2f436f] text-[#2f436f] bg-[#2f436f]/[0.03]"
                : dropTone.idle,
        )}
      >
        <span className="flex min-w-[18px] items-center justify-center text-[16px] font-black leading-none text-inherit">
          {target.question.label ?? target.question.number}
        </span>
        {currentValue ? (
          <span className="ml-2.5 flex-1 text-left text-[15px] font-bold leading-6 text-inherit">
            {renderFormattedText(currentHeadingText, `selected-heading-${target.question.id}`)}
          </span>
        ) : null}
      </div>
    );
  }

  function renderInlineCompletionGroup(group: PreviewGroup) {
    const questionBlock = group.questionBlock ?? "";
    const segments = questionBlock.split("[]");
    const isWordBankGroup = group.type.includes("wordbank");

    function renderInlineCompletionAnswer(question: PreviewQuestion, key: string) {
      return isWordBankGroup ? (
        <button
          type="button"
          key={`${key}-wordbank`}
          data-question-anchor={question.id}
          data-wordbank-drop-question-id={question.id}
          data-wordbank-drop-group-id={group.id}
          onClick={() => setActiveQuestionId(question.id)}
          onPointerDown={(event) => {
            const currentValue = answers[question.id] ?? "";
            if (!currentValue) {
              return;
            }
            beginWordBankPointerDrag(event, {
              groupId: group.id,
              value: currentValue,
              sourceQuestionId: question.id,
            });
          }}
          className={cn(
            "mx-1 inline-flex h-8 min-w-[132px] items-center rounded-md border px-3 text-left text-[15px] font-medium align-middle shadow-none transition",
            theme === "light"
              ? "border-[#2f436f]/45 bg-[#f8faff] text-[#22314d]"
              : "border-slate-500/55 bg-card text-foreground",
            dragOverWordBankQuestionId === question.id && "border-primary/55 bg-primary/10",
            answers[question.id] ? "cursor-grab active:cursor-grabbing" : "cursor-default",
            activeQuestionId === question.id && activeInputClass
          )}
          style={{ width: `${inlineAnswerWidth(answers[question.id], question.label ?? String(question.number))}px` }}
        >
          <span className={cn(!answers[question.id] && numberedPlaceholderClass)}>
            {answers[question.id] || (question.label ?? String(question.number))}
          </span>
        </button>
      ) : (
        <Input
          key={`${key}-input`}
          value={answers[question.id] ?? ""}
          onFocus={() => setActiveQuestionId(question.id)}
          onChange={(event) => persistAnswer(question.id, event.target.value)}
          placeholder={question.label ?? String(question.number)}
          data-question-anchor={question.id}
          className={cn(
            "mx-1 inline-flex h-8 min-w-[132px] rounded-md border px-3 text-left text-[15px] font-medium align-middle shadow-none placeholder:text-[13px] placeholder:font-semibold placeholder:tracking-[0.04em] placeholder:opacity-100",
            theme === "light"
              ? "border-[#2f436f]/45 bg-[#f8faff]"
              : "border-primary/30 bg-card",
            numberedPlaceholderClass,
            inputFocusClass,
            activeQuestionId === question.id && activeInputClass
          )}
          style={{ width: `${inlineAnswerWidth(answers[question.id], question.label ?? String(question.number))}px` }}
          autoComplete="off"
          spellCheck="false"
        />
      );
    }

    const tableLayout = parseCompletionTableLayout(questionBlock);
    if (tableLayout) {
      const questionIndexRef = { current: 0 };

      return (
        <div className="px-2 py-2">
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
                            row.isHeader ? "text-sm font-bold" : "text-[15px] font-normal"
                          )}
                          style={{ lineHeight: 1.5 }}
                        >
                          {cellSegments.map((segment, segmentIndex) => {
                            const question = segmentIndex < cellSegments.length - 1
                              ? group.questions[questionIndexRef.current++]
                              : null;
                            const blockKey = `${group.id}-table-text-${rowIndex}-${cellIndex}-${segmentIndex}`;
                            return (
                              <span key={`${group.id}-table-fragment-${rowIndex}-${cellIndex}-${segmentIndex}`}>
                                {segment ? (
                                  <span
                                    ref={(node) => {
                                      textBlockRefs.current[blockKey] = node;
                                    }}
                                    data-highlight-text
                                    onMouseUp={(event) => handleTextBlockMouseUp(blockKey, event)}
                                  >
                                    {renderHighlightedText(blockKey, segment)}
                                  </span>
                                ) : null}
                                {question ? renderInlineCompletionAnswer(question, `${group.id}-table-answer-${question.id}`) : null}
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
      <div className="px-2 py-2">
        <div
          className="whitespace-pre-wrap font-sans text-foreground"
          style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
        >
          {segments.map((segment, index) => {
            const question = group.questions[index];
            return (
              <span key={`${group.id}-segment-${index}`}>
                <span
                  ref={(node) => {
                    textBlockRefs.current[`inline-completion-${group.id}-${index}`] = node;
                  }}
                  data-highlight-text
                  onMouseUp={(event) => handleTextBlockMouseUp(`inline-completion-${group.id}-${index}`, event)}
                  className="select-text"
                >
                  {renderHighlightedText(`inline-completion-${group.id}-${index}`, segment)}
                </span>
                {question ? renderInlineCompletionAnswer(question, `${group.id}-inline-answer-${question.id}`) : null}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  function renderReviewExplanation(reviewItem: NonNullable<typeof reviewItems[string]>) {
    if (!reviewItem.explanation) {
      return null;
    }

    return (
      <div 
        className="mt-2 group relative z-10"
        onMouseEnter={() => setExplanationHighlightQuote(reviewItem.explanationReference?.quote ?? null)}
        onMouseLeave={() => setExplanationHighlightQuote(null)}
      >
        <div className="inline-flex items-center gap-1.5 cursor-help rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:hover:bg-orange-900/50">
          <Lightbulb className="h-3.5 w-3.5" />
          <span>Explanation</span>
        </div>
        <div className="absolute left-0 top-full mt-2 hidden w-64 md:w-80 rounded-xl border border-border/50 bg-popover p-3 text-sm text-popover-foreground shadow-xl group-hover:block animate-in fade-in zoom-in-95 z-50">
          <p className="leading-relaxed">{reviewItem.explanation}</p>
          {reviewItem.explanationReference?.quote ? (
            <div className="mt-2 rounded bg-muted/50 p-2 text-xs italic text-muted-foreground border-l-2 border-orange-400">
              "{reviewItem.explanationReference.quote}"
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderQuestionControl(question: PreviewQuestion, group: PreviewGroup) {
    const reviewItem = isReviewMode ? reviewItems[question.id] : undefined;
    const formattedReviewCorrectAnswer = reviewItem
      ? (
          isMatching(question.type) || isWordBankCompletion(question.type)
            ? reviewItem.correctAnswers.map((answer) => formatMatchingAnswerForReview(answer, typedQuestionOptionLines(group, question, []), question.type)).join(", ")
            : reviewItem.correctAnswers.join(", ")
        )
      : "";

    if (isTfng(question.type) || isYnng(question.type)) {
      const options = isTfng(question.type)
        ? ["TRUE", "FALSE", "NOT GIVEN"]
        : ["YES", "NO", "NOT GIVEN"];

      return (
        <div className="space-y-0">
          {options.map((option) => {
            const selected = answers[question.id] === option;
            const isCorrectOption = Boolean(reviewItem?.correctAnswers?.includes(option));
            const isIncorrectSelected = Boolean(reviewItem && selected && !isCorrectOption);
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (hasActiveSelection()) return;
                  setActiveQuestionId(question.id);
                  persistAnswer(question.id, option);
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2 text-left transition duration-150",
                  isReviewMode && isCorrectOption && "text-emerald-700 dark:text-emerald-400",
                  isReviewMode && isIncorrectSelected && "text-red-700 dark:text-red-400",
                  "bg-transparent hover:bg-transparent"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                    theme === "light"
                      ? isReviewMode && isCorrectOption
                        ? "border-emerald-600 text-emerald-600"
                        : isReviewMode && isIncorrectSelected
                          ? "border-red-600 text-red-600"
                          : selected
                        ? "border-slate-900 text-slate-900"
                        : "border-slate-400/85 text-transparent"
                      : isReviewMode && isCorrectOption
                        ? "border-emerald-400 text-emerald-400"
                        : isReviewMode && isIncorrectSelected
                          ? "border-red-400 text-red-400"
                          : selected
                        ? "border-slate-200 text-slate-200"
                        : "border-slate-500/85 text-transparent"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full bg-current transition", selected ? "opacity-100" : "opacity-0")} />
                </span>
                <span
                  className="font-sans text-foreground"
                  style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                >
                  {option}
                </span>
              </button>
            );
          })}
          {isReviewMode && reviewItem && !reviewItem.isCorrect && formattedReviewCorrectAnswer ? (
            <p className="px-2 pt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Correct answer: {formattedReviewCorrectAnswer}
            </p>
          ) : null}
          {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem) : null}
        </div>
      );
    }

    if (isMcq(question.type) && !isMcqMultiple(question.type)) {
      return (
        <div className="space-y-0">
          {(question.options ?? []).map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            const checked = answers[question.id] === optionLetter;
            const isCorrectOption = Boolean(reviewItem?.correctAnswers?.includes(optionLetter));
            const isIncorrectSelected = Boolean(reviewItem && checked && !isCorrectOption);
            return (
              <button
                key={`${question.id}-${optionLetter}`}
                type="button"
                onClick={() => {
                  if (hasActiveSelection()) return;
                  setActiveQuestionId(question.id);
                  persistAnswer(question.id, optionLetter);
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2 text-left transition duration-150",
                  isReviewMode && isCorrectOption && "text-emerald-700 dark:text-emerald-400",
                  isReviewMode && isIncorrectSelected && "text-red-700 dark:text-red-400",
                  "bg-transparent hover:bg-transparent"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                    checked
                      ? isReviewMode && isCorrectOption
                        ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                        : isReviewMode && isIncorrectSelected
                          ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
                          : "border-slate-900 text-slate-900 dark:border-slate-200 dark:text-slate-200"
                      : "border-slate-400/85 text-transparent dark:border-slate-500/85"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full bg-current transition", checked ? "opacity-100" : "opacity-0")} />
                </span>
                <span
                  ref={(node) => {
                    textBlockRefs.current[`question-option-${question.id}-${optionLetter}`] = node;
                  }}
                  data-highlight-text
                  onMouseUp={(event) => handleTextBlockMouseUp(`question-option-${question.id}-${optionLetter}`, event)}
                  className={cn("select-text font-sans text-foreground transition-colors", checked && "text-slate-950 dark:text-slate-50")}
                  style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                >
                  <span className="mr-2 font-black">{optionLetter}.</span>
                  {renderHighlightedText(`question-option-${question.id}-${optionLetter}`, option)}
                </span>
              </button>
            );
          })}
          {isReviewMode && reviewItem && !reviewItem.isCorrect && formattedReviewCorrectAnswer ? (
            <p className="px-2 pt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Correct answer: {formattedReviewCorrectAnswer}
            </p>
          ) : null}
          {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem) : null}
        </div>
      );
    }

    if (isMcqMultiple(question.type)) {
      const maxSelections = mcMultipleQuestionWeight(question);
      const selectedCount = (answers[question.id] ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .length;
      return (
        <div className="space-y-0">
          {(question.options ?? []).map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            const checked = hasMultiValue(answers[question.id], optionLetter);
            const disabled = !checked && selectedCount >= maxSelections;
            const isCorrectOption = Boolean(reviewItem?.correctAnswers?.includes(optionLetter));
            const isIncorrectSelected = Boolean(reviewItem && checked && !isCorrectOption);

            return (
              <button
                key={`${question.id}-${optionLetter}`}
                type="button"
                onClick={() => {
                  if (hasActiveSelection()) return;
                  if (disabled) return;
                  setActiveQuestionId(question.id);
                  persistAnswer(question.id, toggleMultiValue(answers[question.id], optionLetter, maxSelections));
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2 text-left transition duration-150",
                  isReviewMode && isCorrectOption && "bg-emerald-500/10",
                  isReviewMode && isIncorrectSelected && "bg-red-500/10",
                  disabled && "opacity-70",
                  disabled
                    ? "bg-card"
                    : "bg-card hover:bg-muted/20"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition",
                    checked
                      ? isReviewMode && isCorrectOption
                        ? "border-transparent bg-emerald-600 dark:bg-emerald-400"
                        : isReviewMode && isIncorrectSelected
                          ? "border-transparent bg-red-600 dark:bg-red-400"
                          : "border-transparent bg-slate-950 dark:bg-slate-50"
                      : disabled
                        ? "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70"
                        : "border-slate-500 bg-background dark:border-slate-400 dark:bg-transparent"
                  )}
                >
                  {checked ? <Check className="h-3.5 w-3.5 text-white dark:text-slate-950" strokeWidth={3.25} /> : null}
                </span>
                <span
                  ref={(node) => {
                    textBlockRefs.current[`question-option-${question.id}-${optionLetter}`] = node;
                  }}
                  data-highlight-text
                  onMouseUp={(event) => handleTextBlockMouseUp(`question-option-${question.id}-${optionLetter}`, event)}
                  className={cn(
                    "select-text font-sans text-foreground transition-colors",
                    disabled && "text-muted-foreground"
                  )}
                  style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                >
                  <span className="mr-2 font-black">{optionLetter}.</span>
                  {option}
                </span>
              </button>
            );
          })}
          {isReviewMode && reviewItem && !reviewItem.isCorrect && formattedReviewCorrectAnswer ? (
            <p className="px-2 pt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Correct answer: {formattedReviewCorrectAnswer}
            </p>
          ) : null}
          {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem) : null}
        </div>
      );
    }

    if (isMatching(question.type)) {
      const isMatchingInformation = question.type.includes("matching_information");
      const isMatchingFeatures = question.type.includes("matching_features");
      const isListeningMatching = question.type.includes("listening_matching");
      const isInlineMatching = isMatchingInformation || isMatchingFeatures || isListeningMatching;
      const sectionKey = group.sectionId ?? group.sectionLabel ?? "section";
      const matchingInformationOptions = matchingInformationParagraphOptions.get(sectionKey) ?? [];
      const matchingOptions = typedQuestionOptionLines(group, question, matchingInformationOptions);
      const matchingOptionViews = matchingOptions.map((option, index) => typedOptionView(option, index, question.type));
      const normalizedMatchingValue = normalizeMatchingAnswerValue(
        answers[question.id] ?? "",
        matchingOptions,
        question.type
      );
      const activeMatchingOption = matchingOptionViews.find((option) => option.value === normalizedMatchingValue) ?? null;

      if (matchingOptions.length === 0) {
        return (
          <div className={cn(
            isMatchingInformation
              ? "min-w-[150px] max-w-[180px] flex-none"
              : isMatchingFeatures
                ? "min-w-[150px] max-w-[210px] flex-none"
                : isListeningMatching
                  ? "min-w-[160px] max-w-[220px] flex-none"
                  : "pl-12"
          )}>
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground">
              Options not configured
            </div>
          </div>
        );
      }

      if (isListeningMatching) {
        return (
          <div className="min-w-[132px] max-w-[168px] flex-none space-y-1">
            <button
              type="button"
              data-question-anchor={question.id}
              data-wordbank-drop-question-id={question.id}
              data-wordbank-drop-group-id={group.id}
              onClick={() => setActiveQuestionId(question.id)}
              onPointerDown={(event) => {
                if (!activeMatchingOption) {
                  return;
                }
                beginWordBankPointerDrag(event, {
                  groupId: group.id,
                  value: activeMatchingOption.value,
                  sourceQuestionId: question.id,
                  previewLabel: activeMatchingOption.label,
                });
              }}
              className={cn(
                "flex h-8 w-full items-center rounded-xl border-2 border-dashed border-slate-400/90 bg-card px-3 text-left text-sm font-semibold text-foreground shadow-none transition dark:border-slate-400/85",
                dragOverWordBankQuestionId === question.id && "border-primary/80 bg-primary/10",
                isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500/90 bg-emerald-500/10 dark:border-emerald-400/85",
                isReviewMode && reviewItem?.isCorrect === false && "border-red-500/90 bg-red-500/10 dark:border-red-400/85",
                activeMatchingOption ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                activeQuestionId === question.id && activeInputClass
              )}
            >
              <span className={cn("truncate", !activeMatchingOption && "opacity-0")}>
                {activeMatchingOption ? activeMatchingOption.label : "\u00A0"}
              </span>
            </button>
            {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formattedReviewCorrectAnswer}
              </p>
            ) : null}
            {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem) : null}
          </div>
        );
      }

      return (
          <div className={cn(
            isMatchingInformation
              ? "min-w-[120px] max-w-[156px] flex-none"
              : isMatchingFeatures
                ? "min-w-[220px] max-w-[300px] flex-none"
                : "pl-12"
          )}>
          <div className={cn(
            "relative",
            isMatchingInformation
              ? "max-w-[156px]"
              : isMatchingFeatures
                ? "max-w-[300px]"
                : "max-w-md"
          )}>
            <select
              value={normalizedMatchingValue}
              onChange={(event) => persistAnswer(question.id, event.target.value)}
              className={cn(
                "flex w-full appearance-none items-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground shadow-none outline-none transition whitespace-nowrap overflow-hidden text-ellipsis",
                isMatchingInformation
                  ? "h-8 px-3 pr-8"
                  : isMatchingFeatures
                    ? "h-8 px-3 pr-8"
                    : "h-9 px-4 pr-10",
                theme === "light"
                  ? "focus:border-[#2f436f]"
                  : "focus:border-primary/45"
              )}
            >
              <option value="">Select answer</option>
              {matchingOptions.map((option, index) => {
                const optionView = typedOptionView(option, index, question.type);
                const shouldShowLabel =
                  !question.type.includes("matching_headings") && shouldAutoLetterMatchingOptions(question.type);
                return (
                  <option key={`${question.id}-matching-${index}`} value={optionView.value}>
                    {question.type.includes("matching_headings")
                      ? optionView.text || optionView.label
                      : shouldShowLabel
                        ? optionView.label
                        : optionView.value}
                  </option>
                );
              })}
            </select>
            <ChevronDown className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
              isInlineMatching ? "right-2 h-3.5 w-3.5" : "right-3 h-4 w-4"
            )} />
          </div>
        </div>
      );
    }

    if (isWordBankCompletion(question.type)) {
      const wordBankOptions = group.secondaryBlock?.trim()
        ? splitOptionLines(group.secondaryBlock)
        : normalizeOptionList(group.sharedOptions ?? question.options ?? []);

      return (
        <div className="pl-12 space-y-1">
          <div className="relative max-w-xl">
            <select
              value={answers[question.id] ?? ""}
              onChange={(event) => persistAnswer(question.id, event.target.value)}
              className={cn(
                "flex h-10 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 pr-10 text-sm font-semibold text-foreground shadow-none outline-none transition whitespace-nowrap overflow-hidden text-ellipsis",
                isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400",
                isReviewMode && reviewItem?.isCorrect === false && "border-red-500 bg-red-500/10 dark:border-red-400",
                theme === "light"
                  ? "focus:border-[#2f436f]"
                  : "focus:border-slate-400"
              )}
            >
              <option value="">Select word</option>
              {wordBankOptions.map((option, index) => {
                const label = optionText(option) || option;
                return (
                  <option key={`${question.id}-wordbank-${index}`} value={label}>
                    {label}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Correct answer: {formattedReviewCorrectAnswer}
            </p>
          ) : null}
          {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem) : null}
        </div>
      );
    }

    if (isPlanMapLabeling(question.type)) {
      const mapOptions = typedQuestionOptionLines(group, question, []);
      const normalizedMapValue = normalizeMatchingAnswerValue(
        answers[question.id] ?? "",
        mapOptions,
        question.type
      );

      if (mapOptions.length > 0) {
        return (
          <div className="w-[188px] flex-none space-y-1">
            <div className="relative">
              <select
                value={normalizedMapValue}
                onChange={(event) => persistAnswer(question.id, event.target.value)}
                className={cn(
                  "flex h-10 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 pr-10 text-sm font-semibold text-foreground shadow-none outline-none transition whitespace-nowrap overflow-hidden text-ellipsis",
                  isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400",
                  isReviewMode && reviewItem?.isCorrect === false && "border-red-500 bg-red-500/10 dark:border-red-400",
                  theme === "light"
                    ? "focus:border-[#2f436f]"
                    : "focus:border-slate-400"
                )}
              >
                <option value=""></option>
                {mapOptions.map((option, index) => {
                  const optionView = typedOptionView(option, index, question.type);
                  return (
                    <option key={`${question.id}-map-${optionView.value}`} value={optionView.value}>
                      {optionView.value}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Correct answer: {formattedReviewCorrectAnswer}
              </p>
            ) : null}
            {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem) : null}
          </div>
        );
      }

      return (
        <div className="w-[188px] flex-none space-y-1">
          <Input
            value={answers[question.id] ?? ""}
            onFocus={() => setActiveQuestionId(question.id)}
            onChange={(event) => persistAnswer(question.id, event.target.value)}
            placeholder=""
            className={cn(
              "h-10 w-full rounded-xl border-border bg-card px-3 text-[15px] font-medium shadow-none",
              isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400",
              isReviewMode && reviewItem?.isCorrect === false && "border-red-500 bg-red-500/10 dark:border-red-400",
              inputFocusClass
            )}
            autoComplete="off"
            spellCheck="false"
          />
          {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Correct answer: {formattedReviewCorrectAnswer}
            </p>
          ) : null}
          {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem) : null}
        </div>
      );
    }

    if (isCompletion(question.type)) {
      return (
        <div className="pl-12 space-y-1">
          <Input
            value={answers[question.id] ?? ""}
            onFocus={() => setActiveQuestionId(question.id)}
            onChange={(event) => persistAnswer(question.id, event.target.value)}
            placeholder="Type your answer"
            className={cn(
              "h-10 w-full max-w-md rounded-xl border-border bg-card px-3 text-[15px] font-medium shadow-none",
              isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400",
              isReviewMode && reviewItem?.isCorrect === false && "border-red-500 bg-red-500/10 dark:border-red-400",
              inputFocusClass
            )}
            autoComplete="off"
            spellCheck="false"
          />
          {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Correct answer: {formattedReviewCorrectAnswer}
            </p>
          ) : null}
          {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem) : null}
        </div>
      );
    }

    return (
      <div className="pl-12 space-y-1">
        <Input
          value={answers[question.id] ?? ""}
          onFocus={() => setActiveQuestionId(question.id)}
          onChange={(event) => persistAnswer(question.id, event.target.value)}
          placeholder="Type your answer"
          className={cn(
            "h-10 w-full max-w-md rounded-xl border-border bg-card px-3 text-[15px] font-medium shadow-none",
            isReviewMode && reviewItem?.isCorrect === true && "border-emerald-500 bg-emerald-500/10 dark:border-emerald-400",
            isReviewMode && reviewItem?.isCorrect === false && "border-red-500 bg-red-500/10 dark:border-red-400",
            inputFocusClass
          )}
          autoComplete="off"
            spellCheck="false"
          />
          {isReviewMode && reviewItem?.isCorrect === false && formattedReviewCorrectAnswer ? (
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Correct answer: {formattedReviewCorrectAnswer}
            </p>
          ) : null}
          {isReviewMode && reviewItem ? renderReviewExplanation(reviewItem) : null}
        </div>
    );
  }

  return (
    <div
      data-lenis-prevent
      className={cn(
        "fixed inset-0 flex flex-col overflow-hidden font-sans text-foreground",
        theme === "light" ? "bg-[#FBFCFD]" : "bg-background"
      )}
      style={examToneStyle}
    >
      {(draggingHeading || draggingWordBank) && dragPreviewPosition ? (
        <div
          className="pointer-events-none fixed z-[95] -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragPreviewPosition.x, top: dragPreviewPosition.y }}
        >
          <div className="flex max-w-[28rem] items-start gap-3 rounded-xl border border-[#2f436f]/85 bg-background/96 px-3 py-2 shadow-[0_22px_55px_-26px_rgba(15,23,42,0.7)] backdrop-blur-md dark:border-[#89a4d8]/70 dark:bg-[#162033]/96 dark:shadow-[0_22px_55px_-26px_rgba(137,164,216,0.32)]">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#2f436f]/35 bg-[#2f436f]/[0.07] text-[#2f436f] dark:border-[#4b6498]/45 dark:bg-[#4b6498]/[0.12] dark:text-[#89a4d8]"
              aria-hidden="true"
            >
              <GripVertical className="h-4 w-4" />
            </span>
            {(() => {
              if (draggingWordBank) {
                return (
                  <span className="text-[15px] font-semibold leading-6 text-foreground">
                    {draggingWordBank.previewLabel ?? draggingWordBank.value}
                  </span>
                );
              }
              if (!draggingHeading) {
                return null;
              }
              const draggingOption = headingOptionLookup.get(`${draggingHeading.groupId}:${draggingHeading.value}`);
              if (!draggingOption) {
                return (
                  <span className="text-[15px] font-semibold leading-6 text-foreground">
                    {draggingHeading.value}
                  </span>
                );
              }
              return (
                <span className="text-[15px] font-semibold leading-6 text-foreground">
                  {draggingOption.text}
                </span>
              );
            })()}
          </div>
        </div>
      ) : null}

      {selectionToolbar ? (
        <div
          data-selection-toolbar
          className="fixed z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-2 py-1.5 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.7)] backdrop-blur-xl"
          style={{ top: selectionToolbar.top, left: selectionToolbar.left }}
        >
          <button
            type="button"
            onClick={applyHighlight}
            title="Highlight selected text"
            aria-label="Highlight selected text"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-300/85 text-slate-900 transition hover:bg-amber-300 dark:bg-[#5b4618]/70 dark:text-[#f2d28c] dark:hover:bg-[#6a531d]/78"
          >
            <Highlighter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={clearHighlight}
            title="Remove highlight"
            aria-label="Remove highlight"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {isCalculatingResults ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-[1.5rem] border border-border/80 bg-card px-6 py-5 text-center shadow-[0_40px_120px_-30px_rgba(15,23,42,0.55)]">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground/80" />
            <p className="text-sm font-semibold text-foreground">Calculating your results…</p>
          </div>
        </div>
      ) : null}

      {activeDialog ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-border/80 bg-card p-6 shadow-[0_40px_120px_-30px_rgba(15,23,42,0.55)]">
            <div className="mb-5 space-y-2">
              <Badge className={cn(
                "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-none",
                activeDialog === "submit"
                  ? unansweredCount > 0
                    ? "bg-red-500/10 text-red-400"
                    : "bg-slate-500/6 text-slate-500 dark:bg-slate-200/10 dark:text-slate-300"
                  : "bg-slate-500/6 text-slate-500 dark:bg-slate-200/10 dark:text-slate-300"
              )}>
                {activeDialog === "submit" ? (unansweredCount > 0 ? "Submission Warning" : "Ready To Submit") : "Leave Protection"}
              </Badge>
              <h3 className="text-xl font-black tracking-tight text-foreground">
                {activeDialog === "submit"
                  ? unansweredCount > 0
                    ? "You have unanswered questions"
                    : "Submit this reading test?"
                  : "Leave this reading test?"}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {activeDialog === "submit"
                  ? unansweredCount > 0
                    ? `You left ${unansweredCount} question${unansweredCount === 1 ? "" : "s"} unanswered. Do you want to submit your test anyway?`
                    : "All questions are answered. Submit now when you are ready to lock this mock attempt."
                  : "You are about to leave the split-screen exam preview. If you continue, your current answers in this mock session will be lost."}
              </p>
            </div>

            {activeDialog === "submit" && unansweredCount > 0 ? (
              <div className="mb-5 rounded-2xl border border-red-500/45 bg-red-500/8 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">Questions Left</p>
                <p className="mt-1 text-lg font-black text-red-300">
                  {unansweredCount} unanswered
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              {activeDialog === "submit" ? (
                <>
                  <Button
                    type="button"
                    className="rounded-xl border border-border bg-muted/35 px-4 text-sm font-semibold text-foreground hover:bg-muted/55 dark:border-slate-700 dark:bg-slate-800/75 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => setActiveDialog(null)}
                  >
                    Go back & finish
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted"
                    onClick={confirmSubmit}
                  >
                    Submit anyway
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted"
                    onClick={() => setActiveDialog(null)}
                  >
                    Stay In Test
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-red-500 px-4 text-sm font-black text-white hover:bg-red-400"
                    onClick={confirmLeave}
                  >
                    Leave Test
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <header className="z-40 shrink-0 border-b border-border/80 bg-background/95 text-foreground shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className={cn(
          "mx-auto grid min-h-[68px] max-w-[1800px] grid-cols-1 gap-3 px-4 py-3 lg:items-center lg:px-6",
          isSinglePaneListeningMode
            ? "lg:grid-cols-[auto_minmax(0,1fr)_auto]"
            : "lg:grid-cols-[1fr_auto_1fr]"
        )}>
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveDialog("leave")}
              className="flex h-10 items-center rounded-md transition hover:opacity-90"
              aria-label="Leave test"
              title="Leave test"
            >
              <img
                src={theme === "light" ? "/exam-logo-lightmode.svg" : "/exam-logo-darkmode.svg"}
                alt="PrimeScore"
                className="h-8 w-auto"
              />
            </button>
            <div className="min-w-0 border-l border-border pl-3">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Test Taker</p>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 flex-none items-center justify-center",
                    syncState === "error"
                      ? "text-red-500"
                      : syncState === "saving"
                        ? "text-primary animate-pulse"
                        : "text-primary"
                  )}
                  title={
                    syncState === "error"
                      ? "Save failed"
                      : syncState === "saving"
                        ? "Saving changes"
                        : "Saved"
                  }
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <path
                      d="M6.5 18.25C4.01 18.25 2 16.24 2 13.75C2 11.49 3.67 9.62 5.84 9.31C6.6 6.77 8.95 5 11.75 5C15.19 5 18 7.81 18 11.25V11.5H18.5C20.43 11.5 22 13.07 22 15C22 16.93 20.43 18.5 18.5 18.5H6.5V18.25Z"
                      className="stroke-current"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {syncState === "error" ? (
                      <path
                        d="M10.1 10.1L13.9 13.9M13.9 10.1L10.1 13.9"
                        className="stroke-current"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : syncState === "saving" ? (
                      <path
                        d="M8.5 13.1L10.2 14.8L13.1 11.9"
                        className="stroke-current"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.6"
                      />
                    ) : (
                      <path
                        d="M8.5 13.1L10.2 14.8L13.1 11.9"
                        className="stroke-emerald-500"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </span>
                <p className="truncate text-sm font-semibold text-foreground">{candidateName}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            {isSinglePaneListeningMode && currentSection?.audioUrl ? (
              <ListeningWaveformPlayer
                audioRef={listeningAudioRef}
                src={currentSection.audioUrl}
                className="w-full max-w-[44rem]"
              />
            ) : (
              <div
                className={cn(
                  "px-2 text-center transition-all",
                  isLastMinute && "animate-[pulse_2.4s_ease-in-out_infinite]"
                )}
              >
                <p
                  className={cn(
                    "text-[15px] font-bold leading-none",
                    isLastFiveMinutes
                      ? "font-mono tracking-[0.18em] text-red-400 dark:text-red-300"
                      : "tracking-[0.04em] text-foreground"
                  )}
                >
                  {timerDisplay}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className={cn("h-9 w-9 rounded-xl p-0", headerControlClass)}
              onClick={() => updateTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
              className={cn("h-9 w-9 rounded-xl p-0", headerControlClass)}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Shrink className="h-[18px] w-[18px]" /> : <Expand className="h-[18px] w-[18px]" />}
            </Button>
            <div className={cn("flex items-center rounded-xl p-0.5 shadow-inner", headerControlClass)}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-foreground hover:bg-muted"
                onClick={() => setFontScale((current) => Math.max(0.9, Number((current - 0.05).toFixed(2))))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="px-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{Math.round(fontScale * 100)}%</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-foreground hover:bg-muted"
                onClick={() => setFontScale((current) => Math.min(1.2, Number((current + 0.05).toFixed(2))))}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {!isReviewMode ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitted || isSubmitting}
                className={cn(
                  "h-8 rounded-xl px-3 text-[11px] font-semibold uppercase tracking-[0.12em]",
                  theme === "dark"
                    ? "border border-slate-400 bg-slate-300 text-slate-950 hover:bg-slate-200"
                    : "border border-border bg-muted/45 text-slate-700 hover:bg-muted/70"
                )}
              >
                {isSubmitted ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <SendHorizontal className="mr-1.5 h-3.5 w-3.5" />}
                {isSubmitting ? "Submitting" : isSubmitted ? "Submitted" : "Submit"}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main
        ref={containerRef}
        style={layoutStyle}
        className="relative mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col overflow-hidden lg:flex-row"
      >
        {!isSinglePaneListeningMode ? (
        <section
          className={cn(
            "min-h-0 flex-1 overflow-hidden border-b border-border/70 lg:flex lg:w-[var(--reading-pane)] lg:flex-none lg:flex-col lg:border-b-0 lg:border-r lg:border-border/80",
            theme === "light" ? "bg-[#FBFCFD]" : "bg-card/40"
          )}
        >
          <div
            ref={readingPaneRef}
            data-lenis-prevent
            data-lenis-prevent-wheel
            onWheelCapture={handlePaneWheel}
            className="h-full min-h-0 overflow-y-auto px-5 py-4 overscroll-contain lg:flex-1 lg:px-8 lg:py-5"
            style={{ scrollbarGutter: "stable" }}
          >
            <div className="mb-3">
              {isAttemptPreview ? null : (
                <div className="space-y-2">
                  <h1 className="text-3xl font-black tracking-tight text-foreground">{examData.title}</h1>
                  <p className="max-w-3xl text-sm font-medium text-muted-foreground">
                    {examData.subtitle}
                  </p>
                </div>
              )}
            </div>

            <article className="space-y-5">
              {currentSection?.audioUrl ? (
                <div className="rounded-[1.4rem] border border-border/75 bg-card/70 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">
                  {isListeningPreview && isReviewMode ? (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant={showListeningTranscript ? "solid" : "outline"}
                        size="sm"
                        className="h-8 rounded-xl px-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
                        onClick={() => setShowListeningTranscript((current) => !current)}
                      >
                        {showListeningTranscript ? "Hide Transcript" : "Open Transcript"}
                      </Button>
                      {currentTranscriptQuestionLocations.length > 0 ? (
                        <Button
                          type="button"
                          variant={showTranscriptAnswerLocations ? "solid" : "outline"}
                          size="sm"
                          aria-label={showTranscriptAnswerLocations ? "Hide answer locations" : "Show answer locations"}
                          title={showTranscriptAnswerLocations ? "Hide answer locations" : "Show answer locations"}
                          className="h-8 w-8 rounded-xl p-0"
                          disabled={!showListeningTranscript}
                          onClick={() => setShowTranscriptAnswerLocations((current) => !current)}
                        >
                          <Lightbulb className={cn("h-4 w-4", showTranscriptAnswerLocations && "fill-current")} />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  <audio
                    ref={listeningAudioRef}
                    controls
                    preload="metadata"
                    controlsList="nodownload noplaybackrate"
                    onContextMenu={(event) => event.preventDefault()}
                    className="w-full"
                    src={currentSection.audioUrl}
                  />
                </div>
              ) : null}

              {isListeningPreview && showListeningTranscript && currentTranscriptSegments.length > 0 ? (
                <ListeningTranscriptPanel
                  audioRef={listeningAudioRef}
                  segments={currentTranscriptSegments}
                  questionLocations={currentTranscriptQuestionLocations}
                  showAnswerLocations={showTranscriptAnswerLocations}
                />
              ) : null}

              {(!isListeningPreview || (showListeningTranscript && currentTranscriptSegments.length === 0)) && currentParagraphs.length > 0 ? currentParagraphs.map((paragraph, paragraphIndex) => {
                const paragraphStyle = parsePassageBlockStyle(paragraph.text);
                const passageBlockKey = `passage-${sectionKeyForParagraph(paragraph)}-${paragraph.paragraphKey}`;

                return (
                  <div key={`${paragraph.label ?? paragraphIndex}`} className="px-1 py-1">
                    {paragraph.sectionPreviewLabel ? (
                      <div className="mb-3 space-y-1">
                        <p className="text-lg font-semibold text-foreground">
                          {renderFormattedText(paragraph.sectionPreviewLabel, `section-label-${paragraph.sectionId ?? paragraph.paragraphKey}`)}
                        </p>
                        {paragraph.sectionIntro ? (
                          <p className="border-l-2 border-primary/40 py-0.5 pl-3 text-sm font-medium italic leading-relaxed text-muted-foreground">
                            {renderFormattedText(paragraph.sectionIntro, `section-intro-${paragraph.sectionId ?? paragraph.paragraphKey}`)}
                          </p>
                        ) : null}
                        {paragraph.sectionTitle ? (
                          <h2 className="pt-1 text-center text-2xl font-semibold tracking-tight text-foreground">
                            {renderFormattedText(paragraph.sectionTitle, `section-title-${paragraph.sectionId ?? paragraph.paragraphKey}`)}
                          </h2>
                        ) : null}
                      </div>
                    ) : null}
                    {renderMatchingHeadingDropArea(paragraph)}
                    <p
                      ref={(node) => {
                        textBlockRefs.current[passageBlockKey] = node;
                      }}
                      data-highlight-text
                      onMouseUp={(event) => handleTextBlockMouseUp(passageBlockKey, event)}
                      className={cn(
                        "select-text font-sans text-foreground",
                        paragraphStyle.center && "text-center",
                        paragraphStyle.italic && "italic",
                        paragraphStyle.bold && "font-bold"
                      )}
                      style={{
                        fontSize: `${bodyFontSize}px`,
                        lineHeight: 1.5,
                      }}
                    >
                      {paragraph.label ? (
                        <span className="mr-3 inline-flex min-w-9 items-center justify-center rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 align-[0.08em] text-sm font-black leading-none text-foreground">
                          {paragraph.label}
                        </span>
                      ) : null}
                      {renderHighlightedText(passageBlockKey, paragraphStyle.text)}
                    </p>
                  </div>
                );
              }) : null}
            </article>
          </div>
        </section>
        ) : null}

        <section
          className={cn(
            "min-h-0 flex-1 overflow-hidden lg:flex lg:flex-col",
            isSinglePaneListeningMode || (isReviewMode && isListeningPreview) ? "lg:w-full lg:flex-1" : "lg:w-[var(--question-pane)] lg:flex-none",
            theme === "light" ? "bg-[#FBFCFD]" : "bg-muted/15"
          )}
        >
          <div
            ref={questionPaneRef}
            data-lenis-prevent
            data-lenis-prevent-wheel
            onWheelCapture={handlePaneWheel}
            className="h-full min-h-0 overflow-y-auto px-4 py-5 overscroll-contain lg:flex-1 lg:px-6 lg:py-6"
            style={{ scrollbarGutter: "stable" }}
          >
            <div className="space-y-8">
              {isSinglePaneListeningMode ? (
                <div className="space-y-4">
                  {isAttemptPreview ? null : (
                    <div className="space-y-2">
                      <h1 className="text-3xl font-black tracking-tight text-foreground">{examData.title}</h1>
                      <p className="max-w-3xl text-sm font-medium text-muted-foreground">
                        {examData.subtitle}
                      </p>
                    </div>
                  )}
                  {currentSection?.previewLabel ? (
                    <div className="space-y-2 rounded-2xl border border-border/75 bg-card/55 px-4 py-3">
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        {currentSection.previewLabel}
                      </h2>
                      {currentSection?.label ? (
                        <p className="border-l-2 border-primary/70 pl-3 text-sm font-medium leading-6 text-foreground">
                          {(() => {
                            const sectionQuestionNumbers = currentSection?.questions.map((question) => question.number) ?? [];
                            const sectionQuestionStart = sectionQuestionNumbers.length > 0 ? Math.min(...sectionQuestionNumbers) : null;
                            const sectionQuestionEnd = sectionQuestionNumbers.length > 0 ? Math.max(...sectionQuestionNumbers) : null;
                            return sectionQuestionStart !== null && sectionQuestionEnd !== null
                              ? `${currentSection.label}. Questions ${sectionQuestionStart}-${sectionQuestionEnd}.`
                              : `${currentSection.label}.`;
                          })()}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {isListeningPreview && showListeningTranscript && currentTranscriptSegments.length > 0 ? (
                    <ListeningTranscriptPanel
                      audioRef={listeningAudioRef}
                      segments={currentTranscriptSegments}
                      questionLocations={currentTranscriptQuestionLocations}
                      showAnswerLocations={showTranscriptAnswerLocations}
                    />
                  ) : null}
                </div>
              ) : null}
              {currentQuestionGroups.map((group, groupIndex) => (
                <div key={group.id} className="rounded-none border-0 bg-transparent p-0 pl-4 shadow-none md:pl-6">
                  {(() => {
                    const isListeningMatchingGroup = group.type.includes("listening_matching");
                    const isPlanMapGroup = group.type.includes("plan_map_labeling");
                    return (
                      <>
                  <div className="border-l-2 border-primary/70 pl-3">
                    <p className="text-base font-black tracking-tight text-foreground">
                      {questionRangeLabelForGroup(group)}
                    </p>
                    <div
                      ref={(node) => {
                        textBlockRefs.current[`group-instruction-${group.id}`] = node;
                      }}
                      data-highlight-text
                      onMouseUp={(event) => handleTextBlockMouseUp(`group-instruction-${group.id}`, event)}
                      className="mt-2.5 whitespace-pre-wrap select-text text-[15px] font-medium leading-7 text-foreground md:text-base"
                      style={{ fontSize: `${Math.max(bodyFontSize + 1, 16)}px`, lineHeight: 1.6 }}
                    >
                      {renderInstructionText(`group-instruction-${group.id}`, group.instruction)}
                    </div>
                  </div>

                  <div className={cn(
                    "mt-5 px-0 py-2",
                    isListeningMatchingGroup ? "flex items-start gap-2" : "space-y-4"
                  )}>
                    <div className={cn(
                      "min-w-0",
                      isListeningMatchingGroup ? "w-[28rem] shrink-0 space-y-4" : "space-y-4"
                    )}>
                    {shouldRenderCustomGroupTitle(group) ? (
                      <div className="px-2">
                        <h2 className="text-center text-[17px] font-bold tracking-tight text-foreground md:text-[19px]">
                          {renderFormattedText(group.title, `group-title-${group.id}`)}
                        </h2>
                      </div>
                    ) : null}
                    {isPlanMapGroup ? (
                      <div className="grid gap-3 lg:grid-cols-[560px_312px] lg:items-start lg:justify-start">
                        <div className="min-w-0 w-[560px] justify-self-start">
                          {renderDiagramBlock(group)}
                        </div>
                        <div className="min-w-0 justify-self-start space-y-3 lg:self-center">
                          {renderGroupQuestionList(group)}
                        </div>
                      </div>
                    ) : (
                      <>
                        {renderDiagramBlock(group)}
                        {!isListeningMatchingGroup ? renderOptionBank(group) : null}
                        {renderGroupQuestionList(group)}
                      </>
                    )}
                    </div>
                    {isListeningMatchingGroup ? (
                      <div
                        className="shrink-0"
                        style={{ width: optionBankWidthForGroup(group) }}
                      >
                        {renderOptionBank(group)}
                      </div>
                    ) : null}
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </section>

        {!isSinglePaneListeningMode ? (
          <div
            className="pointer-events-none absolute inset-y-0 z-20 hidden lg:flex"
            style={{ left: `calc(${splitRatio}% - 18px)` }}
          >
            <div className="relative flex w-9 items-center justify-center">
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/80" />
              <button
                type="button"
                aria-label="Adjust split layout"
                onPointerDown={startSplitDrag}
                className={cn(
                  "pointer-events-auto relative flex h-8 w-8 cursor-ew-resize items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_10px_28px_-18px_rgba(15,23,42,0.65)] transition hover:bg-muted hover:text-foreground",
                  isDraggingSplit && "border-primary/40 bg-primary/10 text-primary"
                )}
              >
                <MoveHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="z-30 shrink-0 border-t border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto max-w-[1800px] px-4 py-2 lg:px-6">
          <div className="flex w-full flex-col gap-2">
            <div className="flex min-h-[2.25rem] items-center justify-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {previewSections.length > 1 ? (
                <div className="flex w-full items-stretch gap-0">
                  {previewSections.map((section, index) => {
                    const sectionAnsweredCount = section.questions.reduce(
                      (count, question) => count + answeredQuestionWeight(question, answers[question.id]),
                      0
                    );
                    const sectionTotalQuestions = section.questions.reduce(
                      (count, question) => count + (isMcqMultiple(question.type) ? mcMultipleQuestionWeight(question) : 1),
                      0
                    );
                    const active = section.id === currentSection?.id;
                    const completed = sectionAnsweredCount === sectionTotalQuestions;

                    return (
                      <div
                        key={section.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectSection(section.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectSection(section.id);
                          }
                        }}
                        className={cn(
                          "min-w-0 cursor-pointer px-3 py-2 transition",
                          active ? "flex-[2.2]" : "flex-1",
                          active
                            ? completed
                              ? "bg-emerald-500/10 text-foreground"
                              : "bg-card text-foreground"
                            : completed
                              ? "bg-emerald-500/8 text-foreground hover:bg-emerald-500/12"
                              : "bg-card/55 text-foreground hover:bg-muted/40"
                        )}
                      >
                        <div className={cn("flex items-center gap-3", active && showPassageQuestionNav ? "justify-between" : "justify-center")}>
                          <div className="flex min-w-0 shrink-0 items-center gap-2 text-left">
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                                completed
                                  ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-500"
                                  : "border-transparent bg-transparent text-transparent"
                              )}
                            >
                              {completed ? <Check className="h-3.5 w-3.5" /> : null}
                            </span>
                            <span className="text-[14px] font-semibold text-foreground whitespace-nowrap">
                              {section.label ?? `Passage ${index + 1}`}
                            </span>
                            <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                              {sectionAnsweredCount} of {sectionTotalQuestions}
                            </span>
                          </div>

                        {active && showPassageQuestionNav ? (
                          <div className="flex min-w-0 flex-1 items-center justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <div className="flex min-w-max items-center gap-1">
                            {section.questions.map((question) => {
                              const answered = isQuestionFullyAnswered(question, answers[question.id]);
                              const questionActive = activeQuestionId === question.id;
                              const navLabel = question.label ?? String(question.number);
                              const isRangeLabel = String(navLabel).includes("-");

                              return (
                                <button
                                  key={question.id}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigateToQuestion(question.id);
                                  }}
                                  className={cn(
                                    "flex h-7 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-0 transition",
                                    isRangeLabel ? "min-w-[42px]" : "min-w-[30px]",
                                    questionActive
                                      ? "border-slate-900/45 bg-transparent text-slate-900 dark:border-slate-100/35 dark:text-slate-100"
                                      : answered
                                        ? "border-transparent bg-transparent text-foreground"
                                        : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/35"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "mb-0.5 h-1 rounded-full transition",
                                      isRangeLabel ? "w-8" : "w-3.5",
                                      answered ? "bg-emerald-500" : "bg-transparent"
                                    )}
                                  />
                                  <span className="text-[12px] font-bold leading-none whitespace-nowrap text-current">{navLabel}</span>
                                </button>
                              );
                            })}
                            </div>
                          </div>
                        ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[2.25rem] w-full items-center justify-center gap-3">
                  <div className="flex shrink-0 items-center gap-1.5 pr-1">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border",
                        currentAnsweredCount === currentTotalQuestions
                          ? "border-emerald-500/45 text-emerald-500"
                          : "border-primary/35 text-primary"
                      )}
                    >
                      {currentAnsweredCount === currentTotalQuestions ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span className="whitespace-nowrap text-[14px] font-semibold tracking-tight text-foreground">{currentSection?.label ?? examData.partLabel}</span>
                    <span className="whitespace-nowrap text-[13px] font-medium text-muted-foreground">{currentAnsweredCount} of {currentTotalQuestions}</span>
                  </div>

                  <div className="flex min-w-0 max-w-full items-center justify-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex min-w-max items-center gap-px">
                      {currentQuestions.map((question) => {
                        const answered = isQuestionFullyAnswered(question, answers[question.id]);
                        const active = activeQuestionId === question.id;
                        const navLabel = question.label ?? String(question.number);
                        const isRangeLabel = String(navLabel).includes("-");

                        return (
                          <button
                            key={question.id}
                            type="button"
                            onClick={() => navigateToQuestion(question.id)}
                            className={cn(
                              "flex h-7 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-0 transition",
                              isRangeLabel ? "min-w-[42px]" : "min-w-[30px]",
                              active
                                ? "border-slate-900/45 bg-transparent text-slate-900 dark:border-slate-100/35 dark:text-slate-100"
                                : answered
                                  ? "border-transparent bg-transparent text-foreground"
                                  : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/35"
                            )}
                          >
                            <span
                              className={cn(
                                "mb-0.5 h-1 rounded-full transition",
                                isRangeLabel ? "w-8" : "w-3.5",
                                answered
                                  ? "bg-emerald-500"
                                  : "bg-transparent"
                              )}
                            />
                            <span className="text-[12px] font-bold leading-none whitespace-nowrap text-current">{navLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
