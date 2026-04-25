"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, ChevronDown, Eraser, Expand, GripVertical, Highlighter, Minus, Moon, MoveHorizontal, Plus, SendHorizontal, Shrink, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

type PreviewMode = "practice" | "exam";
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
  sectionLabel?: string;
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
  sectionLabel?: string;
  questionBlock?: string;
  secondaryBlock?: string;
  sharedOptions?: string[];
  questions: PreviewQuestion[];
}

export interface ReadingExamPreviewData {
  attemptId?: string;
  exitHref?: string;
  title: string;
  subtitle: string;
  partLabel: string;
  timeLimitSeconds?: number;
  paragraphs: PreviewParagraph[];
  questionGroups: PreviewGroup[];
  initialAnswers?: Record<string, string>;
  initialTextHighlights?: Record<string, TextHighlight[]>;
  initialTimeSpentSeconds?: number;
  initialUiState?: PreviewUiState;
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

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutesLeft(totalSeconds: number) {
  const minutesLeft = Math.max(1, Math.ceil(totalSeconds / 60));
  return `${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`;
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

function paragraphLabelFromPrompt(prompt: string) {
  const match = prompt.trim().match(/paragraph\s+([a-z])/i);
  return match ? match[1].toUpperCase() : null;
}

function usesBracketCompletionLayout(type: PreviewGroup["type"]) {
  return (
    type.includes("sentence_completion")
    || type.includes("note_completion")
    || type.includes("table_completion")
    || type.includes("flowchart_completion")
    || type.includes("summary_completion")
  );
}

function splitOptionLines(block?: string) {
  return (block ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function optionValue(option: string) {
  const match = option.match(/^([A-Za-z0-9ivxIVX]+)[.)]\s*(.*)$/);
  return match ? match[1] : option;
}

function optionText(option: string) {
  const match = option.match(/^([A-Za-z0-9ivxIVX]+)[.)]\s*(.*)$/);
  return match ? match[2] : option;
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
function parseBraceBoldText(text: string) {
  const boldRanges: TextRange[] = [];
  const bulletLineIndexes = new Set<number>();
  let plainText = "";

  text.split("\n").forEach((rawLine, lineIndex, lines) => {
    const isBulletLine = /^\s*\*/.test(rawLine);
    const line = rawLine.replace(/^\s*\*\s?/, "");
    if (isBulletLine) {
      bulletLineIndexes.add(lineIndex);
    }

    if (lineIndex > 0) {
      plainText += "\n";
    }

    let cursor = 0;
    while (cursor < line.length) {
      const openIndex = line.indexOf("{", cursor);
      if (openIndex === -1) {
        plainText += line.slice(cursor);
        break;
      }

      const closeIndex = line.indexOf("}", openIndex + 1);
      if (closeIndex === -1) {
        plainText += line.slice(cursor);
        break;
      }

      plainText += line.slice(cursor, openIndex);
      const boldStart = plainText.length;
      const boldContent = line.slice(openIndex + 1, closeIndex);
      plainText += boldContent;
      const boldEnd = plainText.length;

      if (boldEnd > boldStart) {
        boldRanges.push({ start: boldStart, end: boldEnd });
      }

      cursor = closeIndex + 1;
    }

    if (line.length === 0 && lineIndex < lines.length - 1) {
      plainText += "";
    }
  });

  return { plainText, boldRanges, bulletLineIndexes };
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

export function ReadingExamPreview({ mode, data }: { mode: PreviewMode; data?: ReadingExamPreviewData }) {
  const router = useRouter();
  const isAttemptPreview = Boolean(data?.attemptId);
  const candidateName = useAuthStore((state) => state.name) || "Guest Candidate";
  const containerRef = useRef<HTMLElement | null>(null);
  const questionPaneRef = useRef<HTMLDivElement | null>(null);
  const textBlockRefs = useRef<Record<string, HTMLElement | null>>({});
  const examData = data ?? DEFAULT_EXAM_DATA;
  const initialTimeSpentSeconds = Math.max(0, examData.initialTimeSpentSeconds ?? 0);
  const [answers, setAnswers] = useState<Record<string, string>>(examData.initialAnswers ?? {});
  const [theme, setTheme] = useState<"light" | "dark">(examData.initialUiState?.theme === "light" ? "light" : "dark");
  const [splitRatio, setSplitRatio] = useState(clampSplitRatio(examData.initialUiState?.splitRatio ?? 54));
  const [fontScale, setFontScale] = useState(clampFontScale(examData.initialUiState?.fontScale ?? 1));
  const [timeLeft, setTimeLeft] = useState(
    mode === "exam"
      ? Math.max(0, (examData.timeLimitSeconds ?? 20 * 60) - initialTimeSpentSeconds)
      : initialTimeSpentSeconds
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<PreviewDialog>(null);
  const [activeQuestionId, setActiveQuestionId] = useState(
    examData.initialUiState?.activeQuestionId ?? examData.questionGroups[0]?.questions[0]?.id ?? ""
  );
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [draggingHeading, setDraggingHeading] = useState<{ groupId: string; value: string; sourceQuestionId?: string } | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);
  const [dragOverHeadingBankGroupId, setDragOverHeadingBankGroupId] = useState<string | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [textHighlights, setTextHighlights] = useState<Record<string, TextHighlight[]>>(examData.initialTextHighlights ?? {});
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
  const headingDragStateRef = useRef<{
    startX: number;
    startY: number;
    groupId: string;
    value: string;
    sourceQuestionId?: string;
    dragging: boolean;
  } | null>(null);

  useEffect(() => {
    const fallbackTheme = document.documentElement.classList.contains("light") ? "light" : "dark";
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
    const nextTheme = (shouldUseBackup ? backup?.uiState?.theme : undefined) ?? examData.initialUiState?.theme ?? fallbackTheme;
    const nextAnswers = shouldUseBackup && backupAnswerCount > 0 ? { ...serverAnswers, ...backupAnswers } : serverAnswers;
    const nextTextHighlights = shouldUseBackup && backupHighlightCount > 0 ? { ...serverHighlights, ...backupHighlights } : serverHighlights;
    const nextSplitRatio = clampSplitRatio((shouldUseBackup ? backup?.uiState?.splitRatio : undefined) ?? examData.initialUiState?.splitRatio ?? 54);
    const nextFontScale = clampFontScale((shouldUseBackup ? backup?.uiState?.fontScale : undefined) ?? examData.initialUiState?.fontScale ?? 1);
    const nextActiveQuestionId = (shouldUseBackup ? backup?.uiState?.activeQuestionId : undefined) ?? examData.initialUiState?.activeQuestionId ?? examData.questionGroups[0]?.questions[0]?.id ?? "";
    const nextTimeSpentSeconds = shouldUseBackup ? Math.max(serverTimeSpentSeconds, backupTimeSpentSeconds) : serverTimeSpentSeconds;

    document.documentElement.classList.add(nextTheme);
    document.documentElement.classList.remove(nextTheme === "light" ? "dark" : "light");
    setTheme(nextTheme);
    setAnswers(nextAnswers);
    setTextHighlights(nextTextHighlights);
    setSplitRatio(nextSplitRatio);
    setFontScale(nextFontScale);
    setActiveQuestionId(nextActiveQuestionId);
    setTimeLeft(
      mode === "exam"
        ? Math.max(0, (examData.timeLimitSeconds ?? 20 * 60) - nextTimeSpentSeconds)
        : nextTimeSpentSeconds
    );
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
  }, [examData, mode]);

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

    const timer = window.setInterval(() => {
      setTimeLeft((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isSubmitted, mode]);

  useEffect(() => {
    if (timeLeft === 0 && mode === "exam" && !isSubmitted) {
      void submitAttempt();
    }
  }, [timeLeft, mode, isSubmitted]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => value.trim().length > 0).length,
    [answers]
  );
  const totalQuestions = useMemo(
    () => examData.questionGroups.reduce((count, group) => count + group.questions.length, 0),
    [examData.questionGroups]
  );
  const allQuestions = useMemo(() => examData.questionGroups.flatMap((group) => group.questions), [examData.questionGroups]);
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
  const headingOptionLookup = useMemo(() => {
    const lookup = new Map<string, { value: string; text: string }>();
    examData.questionGroups
      .filter((group) => group.type.includes("matching_headings"))
      .forEach((group) => {
        const options = group.secondaryBlock?.trim()
          ? splitOptionLines(group.secondaryBlock)
          : (group.sharedOptions ?? []);

        options.forEach((option) => {
          const value = optionValue(option);
          lookup.set(`${group.id}:${value}`, {
            value,
            text: optionText(option),
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
  const examToneStyle = (theme === "dark"
    ? {
        "--foreground": "210 14% 82%",
        "--card-foreground": "210 14% 82%",
        "--popover-foreground": "210 14% 82%",
        "--muted-foreground": "215 12% 66%",
      }
    : {}) as CSSProperties;
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
    if (!attemptBackupKey || typeof window === "undefined" || isSubmitted) {
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
    if (!examData.attemptId || isSubmitted) {
      return;
    }
    writeAttemptBackup();
  }, [answers, examData.attemptId, isSubmitted, textHighlights, theme, splitRatio, fontScale, activeQuestionId, timeLeft]);

  useEffect(() => {
    if (!examData.attemptId || isSubmitted) {
      return;
    }

    const handlePageHide = () => {
      writeAttemptBackup();
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [examData.attemptId, isSubmitted, answers, textHighlights, theme, splitRatio, fontScale, activeQuestionId, timeLeft]);

  async function persistProgressNow() {
    if (!examData.attemptId || isSubmitted) {
      return;
    }

    setSyncState("saving");
    try {
      const response = await fetch(`/api/attempts/${examData.attemptId}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeSpentSec: latestProgressRef.current.timeSpentSec,
          activeQuestionId: latestProgressRef.current.activeQuestionId,
          textHighlights: latestProgressRef.current.textHighlights,
          uiState: latestProgressRef.current.uiState,
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
    if (!examData.attemptId || isSubmitted) {
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
    if (!examData.attemptId) {
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
          const response = await fetch(`/api/attempts/${examData.attemptId}/answer`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              questionId,
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
    if (!examData.attemptId || isSubmitted) {
      return;
    }
    queueProgressPersist(700);
  }, [activeQuestionId, examData.attemptId, fontScale, isSubmitted, splitRatio, textHighlights, theme]);

  useEffect(() => {
    if (!examData.attemptId || isSubmitted) {
      return;
    }

    const timer = window.setInterval(() => {
      void persistProgressNow();
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [examData.attemptId, isSubmitted]);

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
    if (isSubmitted) return;
    setActiveDialog("submit");
  }

  function persistAnswer(questionId: string, value: string) {
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
        const response = await fetch(`/api/attempts/${examData.attemptId}/answer`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            questionId,
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
      const response = await fetch(`/api/attempts/${examData.attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, reason: mode === "exam" && timeLeft === 0 ? "time_up" : "user_confirmed" }),
      });
      if (!response.ok) {
        throw new Error("Submit failed");
      }
      clearAttemptBackup();
      allowLeaveRef.current = true;
      router.push(`/attempts/${examData.attemptId}/result`);
    } catch {
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

  function navigateToQuestion(questionId: string) {
    setActiveQuestionId(questionId);

    const inlineBlank = questionPaneRef.current?.querySelector<HTMLInputElement>(`[data-question-anchor="${questionId}"]`);
    if (inlineBlank) {
      inlineBlank.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => inlineBlank.focus(), 120);
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
  }, [isSubmitted]);

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

  function renderHighlightedText(blockKey: string, text: string) {
    const { plainText, boldRanges, bulletLineIndexes } = parseBraceBoldText(text);
    const highlights = (textHighlights[blockKey] ?? []).slice().sort((a, b) => a.start - b.start);

    function renderFormattedSlice(start: number, end: number, keyPrefix: string) {
      if (start >= end) {
        return null;
      }

      const parts: ReactNode[] = [];
      let cursor = start;
      const overlappingBoldRanges = boldRanges.filter((range) => range.end > start && range.start < end);

      overlappingBoldRanges.forEach((range, index) => {
        const segmentStart = Math.max(start, range.start);
        const segmentEnd = Math.min(end, range.end);

        if (cursor < segmentStart) {
          parts.push(
            <span key={`${keyPrefix}-plain-${index}-${cursor}`}>
              {plainText.slice(cursor, segmentStart)}
            </span>
          );
        }

        if (segmentStart < segmentEnd) {
          parts.push(
            <strong key={`${keyPrefix}-bold-${index}-${segmentStart}`} className="font-bold text-inherit">
              {plainText.slice(segmentStart, segmentEnd)}
            </strong>
          );
        }

        cursor = segmentEnd;
      });

      if (cursor < end) {
        parts.push(<span key={`${keyPrefix}-tail-${cursor}`}>{plainText.slice(cursor, end)}</span>);
      }

      if (parts.length === 0) {
        return plainText.slice(start, end);
      }

      return parts;
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
          parts.push(
            <mark
              key={`${highlight.id}-${segmentStart}-${segmentEnd}`}
              className="rounded-[0.25rem] bg-amber-300/65 px-[1px] text-inherit dark:bg-[#5b4618]/50 dark:ring-1 dark:ring-[#c9952f]/40"
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
            <span className="my-0.5 inline-flex max-w-full items-start gap-2 align-top">
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

  function renderOptionBank(group: PreviewGroup) {
    if (group.type.includes("matching_information")) {
      return null;
    }

    const baseOptions = group.secondaryBlock?.trim()
      ? splitOptionLines(group.secondaryBlock)
      : (group.sharedOptions ?? []);

    const selectedValues = group.type.includes("matching_headings")
      ? new Set(
          group.questions
            .map((question) => answers[question.id] ?? "")
            .filter(Boolean)
        )
      : new Set<string>();

    const bankOptions = group.type.includes("matching_headings")
      ? baseOptions.filter((option) => {
          const value = optionValue(option);
          return !selectedValues.has(value) || draggingHeading?.value === value;
        })
      : baseOptions;

    if (bankOptions.length === 0) {
      return null;
    }

    const isBankDropReady = draggingHeading?.groupId === group.id;

    return (
      <div
        data-heading-bank-group-id={group.id}
        className={cn(
          "max-w-[34rem] rounded-2xl border border-border/75 bg-background/70 p-4 transition",
          dragOverHeadingBankGroupId === group.id && isBankDropReady && "border-primary/50 bg-primary/5 shadow-sm"
        )}
      >
        <p
          className={cn(
            "mb-3 font-black uppercase tracking-[0.18em]",
            group.type.includes("matching_headings")
              ? "text-[13px] text-foreground"
              : "text-[10px] text-muted-foreground"
          )}
        >
          {group.type.includes("matching_headings") ? "List of Headings" : "Options"}
        </p>
        <div className="space-y-2">
          {bankOptions.map((option, index) => {
            const value = optionValue(option);
            const text = optionText(option);
            const hasPrefix = value !== text;
            const optionBlockKey = `option-bank-${group.id}-${value}-${text}`;
            const isDraggingOption =
              draggingHeading?.groupId === group.id &&
              draggingHeading?.value === value &&
              !draggingHeading?.sourceQuestionId;

            return (
              <div
                key={`${group.id}-${value}-${text}-${index}`}
                onPointerDown={(event) => {
                  if (!group.type.includes("matching_headings")) {
                    return;
                  }
                  const target = event.target as HTMLElement | null;
                  if (target?.closest("[data-highlight-text]")) {
                    return;
                  }
                  beginHeadingPointerDrag(event, { groupId: group.id, value });
                }}
                className={cn(
                  "rounded-xl border px-3 py-2 transition-transform duration-150",
                  group.type.includes("matching_headings")
                    ? "border-[#2f436f]/55 bg-[#2f436f]/[0.035] dark:border-[#4b6498]/55 dark:bg-[#4b6498]/[0.08]"
                    : "border-border/55 bg-card",
                  hasPrefix ? "flex gap-3" : "block",
                  isDraggingOption &&
                    "scale-[1.02] border-[#2f436f]/85 bg-[#2f436f]/[0.08] opacity-35 shadow-[0_18px_45px_-24px_rgba(47,67,111,0.6)] dark:border-[#89a4d8]/70 dark:bg-[#4b6498]/[0.18] dark:shadow-[0_18px_45px_-24px_rgba(137,164,216,0.4)]"
                )}
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
                    <span className="w-8 shrink-0 text-[13px] font-black uppercase tracking-[0.12em] text-primary">
                      {value}
                    </span>
                    <span
                      ref={(node) => {
                        textBlockRefs.current[optionBlockKey] = node;
                      }}
                      data-highlight-text
                      onMouseUp={(event) => handleTextBlockMouseUp(optionBlockKey, event)}
                      className="select-text flex-1 text-[16px] font-bold leading-6 text-foreground"
                    >
                      {renderHighlightedText(optionBlockKey, text)}
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
                      className="select-text block flex-1 text-[16px] font-bold leading-6 text-foreground"
                    >
                      {renderHighlightedText(optionBlockKey, text)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderMatchingHeadingDropArea(paragraph: PreviewParagraph) {
    const target = matchingHeadingTargets.get(
      `${paragraph.sectionId ?? paragraph.sectionLabel ?? "section"}:${paragraph.paragraphKey}`
    );

    if (!target) {
      return null;
    }

    const currentValue = answers[target.question.id] ?? "";
    const optionLines = target.group.secondaryBlock?.trim()
      ? splitOptionLines(target.group.secondaryBlock)
      : (target.group.sharedOptions ?? []);
    const currentOption = optionLines.find((option) => optionValue(option) === currentValue);
    const isActive = activeQuestionId === target.question.id;
    const isDropReady = draggingHeading?.groupId === target.group.id;
    const isDropHover = dragOverQuestionId === target.question.id && isDropReady;
    const hasValue = Boolean(currentValue);
    const isDraggingSelectedHeading =
      draggingHeading?.groupId === target.group.id &&
      draggingHeading?.value === currentValue &&
      draggingHeading?.sourceQuestionId === target.question.id;
    const dropTone = theme === "light"
      ? {
          hover: "border-[#2f436f] text-[#2f436f] bg-[#2f436f]/16 ring-2 ring-[#2f436f]/18 shadow-sm",
          filled: "border-[#2f436f]/75 text-[#2f436f] bg-[#2f436f]/8",
          idle: "border-[#2f436f]/70 text-[#2f436f]/90",
        }
      : {
          hover: "border-primary text-primary bg-primary/16 ring-2 ring-primary/18 shadow-sm",
          filled: "border-primary/65 text-primary/95 bg-primary/8",
          idle: "border-[#2f436f]/70 text-[#89a4d8]",
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
                ? "border-[#2f436f] text-[#2f436f]"
                : dropTone.idle,
          isDraggingSelectedHeading &&
            "scale-[1.02] opacity-35 shadow-[0_18px_45px_-24px_rgba(47,67,111,0.6)] dark:shadow-[0_18px_45px_-24px_rgba(137,164,216,0.4)]"
        )}
      >
        <span className="flex min-w-[18px] items-center justify-center text-[16px] font-black leading-none text-inherit">
          {target.question.label ?? target.question.number}
        </span>
        {currentValue ? (
          <span className="ml-2.5 flex-1 text-left text-[15px] font-bold leading-6 text-inherit">
            {renderFormattedText(optionText(currentOption!), `selected-heading-${target.question.id}`)}
          </span>
        ) : null}
      </div>
    );
  }

  function renderInlineCompletionGroup(group: PreviewGroup) {
    const segments = (group.questionBlock ?? "").split("[]");
    return (
      <div className="rounded-2xl border border-border/75 bg-background/70 px-4 py-4">
        {group.title ? (
          <p className="mb-4 text-center text-[17px] font-bold tracking-tight text-foreground">
            {renderFormattedText(group.title, `completion-title-${group.id}`)}
          </p>
        ) : null}
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
                {question ? (
                  <Input
                    value={answers[question.id] ?? ""}
                    onFocus={() => setActiveQuestionId(question.id)}
                    onChange={(event) => persistAnswer(question.id, event.target.value)}
                    placeholder={question.label ?? String(question.number)}
                    data-question-anchor={question.id}
                    className={cn(
                      "mx-1 inline-flex h-7 w-[104px] rounded-md border px-2 text-center text-sm font-black align-middle shadow-none placeholder:text-[13px] placeholder:font-extrabold placeholder:tracking-[0.08em] placeholder:opacity-100",
                      theme === "light"
                        ? "border-[#2f436f]/45 bg-[#f8faff]"
                        : "border-primary/30 bg-card",
                      numberedPlaceholderClass,
                      inputFocusClass,
                      activeQuestionId === question.id && activeInputClass
                    )}
                    autoComplete="off"
                    spellCheck="false"
                  />
                ) : null}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  function renderQuestionControl(question: PreviewQuestion, group: PreviewGroup) {
    if (isTfng(question.type) || isYnng(question.type)) {
      const options = isTfng(question.type)
        ? ["TRUE", "FALSE", "NOT GIVEN"]
        : ["YES", "NO", "NOT GIVEN"];

      return (
        <div className="space-y-2.5">
          {options.map((option) => {
            const selected = answers[question.id] === option;
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
                  "flex w-full items-center gap-3 px-0 py-1.5 text-left transition",
                  theme === "light"
                    ? selected
                      ? "text-[#23395d]"
                      : "text-slate-700"
                    : selected
                      ? "text-slate-100"
                      : "text-slate-300/85"
                )}
              >
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.8px] transition",
                    theme === "light"
                      ? selected
                        ? "border-[#2f436f] text-[#2f436f]"
                        : "border-slate-400/85 text-transparent"
                      : selected
                        ? "border-primary text-primary"
                        : "border-slate-500/80 text-transparent"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full bg-current transition", selected ? "opacity-100" : "opacity-0")} />
                </span>
                <span className="text-[12px] font-black uppercase tracking-[0.18em]">{option}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (isMcq(question.type) && !isMcqMultiple(question.type)) {
      return (
        <div className="space-y-2 pl-12">
          {(question.options ?? []).map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
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
                  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                  answers[question.id] === optionLetter
                    ? "border-primary/30 bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/30"
                )}
              >
                <span className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                  answers[question.id] === optionLetter ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}>
                  {optionLetter}
                </span>
                <span
                  ref={(node) => {
                    textBlockRefs.current[`question-option-${question.id}-${optionLetter}`] = node;
                  }}
                  data-highlight-text
                  onMouseUp={(event) => handleTextBlockMouseUp(`question-option-${question.id}-${optionLetter}`, event)}
                  className="select-text font-sans text-foreground"
                  style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                >
                  {renderHighlightedText(`question-option-${question.id}-${optionLetter}`, option)}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    if (isMcqMultiple(question.type)) {
      return (
        <div className="space-y-2 pl-12">
          {(question.options ?? []).map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            const checked = hasMultiValue(answers[question.id], optionLetter);

            return (
              <button
                key={`${question.id}-${optionLetter}`}
                type="button"
                onClick={() => {
                  if (hasActiveSelection()) return;
                  setActiveQuestionId(question.id);
                  persistAnswer(question.id, toggleMultiValue(answers[question.id], optionLetter, question.selectionLimit ?? 2));
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                  checked ? "border-primary/30 bg-primary/10 shadow-sm" : "border-border bg-card hover:border-primary/30"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                    checked ? "border-primary bg-primary" : "border-border bg-background"
                  )}
                >
                  {checked ? <span className="h-2 w-2 rounded-sm bg-primary-foreground" /> : null}
                </span>
                <span
                  ref={(node) => {
                    textBlockRefs.current[`question-option-${question.id}-${optionLetter}`] = node;
                  }}
                  data-highlight-text
                  onMouseUp={(event) => handleTextBlockMouseUp(`question-option-${question.id}-${optionLetter}`, event)}
                  className="select-text font-sans text-foreground"
                  style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                >
                  <span className="mr-2 font-black">{optionLetter}.</span>
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    if (isMatching(question.type)) {
      const isMatchingInformation = question.type.includes("matching_information");
      const sectionKey = group.sectionId ?? group.sectionLabel ?? "section";
      const matchingInformationOptions = matchingInformationParagraphOptions.get(sectionKey) ?? [];
      const matchingOptions = isMatchingInformation
        ? (matchingInformationOptions.length > 0 ? matchingInformationOptions : (group.sharedOptions ?? question.options ?? []))
        : group.secondaryBlock?.trim()
          ? splitOptionLines(group.secondaryBlock)
          : (question.options ?? []);

      return (
        <div className={isMatchingInformation ? "min-w-[112px] max-w-[160px] flex-none" : "pl-12"}>
          <div className="relative max-w-sm">
            <select
              value={answers[question.id] ?? ""}
              onChange={(event) => persistAnswer(question.id, event.target.value)}
              className={cn(
                "flex h-9 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 pr-10 text-sm font-semibold text-foreground shadow-none outline-none transition",
                theme === "light"
                  ? "focus:border-[#2f436f]"
                  : "focus:border-primary/45"
              )}
            >
              <option value="">Select answer</option>
              {matchingOptions.map((option, index) => {
                const value = optionValue(option);
                return (
                  <option key={`${question.id}-matching-${index}`} value={value}>
                    {value}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      );
    }

    if (isCompletion(question.type)) {
      return (
        <div className="pl-12">
          <Input
            value={answers[question.id] ?? ""}
            onFocus={() => setActiveQuestionId(question.id)}
            onChange={(event) => persistAnswer(question.id, event.target.value)}
            placeholder="Type your answer"
            className={cn("h-9 max-w-sm rounded-xl border-border bg-card text-sm font-bold shadow-none", inputFocusClass)}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      );
    }

    return (
      <div className="pl-12">
        <Input
          value={answers[question.id] ?? ""}
          onFocus={() => setActiveQuestionId(question.id)}
          onChange={(event) => persistAnswer(question.id, event.target.value)}
          placeholder="Type your answer"
          className={cn("h-9 max-w-sm rounded-xl border-border bg-card text-sm font-bold shadow-none", inputFocusClass)}
          autoComplete="off"
          spellCheck="false"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground" style={examToneStyle}>
      {draggingHeading && dragPreviewPosition ? (
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
              const draggingOption = headingOptionLookup.get(`${draggingHeading.groupId}:${draggingHeading.value}`);
              if (!draggingOption) {
                return (
                  <span className="text-[15px] font-semibold leading-6 text-foreground">
                    {draggingHeading.value}
                  </span>
                );
              }

              const hasPrefix = draggingOption.value !== draggingOption.text;

              return hasPrefix ? (
                <>
                  <span className="w-8 shrink-0 text-[13px] font-black uppercase tracking-[0.12em] text-primary">
                    {draggingOption.value}
                  </span>
                  <span className="text-[15px] font-semibold leading-6 text-foreground">
                    {draggingOption.text}
                  </span>
                </>
              ) : (
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

      {activeDialog ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-border/80 bg-card p-6 shadow-[0_40px_120px_-30px_rgba(15,23,42,0.55)]">
            <div className="mb-5 space-y-2">
              <Badge className={cn(
                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] shadow-none",
                activeDialog === "submit"
                  ? unansweredCount > 0
                    ? "bg-red-500/10 text-red-400"
                    : "bg-primary/10 text-primary"
                  : "bg-primary/10 text-primary"
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
                    className="rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground hover:bg-primary/90"
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

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 text-foreground shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mx-auto grid min-h-[68px] max-w-[1800px] grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-6">
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
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitted || isSubmitting}
              className={cn(
                "h-8 rounded-xl px-3 text-[11px] font-black uppercase tracking-[0.16em]",
                theme === "dark"
                  ? "bg-primary text-slate-950 hover:bg-primary/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isSubmitted ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <SendHorizontal className="mr-1.5 h-3.5 w-3.5" />}
              {isSubmitting ? "Submitting" : isSubmitted ? "Submitted" : "Submit"}
            </Button>
          </div>
        </div>
      </header>

      <main
        ref={containerRef}
        style={layoutStyle}
        className="relative mx-auto flex max-w-[1800px] flex-col lg:h-[calc(100vh-68px-64px)] lg:flex-row"
      >
        <section className="border-b border-border/70 bg-card/40 lg:w-[var(--reading-pane)] lg:flex-none lg:border-b-0 lg:border-r lg:border-border/80">
          <div
            className="h-full overflow-y-auto px-5 py-4 [scrollbar-width:none] lg:px-8 lg:py-5 [&::-webkit-scrollbar]:hidden"
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
              {examData.paragraphs.map((paragraph, paragraphIndex) => {
                const paragraphStyle = parsePassageBlockStyle(paragraph.text);

                return (
                  <div key={`${paragraph.label ?? paragraphIndex}`} className="px-1 py-1">
                    {paragraph.sectionPreviewLabel ? (
                      <div className="mb-3 space-y-1">
                        <p className="text-lg font-bold text-foreground">
                          {renderFormattedText(paragraph.sectionPreviewLabel, `section-label-${paragraph.sectionId ?? paragraph.paragraphKey}`)}
                        </p>
                        {paragraph.sectionIntro ? (
                          <p className="border-l-2 border-primary/40 py-0.5 pl-3 text-sm font-medium italic leading-relaxed text-muted-foreground">
                            {renderFormattedText(paragraph.sectionIntro, `section-intro-${paragraph.sectionId ?? paragraph.paragraphKey}`)}
                          </p>
                        ) : null}
                        {paragraph.sectionTitle ? (
                          <h2 className="pt-1 text-center text-2xl font-black tracking-tight text-foreground">
                            {renderFormattedText(paragraph.sectionTitle, `section-title-${paragraph.sectionId ?? paragraph.paragraphKey}`)}
                          </h2>
                        ) : null}
                      </div>
                    ) : null}
                    {paragraph.label ? (
                      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded border bg-muted/40 text-sm font-bold text-primary">
                        {paragraph.label}
                      </div>
                    ) : null}
                    {renderMatchingHeadingDropArea(paragraph)}
                    <p
                      ref={(node) => {
                        textBlockRefs.current[`passage-${paragraphIndex}`] = node;
                      }}
                      data-highlight-text
                      onMouseUp={(event) => handleTextBlockMouseUp(`passage-${paragraphIndex}`, event)}
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
                      {renderHighlightedText(`passage-${paragraphIndex}`, paragraphStyle.text)}
                    </p>
                  </div>
                );
              })}
            </article>
          </div>
        </section>

        <section className="bg-muted/15 lg:w-[var(--question-pane)] lg:flex-none">
          <div
            ref={questionPaneRef}
            className="h-full overflow-y-auto px-4 py-5 [scrollbar-width:none] lg:px-6 lg:py-6 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarGutter: "stable" }}
          >
            <div className="space-y-5">
              {examData.questionGroups.map((group) => (
                <div key={group.id} className="rounded-[1.6rem] border border-border/80 bg-card shadow-sm">
                  <div className="border-b border-border/70 px-5 py-4">
                    <h3 className="text-base font-black tracking-tight text-foreground">
                      Questions {group.questions[0]?.number ?? group.title} - {group.questions[group.questions.length - 1]?.number ?? group.title}
                    </h3>
                    <p
                      ref={(node) => {
                        textBlockRefs.current[`group-instruction-${group.id}`] = node;
                      }}
                      data-highlight-text
                      onMouseUp={(event) => handleTextBlockMouseUp(`group-instruction-${group.id}`, event)}
                      className="mt-3 select-text text-sm font-medium leading-6 text-slate-700 dark:text-slate-300/90"
                      style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                    >
                      {renderHighlightedText(`group-instruction-${group.id}`, group.instruction)}
                    </p>
                  </div>

                  <div className="space-y-4 px-4 py-4 lg:px-5">
                    {renderOptionBank(group)}

                    {usesBracketCompletionLayout(group.type) && group.questionBlock?.trim()
                      ? renderInlineCompletionGroup(group)
                      : !group.type.includes("matching_headings")
                        ? group.questions.map((question) => {
                          const isBinaryQuestion = isTfng(question.type) || isYnng(question.type);
                          const isMatchingInformationQuestion = question.type.includes("matching_information");
                          return (
                          <div
                            key={question.id}
                            id={question.id}
                            onClick={() => setActiveQuestionId(question.id)}
                            className={cn(
                              "px-0 py-2 transition",
                              activeQuestionId === question.id && ""
                            )}
                          >
                            <div className={cn("mb-2.5 flex items-start gap-3", isBinaryQuestion && "mb-1.5", isMatchingInformationQuestion && "items-center")}>
                              {isBinaryQuestion ? (
                                <div className="pt-0.5 text-[11px] font-black tracking-[0.12em] text-slate-700 dark:text-slate-200/75">
                                  {question.label ?? question.number}
                                </div>
                              ) : (
                                <div className="flex h-8 min-w-[44px] shrink-0 items-center justify-center rounded-lg bg-primary px-2 text-[11px] font-black leading-none text-primary-foreground whitespace-nowrap">
                                  {question.label ?? question.number}
                                </div>
                              )}
                              <div className={cn("space-y-1", isMatchingInformationQuestion && "flex flex-1 flex-wrap items-center gap-3 space-y-0")}>
                                <p
                                  ref={(node) => {
                                    textBlockRefs.current[`question-prompt-${question.id}`] = node;
                                  }}
                                  data-highlight-text
                                  onMouseUp={(event) => handleTextBlockMouseUp(`question-prompt-${question.id}`, event)}
                                  className={cn("select-text font-sans text-foreground", isMatchingInformationQuestion && "min-w-[220px] flex-1")}
                                  style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                                >
                                  {renderHighlightedText(`question-prompt-${question.id}`, question.prompt)}
                                </p>
                                {isMatchingInformationQuestion ? renderQuestionControl(question, group) : null}
                                {question.instruction && !isBinaryQuestion && !isMatchingInformationQuestion ? (
                                  <p
                                    ref={(node) => {
                                      textBlockRefs.current[`question-instruction-${question.id}`] = node;
                                    }}
                                    data-highlight-text
                                    onMouseUp={(event) => handleTextBlockMouseUp(`question-instruction-${question.id}`, event)}
                                    className="select-text text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-300/85"
                                  >
                                    {renderHighlightedText(`question-instruction-${question.id}`, question.instruction)}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            {!isMatchingInformationQuestion ? renderQuestionControl(question, group) : null}
                          </div>
                        );
                        })
                        : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

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
      </main>

      <footer className="sticky bottom-0 z-30 h-[52px] border-t border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1800px] items-center px-4 lg:px-6">
          <div className="flex w-full items-center justify-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex shrink-0 items-center gap-1.5 pr-1">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
                  answeredCount === totalQuestions
                    ? "border-emerald-500/45 text-emerald-500"
                    : "border-primary/35 text-primary"
                )}
              >
                {answeredCount === totalQuestions ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <span className="text-[14px] font-semibold tracking-tight text-foreground">{examData.partLabel}</span>
              <span className="text-[13px] font-medium text-muted-foreground">{answeredCount} of {totalQuestions}</span>
            </div>

            <div className="flex min-w-max items-center gap-0.5">
            {allQuestions.map((question) => {
              const answered = Boolean(answers[question.id]?.trim());
              const active = activeQuestionId === question.id;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => navigateToQuestion(question.id)}
                  className={cn(
                    "flex h-8 min-w-[42px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-0.5 transition",
                    active
                      ? "border-primary/45 bg-card text-primary shadow-sm"
                      : answered
                        ? "border-transparent bg-transparent text-foreground"
                        : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/35"
                  )}
                >
                  <span
                    className={cn(
                      "h-1 w-3.5 rounded-full transition",
                      active
                        ? "bg-primary"
                        : answered
                          ? "bg-primary/55"
                          : "bg-border"
                    )}
                  />
                  <span className="text-[10px] font-semibold leading-none whitespace-nowrap">{question.label ?? question.number}</span>
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
