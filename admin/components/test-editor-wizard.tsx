"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Notice, ProgressBar, SectionHeader, Select, Textarea } from "@/components/ui";
import { createEmptyDraft } from "@/lib/draft-template";
import { listeningQuestionTypes, readingQuestionTypes } from "@/lib/question-types";
import { adminApi } from "@/lib/api";
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


const stepOrder: WizardStepId[] = ["metadata", "content", "questions", "review"];

const defaultInstructions: Record<string, string> = {
  // Reading Instructions
  "reading_true_false_not_given": "Do the following statements agree with the information given in the Reading Passage?\n\nIn boxes on your answer sheet, write:\n\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this",
  "reading_yes_no_not_given": "Do the following statements agree with the claims of the writer in the Reading Passage?\n\nIn boxes on your answer sheet, write:\n\nYES if the statement agrees with the claims of the writer\nNO if the statement contradicts the claims of the writer\nNOT GIVEN if it is impossible to say what the writer thinks about this",
  "reading_mc_single": "Choose the correct letter, A, B, C or D.\n\nWrite the correct letter in boxes on your answer sheet.",
  "reading_mc_multiple": "Choose TWO letters, A-E.\n\nWrite the correct letters in boxes on your answer sheet.",
  "reading_matching_headings": "Choose the correct heading for each paragraph from the list of headings below.\n\nWrite the correct number, i-ix, in boxes on your answer sheet.",
  "reading_matching_information": "Which paragraph contains the following information?\n\nWrite the correct letter, A-F, in boxes on your answer sheet.\n\nNB You may use any letter more than once.",
  "reading_matching_features": "Look at the following statements and the list of people below.\n\nMatch each statement with the correct person.\n\nWrite the correct letter, A-E, in boxes on your answer sheet.",
  "reading_matching_sentence_endings": "Complete each sentence with the correct ending, A-G, below.\n\nWrite the correct letter, A-G, in boxes on your answer sheet.",
  "reading_sentence_completion": "Complete the sentences below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",
  "reading_summary_completion_wordbank": "Complete the summary using the list of words, A-G, below.\n\nWrite the correct letter, A-G, in boxes on your answer sheet.",
  "reading_summary_completion_freetext": "Complete the summary below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",
  "reading_note_completion": "Complete the notes below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",
  "reading_diagram_labeling": "Label the diagram below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",
  "reading_short_answer": "Answer the questions below.\n\nChoose {NO MORE THAN TWO WORDS AND/OR A NUMBER} from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",

  // Listening Instructions
  "listening_form_completion": "Complete the form below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_sentence_completion": "Complete the sentences below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_mc_single": "Choose the correct letter, A, B or C.",
  "listening_mc_multiple": "Choose TWO letters, A-E.",
  "listening_matching": "What does the speaker say about each of the following items?\n\nChoose the correct letter, A, B or C, and write them next to Questions.",
  "listening_plan_map_labeling": "Label the map below.\n\nWrite the correct letter, A-H, next to Questions.",
  "listening_short_answer": "Answer the questions below.\n\nWrite {NO MORE THAN THREE WORDS AND/OR A NUMBER} for each answer."
};

function splitNonEmptyLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractMatchingOptionValue(option: string) {
  const trimmed = option.trim();
  const prefixMatch = trimmed.match(/^([a-z0-9ivxlcdm]+)[.)]\s*/i);
  return prefixMatch ? prefixMatch[1] : trimmed;
}

function stripMatchingOptionPrefix(option: string) {
  return option.trim().replace(/^([a-z0-9ivxlcdm]+)[.)]\s*/i, "").trim();
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
};

