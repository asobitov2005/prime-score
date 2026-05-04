import type { QuestionTypeOption } from "@/lib/types";

export const readingQuestionTypes: QuestionTypeOption[] = [
  { id: "reading_mc_single", label: "Multiple Choice (single answer)", family: "selection", description: "One correct option." },
  { id: "reading_mc_multiple", label: "Multiple Choice (multiple answers)", family: "selection", description: "Multiple correct options." },
  { id: "reading_true_false_not_given", label: "True / False / Not Given", family: "selection", description: "Three-way truth classification." },
  { id: "reading_yes_no_not_given", label: "Yes / No / Not Given", family: "selection", description: "Author claim agreement." },
  { id: "reading_matching_information", label: "Matching Information", family: "matching", description: "Match facts to paragraphs." },
  { id: "reading_matching_headings", label: "Matching Headings", family: "matching", description: "Choose the best heading." },
  { id: "reading_matching_features", label: "Matching Features", family: "matching", description: "Connect items to statements." },
  { id: "reading_matching_sentence_endings", label: "Matching Sentence Endings", family: "matching", description: "Pair sentence halves." },
  { id: "reading_sentence_completion", label: "Sentence Completion", family: "completion", description: "Fill in blanks from passage." },
  { id: "reading_summary_completion_wordbank", label: "Summary Completion (with word bank)", family: "completion", description: "Use provided word options." },
  { id: "reading_summary_completion_freetext", label: "Summary Completion (free text)", family: "completion", description: "Type the answer exactly." },
  { id: "reading_note_completion", label: "Note / Table / Flow-chart Completion", family: "completion", description: "Structured completion blocks." },
  { id: "reading_diagram_labeling", label: "Diagram / Map Labeling", family: "labeling", description: "Label a visual asset." },
  { id: "reading_short_answer", label: "Short Answer Questions", family: "short-answer", description: "Concise answer input." }
];

export const listeningQuestionTypes: QuestionTypeOption[] = [
  { id: "listening_mc_single", label: "MC Single", family: "selection", description: "One correct option." },
  { id: "listening_mc_multiple", label: "MC Multiple", family: "selection", description: "Multiple correct options." },
  { id: "listening_matching", label: "Matching", family: "matching", description: "Pair items with answers." },
  { id: "listening_plan_map_labeling", label: "Map Labeling (dropdown options)", family: "labeling", description: "Choose map labels from configured options." },
  { id: "listening_form_completion", label: "Form / Note / Table / Flow-chart / Summary Completion", family: "completion", description: "Structured blank filling." },
  { id: "listening_sentence_completion", label: "Sentence Completion", family: "completion", description: "Complete the sentence." },
  { id: "listening_short_answer", label: "Short Answer", family: "short-answer", description: "Concise answer input." },
  { id: "listening_plan_map_labeling_free_text", label: "Map Labeling (free text)", family: "labeling", description: "Type each map label manually." }
];
