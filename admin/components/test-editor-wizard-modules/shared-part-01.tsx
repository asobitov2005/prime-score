"use client";

import { AdminTestDraftContentSection, AdminTestDraftQuestion, AdminTestDraftQuestionGroup, AdminTestDraftState, WizardStepId } from "./dependencies";



export type Props = {
  mode: "create" | "edit";
  testId?: string;
  initialDraft?: AdminTestDraftState;
};

export type TranscriptProgressState = {
  value: number;
  label: string;
  startedAt: number;
  jobId?: string;
};

export const stepOrder: WizardStepId[] = ["metadata", "content", "questions", "review"];

export const defaultInstructions: Record<string, string> = {
  // Reading Instructions
  "reading_true_false_not_given": "Do the following statements agree with the information given in the Reading Passage?\n\nIn boxes on your answer sheet, write:\n\n{TRUE}\t\t\tif the statement agrees with the information\n{FALSE}\t\t\tif the statement contradicts the information\n{NOT GIVEN}\tif there is no information on this",
  "reading_yes_no_not_given": "Do the following statements agree with the claims of the writer in the Reading Passage?\n\nIn boxes on your answer sheet, write:\n\n{YES}\t\t\tif the statement agrees with the claims of the writer\n{NO}\t\t\tif the statement contradicts the claims of the writer\n{NOT GIVEN}\tif it is impossible to say what the writer thinks about this",
  "reading_mc_single": "Choose the correct letter, A, B, C or D.\n\nWrite the correct letter in boxes on your answer sheet.",
  "reading_mc_multiple": "Choose TWO letters, A-H.\n\nWrite the correct letters in boxes on your answer sheet.",
  "reading_matching_headings": "Choose the correct heading for each paragraph from the list of headings below.\n\nWrite the correct number, i-ix, in boxes on your answer sheet.",
  "reading_matching_information": "Which paragraph contains the following information?\n\nWrite the correct letter, A-F, in boxes on your answer sheet.\n\nNB You may use any letter more than once.",
  "reading_matching_features": "Look at the following statements and the list of people below.\n\nMatch each statement with the correct person.\n\nWrite the correct letter, A-E, in boxes on your answer sheet.",
  "reading_matching_sentence_endings": "Complete each sentence with the correct ending, A-G, below.\n\nWrite the correct letter, A-G, in boxes on your answer sheet.",
  "reading_sentence_completion": "Complete the sentences below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_summary_completion_wordbank": "Complete the summary using the list of words, A-G, below.\n\nWrite the correct letter, A-G, in boxes on your answer sheet.",
  "reading_summary_completion_freetext": "Complete the summary below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_note_completion": "Complete the notes below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_table_completion": "Complete the table below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_flowchart_completion": "Complete the flow-chart below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_diagram_labeling": "Label the diagram below.\n\nChoose {ONE WORD ONLY} from the passage for each answer.",
  "reading_short_answer": "Answer the questions below.\n\nChoose {NO MORE THAN TWO WORDS AND/OR A NUMBER} from the passage for each answer.",

  // Listening Instructions
  "listening_form_completion": "Complete the form below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_sentence_completion": "Complete the sentences below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_mc_single": "Choose the correct letter, A, B or C.",
  "listening_mc_multiple": "Choose TWO letters, A-H.",
  "listening_matching": "What does the speaker say about each of the following items?\n\nChoose the correct letter, A, B or C, and write them next to Questions.",
  "listening_plan_map_labeling": "Label the map below.\n\nWrite the correct letter, A-H, next to Questions.",
  "listening_table_completion": "Complete the table below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_plan_map_labeling_free_text": "Label the map below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_flowchart_completion": "Complete the flow-chart below.\n\nWrite {NO MORE THAN TWO WORDS AND/OR A NUMBER} for each answer.",
  "listening_short_answer": "Answer the questions below.\n\nWrite {NO MORE THAN THREE WORDS AND/OR A NUMBER} for each answer."
};

export const INLINE_BLANK_PLACEHOLDER = "........................";

export function formatTranscriptTimestamp(totalSeconds: number) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatElapsedDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function buildTranscriptTextFromSegments(
  segments: NonNullable<AdminTestDraftContentSection["transcriptSegments"]> | undefined
) {
  return (segments ?? [])
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join("\n");
}

export function splitNonEmptyLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function expandMapOptionRangeLines(text: string) {
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

export function normalizeInlineBlankPlaceholders(text: string) {
  return text.replace(/_{3,}/g, INLINE_BLANK_PLACEHOLDER);
}

export function stripGeneratedListeningIntroFromContent(text: string) {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !/^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(trimmed);
    })
    .join("\n")
    .trim();
}

export function extractMatchingOptionValue(option: string) {
  const trimmed = option.trim();
  const prefixMatch = trimmed.match(/^([a-z0-9ivxlcdm]+)[.)]\s*/i);
  return prefixMatch ? prefixMatch[1] : trimmed;
}

export function stripMatchingOptionPrefix(option: string) {
  return option.trim().replace(/^([a-z0-9ivxlcdm]+)[.)]\s*/i, "").trim();
}

export function normalizeMatchingPrefix(prefix: string) {
  return prefix.trim().toUpperCase();
}

export function resolveChoiceAnswerText(
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

export function createDraftId(prefix: string) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getAudioFileDurationSeconds(file: File) {
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

export const FULL_TEST_AUDIO_UPLOAD_ID = "__full_test_audio__";

export type SharedListeningAudioMeta = {
  audioUrl: string;
  audioDurationSeconds: number | null;
};

export function detectSharedListeningAudioSections(sections: AdminTestDraftContentSection[]): SharedListeningAudioMeta | null {
  if (sections.length === 0) {
    return null;
  }

  const firstUrl = String(sections[0]?.audioUrl ?? "").trim();
  if (!firstUrl) {
    return null;
  }

  if (!sections.every((section) => String(section.audioUrl ?? "").trim() === firstUrl)) {
    return null;
  }

  const audioDurationSeconds = sections.find((section) => (section.audioDurationSeconds ?? 0) > 0)?.audioDurationSeconds ?? null;
  return { audioUrl: firstUrl, audioDurationSeconds };
}

export function createDraftContentSection(
  type: AdminTestDraftState["metadata"]["type"],
  index: number,
  sharedListeningAudio?: SharedListeningAudioMeta | null
): AdminTestDraftContentSection {
  return {
    id: createDraftId("draft-section"),
    label: type === "listening" ? "Part " + (index + 1) : "Passage " + (index + 1),
    title: type === "listening" ? "" : "Reading Passage " + (index + 1),
    subtitle: "",
    content: "",
    paragraphs: [],
    showLabels: false,
    mediaKind: type === "listening" ? "audio" : "text",
    audioUrl: type === "listening" ? (sharedListeningAudio?.audioUrl ?? "") : "",
    audioDurationSeconds: type === "listening"
      ? (sharedListeningAudio ? (index === 0 ? sharedListeningAudio.audioDurationSeconds : null) : 0)
      : null,
    transcript: "",
    transcriptSegments: [],
    transcriptQuestionLocations: [],
    markerCount: 0,
  };
}

export function clipboardImageFileName(mimeType: string) {
  const normalizedType = mimeType.toLowerCase();
  if (normalizedType === "image/png") return "clipboard-image.png";
  if (normalizedType === "image/jpeg") return "clipboard-image.jpg";
  if (normalizedType === "image/webp") return "clipboard-image.webp";
  return "clipboard-image";
}