function analyzeMatchingHeadingsGroup(
  group: AdminTestDraftQuestionGroup,
  sections: AdminTestDraftContentSection[]
) {
  const section = sections.find((item) => item.id === group.sectionId);
  const validLabels = paragraphLabelsForSection(section);
  const validLabelSet = new Set(validLabels);
  const headings = splitNonEmptyLines(group.secondaryBlock ?? "");
  const labels = splitNonEmptyLines(group.answerBlock ?? "").map((label) => label.toUpperCase());
  const labelCounts = new Map<string, number>();

  for (const label of labels) {
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }

  const previewRows: MatchingHeadingPreviewRow[] = headings.map((headingLine, index) => {
    const label = labels[index] ?? "";
    return {
      label,
      headingLine,
      headingText: stripMatchingOptionPrefix(headingLine) || headingLine,
      answerValue: extractMatchingOptionValue(headingLine),
      isDuplicate: Boolean(label) && (labelCounts.get(label) ?? 0) > 1,
      isValidLabel: Boolean(label) && validLabelSet.has(label),
    };
  });

  const orderedRows = [...previewRows].sort((left, right) => {
    const leftIndex = validLabels.indexOf(left.label);
    const rightIndex = validLabels.indexOf(right.label);
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });

  const usedLabels = new Set<string>();
  const generatedQuestions: AdminTestDraftQuestion[] = [];
  for (const row of orderedRows) {
    if (!row.label || !row.isValidLabel || row.isDuplicate || usedLabels.has(row.label)) {
      continue;
    }
    usedLabels.add(row.label);
    const existingQuestion = group.questions.find((question) => paragraphLabelFromPrompt(question.prompt) === row.label);
    generatedQuestions.push({
      id: existingQuestion?.id ?? `draft-q-${crypto.randomUUID()}`,
      label: String(group.questionStart + generatedQuestions.length),
      prompt: `Paragraph ${row.label}`,
      acceptedAnswers: [row.answerValue],
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
  const invalidLabels = labels.filter((label) => !validLabelSet.has(label));
  if (invalidLabels.length > 0) {
    issues.push(`These labels are outside the passage range: ${[...new Set(invalidLabels)].join(", ")}.`);
  }
  const missingLabels = validLabels.filter((label) => !labelCounts.has(label));
  if (missingLabels.length > 0) {
    issues.push(`Every passage label must be used once. Missing labels: ${missingLabels.join(", ")}.`);
  }
  if (validLabels.length === 0) {
    issues.push("Add passage paragraphs first so matching headings can validate paragraph labels.");
  }

  return {
    previewRows,
    issues,
    validLabels,
    generatedQuestions,
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
  );
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

function binaryAnswerOptionsForType(typeId: string) {
  if (typeId.includes("true_false")) {
    return ["TRUE", "FALSE", "NOT GIVEN"] as const;
  }
  if (typeId.includes("yes_no")) {
    return ["YES", "NO", "NOT GIVEN"] as const;
  }
  return null;
}

function normalizeRestrictedAnswerLine(line: string) {
  return line.trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeRestrictedAnswerBlockInput(value: string) {
  return value
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      return normalizeRestrictedAnswerLine(line);
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
  const normalizedAnswers = answerLines.map(normalizeRestrictedAnswerLine);

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
      id: existingQuestion?.id ?? `draft-q-${crypto.randomUUID()}`,
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

function renderBraceBoldInlineText(text: string, keyPrefix: string) {
  const segments = parseBraceBoldText(text);
  if (segments.length === 0) {
    return text;
  }

  return segments.map((segment, index) =>
    segment.bold ? (
      <strong key={`${keyPrefix}-bold-${index}`} className="font-bold text-inherit">
        {segment.text}
      </strong>
    ) : (
      <span key={`${keyPrefix}-plain-${index}`}>{segment.text}</span>
    )
  );
}

function renderBraceBoldText(text: string, keyPrefix: string) {
  const lines = text.split("\n");
  if (lines.length === 1 && !/^\s*\*/.test(lines[0] ?? "")) {
    return renderBraceBoldInlineText(text, keyPrefix);
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


export function TestEditorWizard({ mode, testId, initialDraft }: Props) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<WizardStepId>("metadata");
  const draftSeed = useMemo(() => initialDraft ?? createEmptyDraft(), [initialDraft]);
  const [draft, setDraft] = useState<AdminTestDraftState>(draftSeed);
  const [resolvedTestId, setResolvedTestId] = useState<string | undefined>(testId);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishState, setPublishState] = useState<"idle" | "publishing" | "published" | "error">("idle");
  const activeStepIndex = stepOrder.indexOf(activeStep);
  const completionRatio = ((activeStepIndex + 1) / stepOrder.length) * 100;
  const isPublishedEdit = mode === "edit" && draft.metadata.status === "published";

  // Auto-Save Effect (Debounced)
  const [lastSavedDraftStr, setLastSavedDraftStr] = useState<string>("");

  useEffect(() => {
    if (isPublishedEdit || saveState === "saving" || publishState === "publishing" || publishState === "published") return;

    const currentDraftStr = JSON.stringify(draft);
    if (currentDraftStr === lastSavedDraftStr) return;

    const handler = setTimeout(() => {
      if (draft.metadata.title.trim().length > 0) {
        void saveDraft(true, currentDraftStr);
      }
    }, 2000);

    return () => {
      clearTimeout(handler);
    };
  }, [draft, isPublishedEdit, lastSavedDraftStr, saveState, publishState]);

  useEffect(() => {
    setDraft(draftSeed);
    setLastSavedDraftStr(JSON.stringify(draftSeed));
  }, [draftSeed]);

  async function saveDraft(isAutoSave = false, draftStr?: string) {
    try {
      setSaveState("saving");
      const currentDraftToSave = draft;
      
      const saved = resolvedTestId
        ? await adminApi.updateDraft(resolvedTestId, currentDraftToSave)
        : await adminApi.createDraft(currentDraftToSave);

      const syncedDraft = {
        ...currentDraftToSave,
        metadata: {
          ...currentDraftToSave.metadata,
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
          status: saved.status,
          version: saved.version,
          format: saved.format
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
      
      setTimeout(() => {
        setSaveState(current => current === "saved" ? "idle" : current);
      }, 3000);
    } catch {
      setSaveState("error");
    }
  }

  async function quickFixPublished() {
    if (!resolvedTestId) {
      return;
    }

    try {
      setSaveState("saving");
      const saved = await adminApi.quickFixPublished(resolvedTestId, draft);
      const syncedDraft = {
        ...draft,
        metadata: {
          ...draft.metadata,
          status: saved.status,
          version: saved.version,
          format: saved.format,
        },
      };

      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
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
        const saved = await adminApi.createDraft(draft);
        targetTestId = saved.id;
        setResolvedTestId(saved.id);
        setDraft((current) => ({
          ...current,
          metadata: {
            ...current.metadata,
            version: saved.version,
            status: saved.status
          }
        }));
        setSaveState("saved");
        router.replace(`/tests/${saved.id}/edit`);
      } catch {
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
            {saveState === "error" && <span className="text-destructive">Save failed</span>}
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
              onChange={(event) => setDraft((current) => ({ ...current, metadata: { ...current.metadata, source: event.target.value as any } }))}>
              <option value="cambridge">Cambridge Official</option>
              <option value="real_exam">Real Exam Material</option>
              <option value="custom">Custom Practice</option>
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
  const [collapseStateReady, setCollapseStateReady] = useState(false);
  const collapseStorageKey = useMemo(() => "admin-content-sections:" + pathname, [pathname]);

  const addSection = () => {
    setDraft((current) => ({
      ...current,
      content: {
        sections: [
          ...current.content.sections,
          {
            id: "draft-section-" + crypto.randomUUID(),
            label: current.metadata.type === "listening" ? "Part " + (current.content.sections.length + 1) : "Passage " + (current.content.sections.length + 1),
            title: current.metadata.type === "listening" ? "Listening Part " + (current.content.sections.length + 1) : "Reading Passage " + (current.content.sections.length + 1),
            subtitle: "",
            content: "",
            paragraphs: [],
            showLabels: false,
            mediaKind: current.metadata.type === "listening" ? "audio" : "text",
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
                        {section.title.trim() || "Untitled section"}
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
                      placeholder="Enter Passage Title (e.g. The Giant Squid)"
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
  const [groupNumberInputs, setGroupNumberInputs] = useState<Record<string, { start: string; end: string }>>({});
  const [questionBlockSizes, setQuestionBlockSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null);
  const [collapseStateReady, setCollapseStateReady] = useState(false);
  const [panelSplitOffset, setPanelSplitOffset] = useState<number>(0);
  const [isDraggingPanelSplit, setIsDraggingPanelSplit] = useState(false);
  const [questionEditorGridWidths, setQuestionEditorGridWidths] = useState<Record<string, number>>({});
  const questionBlockRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const questionEditorGridRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const questionsLayoutRef = useRef<HTMLDivElement | null>(null);
  const collapseStorageKey = useMemo(() => `admin-question-groups:${pathname}`, [pathname]);
  const questionBlockSizeStorageKey = useMemo(() => `admin-question-block-sizes:${pathname}`, [pathname]);
  const panelSplitStorageKey = useMemo(() => `admin-question-panel-split:${pathname}`, [pathname]);
  const clampPanelSplitOffset = (value: number) => Math.max(-14, Math.min(18, value));

  useEffect(() => {
    setGroupNumberInputs((current) => {
      const next: Record<string, { start: string; end: string }> = {};
      for (const group of draft.questionGroups ?? []) {
        const existing = current[group.id];
        next[group.id] = {
          start: existing?.start ?? String(group.questionStart),
          end: existing?.end ?? String(group.questionEnd),
        };
      }
      return next;
    });
  }, [draft.questionGroups]);

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

  const addGroup = () => {
    const groups = draft.questionGroups ?? [];
    let nextStart = 1;
    if (groups.length > 0) {
      const maxEnd = Math.max(...groups.map(g => g.questionEnd));
      nextStart = maxEnd + 1;
    }
    const typeId = draft.metadata.type === "listening" ? "listening_form_completion" : "reading_true_false_not_given";
    const nextGroupNum = groups.length + 1;
    const newGroup: AdminTestDraftQuestionGroup = {
      id: `draft-group-${crypto.randomUUID()}`,
      sectionId: draft.content.sections[0]?.id ?? "",
      title: `Question Group ${nextGroupNum}`,
      instructions: defaultInstructions[typeId] || "Enter instructions for this group of questions.",
      typeId,
      questionStart: nextStart,
      questionEnd: nextStart,
      sharedOptions: [],
      questions: []
    };
    setDraft((current) => ({
      ...current,
      questionGroups: [...groups, newGroup]
    }));
  };

  const updateGroup = (groupId: string, updates: Partial<AdminTestDraftQuestionGroup>) => {
    setDraft((current) => ({
      ...current,
      questionGroups: (current.questionGroups ?? []).map((g) => {
        if (g.id !== groupId) return g;

        let newGroup = { ...g, ...updates };

        if (updates.typeId && updates.typeId !== g.typeId) {
          newGroup.instructions = defaultInstructions[updates.typeId] || newGroup.instructions;
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
            || newGroup.typeId.includes("wordbank")
          ) {
            newGroup.sharedOptions = sBlock.split("\n").map((line) => line.trim()).filter(Boolean);
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
                id: existingQuestion?.id ?? `draft-q-${crypto.randomUUID()}`,
                label: `${questionNumber}`,
                prompt: `Blank ${questionNumber}`,
                acceptedAnswers: parseBracketCompletionAnswers(aLines[index] ?? ""),
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

              if (isMultipleChoiceMultiple) {
                acceptedAnswers = multipleChoiceAnswerGroups[index] ?? [];
              } else if (aLines[index]) {
                acceptedAnswers = aLines[index].split("|").map((answer) => answer.trim()).filter(Boolean);
              }

              if (newGroup.typeId.includes("mc_")) {
                const parsedQuestion = parsedMultipleChoiceBlocks[index] ?? parseMultipleChoiceQuestionBlock(qText);
                prompt = parsedQuestion.prompt;
                variants = parsedQuestion.variants;
              }

              const slotCount = isMultipleChoiceMultiple ? Math.max(1, acceptedAnswers.length) : 1;
              const questionRange = {
                start: nextQuestionNumber,
                end: nextQuestionNumber + slotCount - 1,
              };
              nextQuestionNumber = questionRange.end + 1;

              newQuestions.push({
                id: existingQuestion?.id ?? `draft-q-${crypto.randomUUID()}`,
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
      })
    }));
  };

  const removeGroup = (groupId: string) => {
    setDraft((current) => ({
      ...current,
      questionGroups: (current.questionGroups ?? []).filter((g) => g.id !== groupId)
    }));
  };

  const updateQuestion = (groupId: string, questionId: string, updates: Partial<AdminTestDraftQuestion>) => {
    setDraft((current) => ({
      ...current,
      questionGroups: (current.questionGroups ?? []).map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          questions: g.questions.map((q) => q.id === questionId ? { ...q, ...updates } : q)
        };
      })
    }));
  };

  const removeQuestion = (groupId: string, questionId: string) => {
    setDraft((current) => ({
      ...current,
      questionGroups: (current.questionGroups ?? []).map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          questions: g.questions.filter((q) => q.id !== questionId)
        };
      })
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

  const updateGroupNumberInput = (groupId: string, field: "start" | "end", value: string) => {
    setGroupNumberInputs((current) => ({
      ...current,
      [groupId]: {
        start: current[groupId]?.start ?? "",
        end: current[groupId]?.end ?? "",
        [field]: value,
      },
    }));
  };

  const commitGroupNumberInput = (groupId: string, field: "start" | "end") => {
    const entry = groupNumberInputs[groupId];
    const rawValue = entry?.[field] ?? "";
    const parsed = Number.parseInt(rawValue, 10);

    if (!rawValue.trim() || Number.isNaN(parsed) || parsed < 1) {
      const group = draft.questionGroups.find((item) => item.id === groupId);
      if (!group) return;
      setGroupNumberInputs((current) => ({
        ...current,
        [groupId]: {
          start: field === "start" ? String(group.questionStart) : current[groupId]?.start ?? String(group.questionStart),
          end: field === "end" ? String(group.questionEnd) : current[groupId]?.end ?? String(group.questionEnd),
        },
      }));
      return;
    }

    updateGroup(groupId, field === "start" ? { questionStart: parsed } : { questionEnd: parsed });
  };

  const groupedQuestionGroups = useMemo(() => {
    const sectionLabelPrefix = draft.metadata.type === "reading" ? "Passage" : "Part";
    const grouped = draft.content.sections
      .map((section, index) => ({
        key: section.id,
        sectionLabel: `${sectionLabelPrefix} ${index + 1}`,
        groups: (draft.questionGroups ?? []).filter((group) => group.sectionId === section.id),
      }))
      .filter((entry) => entry.groups.length > 0);

    const orphanGroups = (draft.questionGroups ?? []).filter(
      (group) => !draft.content.sections.some((section) => section.id === group.sectionId)
    );
    if (orphanGroups.length > 0) {
      grouped.push({
        key: "unassigned",
        sectionLabel: `${sectionLabelPrefix} ?`,
        groups: orphanGroups,
      });
    }
    return grouped;
  }, [draft.content.sections, draft.metadata.type, draft.questionGroups]);

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
            <p className="text-sm text-muted-foreground">Manage question groups and their correct answers.</p>
          </div>
          <Button type="button" variant="solid" onClick={addGroup}>
            + Add Group
          </Button>
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
        {sectionGroup.groups.map((group) => {
          const matchingHeadingsMeta = group.typeId.includes("matching_headings")
            ? analyzeMatchingHeadingsGroup(group, draft.content.sections)
            : null;
          const binaryStatementsMeta = isBinaryStatementType(group.typeId)
            ? analyzeBinaryStatementGroup(group)
            : null;
          const questionTypeLabel =
            (draft.metadata.type === "listening" ? listeningQuestionTypes : readingQuestionTypes).find((option) => option.id === group.typeId)?.label
            ?? previewTypeLabel(group.typeId);
          const configuredQuestions = group.questions.filter((question) => isQuestionConfigured(group, question)).length;
          const isGroupValid =
            group.questions.length > 0
            && configuredQuestions === group.questions.length
            && group.questionEnd >= group.questionStart
            && (matchingHeadingsMeta?.issues.length ?? 0) === 0
            && (binaryStatementsMeta?.issues.length ?? 0) === 0;
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

          return (
          <Card key={group.id} className="overflow-hidden border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader className={cn("px-4", isGroupCollapsed ? "py-3" : "pt-4 pb-3")}>
              <div className={cn("flex items-start justify-between gap-4 border-b border-primary/10", isGroupCollapsed ? "pb-3" : "pb-4")}>
                <div className={cn(isGroupCollapsed ? "space-y-1" : "space-y-2")}>
                  <h3 className={cn("font-black tracking-tight text-foreground", isGroupCollapsed ? "text-[15px]" : "text-[17px]")}>{group.title}</h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="info">{questionTypeLabel}</Badge>
                    <Badge tone="neutral">{sectionGroup.sectionLabel}</Badge>
                    <Badge tone="neutral">{totalQuestionSlots(group)} questions</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <div className="grid gap-4 md:grid-cols-3">
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
                    <EditableField label="Start Q#">
                      <Input
                        type="number"
                        className="bg-background"
                        value={groupNumberInputs[group.id]?.start ?? String(group.questionStart)}
                        onChange={(e) => updateGroupNumberInput(group.id, "start", e.target.value)}
                        onBlur={() => commitGroupNumberInput(group.id, "start")}
                      />
                    </EditableField>
                    <EditableField label="End Q#">
                      <Input
                        type="number"
                        className="bg-background"
                        value={groupNumberInputs[group.id]?.end ?? String(group.questionEnd)}
                        onChange={(e) => updateGroupNumberInput(group.id, "end", e.target.value)}
                        onBlur={() => commitGroupNumberInput(group.id, "end")}
                      />
                    </EditableField>
                  </div>
                  <EditableField label="Group Instructions">
                    <Textarea className="bg-background min-h-[60px]" value={group.instructions} onChange={(e) => updateGroup(group.id, { instructions: e.target.value })} />
                  </EditableField>

                  {(group.typeId.includes("matching_headings") || group.typeId.includes("matching_features") || group.typeId.includes("wordbank")) && (
                    <EditableField
                      label={
                        group.typeId.includes("matching_headings")
                          ? "Headings"
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
                            ? "* Complete the summary below using [] markers.\nThe first visitors arrived in [] and stayed for [] days."
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
                            placeholder={"A\nC\nB\nD"}
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
                                    row.label && row.isValidLabel && !row.isDuplicate
                                      ? "border-success/25 bg-success/5"
                                      : "border-danger/25 bg-danger/5"
                                  )}
                                >
                                  <p className="font-semibold text-foreground">
                                    {(row.label || "—").toUpperCase()} {"->"} {row.headingText || row.headingLine}
                                  </p>
                                  {row.label && row.isDuplicate ? (
                                    <p className="mt-1 text-xs text-danger">Duplicate paragraph label.</p>
                                  ) : null}
                                  {row.label && !row.isValidLabel ? (
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
                            onChange={(e) => updateGroup(group.id, {
                              answerBlock: isBinaryStatementType(group.typeId)
                                ? normalizeRestrictedAnswerBlockInput(e.target.value)
                                : e.target.value,
                            })}
                            placeholder={isBracketCompletionType(group.typeId)
                              ? "fathers/dads\nthree weeks/21 days"
                              : isBinaryStatementType(group.typeId)
                                ? (binaryStatementsMeta?.allowedAnswers ?? []).join("\n")
                                : isMatchingInformationType(group.typeId)
                                  ? "A\nC\nB"
                                  : isMultipleChoiceMultipleType(group.typeId)
                                    ? "A\nB\nD\n\nC\nE"
                                    : "answer1|variant2\nanswer2|variant3"}
                          />
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
                          <Input 
                            className="h-8 w-24 text-xs font-bold bg-muted/30" 
                            value={question.label} 
                            onChange={(e) => updateQuestion(group.id, question.id, { label: e.target.value })} 
                          />
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
                          ) : isMultipleChoiceMultipleType(group.typeId) ? (
                            <ReadOnlyField
                              label="Accepted Answers"
                              value={question.acceptedAnswers.join(" / ") || "Enter grouped answer lines above"}
                            />
                          ) : (
                          <EditableField label="Correct Answer Selection">
                            {group.typeId.includes("mc_") ? (
                              <Select 
                                className="font-bold border-primary/20"
                                value={question.acceptedAnswers[0] || ""} 
                                onChange={(e) => updateQuestion(group.id, question.id, { acceptedAnswers: [e.target.value] })}
                              >
                                <option value="">Select Correct Option...</option>
                                {(question.variants ?? []).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </Select>
                            ) : (
                              <Input 
                                className="font-bold border-primary/20"
                                placeholder="Type answer(s)..."
                                value={question.acceptedAnswers.join(", ")} 
                                onChange={(e) => updateQuestion(group.id, question.id, { acceptedAnswers: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} 
                              />
                            )}
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
}: {
  draft: AdminTestDraftState;
  previewId: string;
  resolveLogicalIndex: (uiIndex: number) => number;
  getIeltsIntroStr: (uiIndex: number) => string;
  compact?: boolean;
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
}: {
  previewId: string;
  draftType: AdminTestDraftState["metadata"]["type"];
  section: AdminTestDraftState["content"]["sections"][number];
  logicalIndex: number;
  intro: string;
  groups: AdminTestDraftState["questionGroups"];
  compact?: boolean;
}) {
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

  function renderCompletionPreview(group: AdminTestDraftState["questionGroups"][number]) {
    const segments = (group.questionBlock ?? "").split("[]");
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
            const isActive = question ? activeQuestionId === question.id : false;
            return (
              <span key={`${group.id}-completion-${index}`}>
                {renderBraceBoldText(segment, `${group.id}-completion-segment-${index}`)}
                {question ? (
                  <button
                    type="button"
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
                ) : null}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
      <div className={cn("overflow-hidden border border-border/70 bg-background/55 shadow-sm", compact ? "space-y-4 rounded-[1.2rem] p-4" : "space-y-6 rounded-[1.5rem] p-5")}>
      <div className={cn(compact ? "space-y-1.5" : "space-y-2")}>
        <p className={cn("font-bold text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
          {draftType === "reading" ? `Reading Passage ${logicalIndex + 1}` : `Listening Part ${logicalIndex + 1}`}
        </p>
        <p className={cn("border-l-2 border-primary/40 pl-3 py-0.5 font-medium italic text-muted-foreground", compact ? "text-[12px] leading-[1.45]" : "text-[13px] leading-[1.55]")}>
          {renderBraceBoldText(intro, `${previewId}-${section.id}-intro`)}
        </p>
        {section.title ? (
          <p className={cn("text-center font-black tracking-tight text-foreground", compact ? "pt-1 text-[19px]" : "pt-1.5 text-[22px]")}>
            {renderBraceBoldText(section.title, `${previewId}-${section.id}-title`)}
          </p>
        ) : null}
      </div>

      <div className={cn(compact ? "space-y-4" : "space-y-5")}>
        {paragraphs.length > 0 ? (
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
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/15 py-10 text-center">
            <p className="text-sm italic text-muted-foreground">Waiting for content input...</p>
          </div>
        )}
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
                      Questions {group.questionStart}-{group.questionEnd}
                    </h3>
                  </div>
                  <Badge tone="neutral">{totalQuestionSlots(group)} questions</Badge>
                </div>
                <p className={cn("mt-2.5 whitespace-pre-wrap font-medium text-muted-foreground", compact ? "text-[12px] leading-[1.35]" : "text-[13px] leading-[1.45]")}>
                  {renderBraceBoldText(group.instructions, `${group.id}-instructions`)}
                </p>
              </div>

              <div className={cn("space-y-3.5", compact ? "px-3 py-3 lg:px-3.5" : "px-3.5 py-3.5 lg:px-4")}>
                {((group.typeId.includes("matching") && !group.typeId.includes("matching_information")) || group.typeId.includes("wordbank")) && group.sharedOptions.length > 0 ? (
                  <div className={cn("border border-border/70 bg-muted/20", compact ? "rounded-[1rem] px-3 py-2.5" : "rounded-2xl px-4 py-3")}>
                    {group.typeId.includes("matching_headings") ? (
                      <p className={cn("mb-3 font-bold tracking-tight text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
                        List of Headings
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                    {group.sharedOptions.map((option) => (
                      <span
                        key={option}
                        className={cn("rounded-full border border-border bg-card font-semibold text-foreground", compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs")}
                      >
                        {renderBraceBoldText(option, `${group.id}-option-${option}`)}
                      </span>
                    ))}
                    </div>
                  </div>
                ) : null}

                {isBracketCompletionType(group.typeId) ? renderCompletionPreview(group) : null}

                {!group.typeId.includes("matching_headings") && !isBracketCompletionType(group.typeId) ? group.questions.map((question, questionIndex) => {
                  const questionNumber = formatQuestionRange(questionRangeAtIndex(group, questionIndex));
                  const active = activeQuestionId === question.id;

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
                      <div className={cn("flex items-start gap-2.5", compact ? "mb-2" : "mb-2.5")}>
                        <div className={cn("flex shrink-0 items-center justify-center rounded-lg bg-primary px-2 font-black leading-none text-primary-foreground whitespace-nowrap", compact ? "h-6 min-w-[34px] text-[9px]" : "h-7 min-w-[40px] text-[10px]")}>
                          {questionNumber}
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
        totalQ += g.questions.length;
        if (g.questions.length === 0) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: "This group has no questions." });
        }
        if (g.questionEnd < g.questionStart) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: "Question range is invalid (End < Start)." });
        }
        if (g.typeId.includes("matching_headings")) {
          const matchingMeta = analyzeMatchingHeadingsGroup(g, draft.content.sections);
          for (const issue of matchingMeta.issues) {
            checks.push({ label: `Matching headings: ${g.title}`, status: "error", detail: issue });
          }
        }
        if (isBinaryStatementType(g.typeId)) {
          const binaryMeta = analyzeBinaryStatementGroup(g);
          for (const issue of binaryMeta.issues) {
            checks.push({ label: `Statements: ${g.title}`, status: "error", detail: issue });
          }
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
              <p>Total Questions: <span className="text-foreground">{(draft.questionGroups ?? []).reduce((acc, g) => acc + g.questions.length, 0)}</span></p>
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
