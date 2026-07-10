"use client";

import { PreviewTranscriptQuestionLocation, PreviewTranscriptSegment, QuestionType } from "./dependencies";



export type PreviewMode = "practice" | "exam" | "review" | "guest";

export type PreviewDialog = "submit" | "leave" | "fullscreen" | null;

export type SubmitReason = "user_confirmed" | "time_up" | "exit_fullscreen";

export type FullscreenDialogStage = "confirm-exit" | "exited-warning" | null;

export type StrictListeningPhase = "idle" | "waiting" | "playing" | "transfer" | "complete";

export type TextHighlight = { id: string; start: number; end: number };

export type PreviewUiState = {
  theme?: "light" | "dark";
  splitRatio?: number;
  fontScale?: number;
  activeQuestionId?: string;
};

export type TextRange = { start: number; end: number };

export type SelectionToolbarState = {
  blockKey: string;
  start: number;
  end: number;
  top: number;
  left: number;
} | null;

export const LISTENING_TRANSFER_SECONDS = 120;

export interface PreviewParagraph {
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

export interface PreviewQuestion {
  id: string;
  number: number;
  label?: string;
  selectionLimit?: number;
  type: QuestionType | "tfng" | "mcq" | "gap";
  prompt: string;
  options?: string[];
  instruction?: string;
}

export interface PreviewGroup {
  id: string;
  title: string;
  instruction: string;
  optionsTitle?: string;
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

export interface PreviewSection {
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
  testId?: string;
  testSlug?: string;
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
  initialSectionTimeSpentSeconds?: Record<string, number>;
  initialUiState?: PreviewUiState;
  initialReviewTarget?: {
    sectionId?: string;
    questionId?: string;
    questionType?: string;
  };
  reviewItems?: Record<string, {
    answerValue?: string | null;
    isCorrect?: boolean | null;
    correctAnswers: string[];
    options?: string[];
    questionType?: string;
    explanation?: string | null;
    explanationReference?: {
      quote?: string;
      highlighted_answer?: string;
      answer_status?: "valid" | "possibly_wrong" | "uncertain" | string;
      suggested_answers?: string[];
      issue?: string;
      confidence?: number | null;
      quote_verified?: boolean;
    } | null;
  }>;
}

export const PASSAGE_PARAGRAPHS: PreviewParagraph[] = [
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

export const QUESTION_GROUPS: PreviewGroup[] = [
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
