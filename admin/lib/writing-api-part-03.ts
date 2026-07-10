import { WritingQuestionSubtype } from "./writing-api-part-01";

export function describeSubmissionStatus(s: string | null | undefined): string {
  if (!s) return "Unknown grading state.";
  const normalized = s.toLowerCase();
  if (normalized === "queued") return "Waiting in the grading queue.";
  if (normalized === "running" || normalized === "processing") return "Grading is in progress.";
  if (normalized === "completed") return "Evaluation finished successfully.";
  if (normalized === "failed") return "Grading stopped with an error.";
  return s;
}

export const QUESTION_SUBTYPES_TASK1: { value: WritingQuestionSubtype; label: string }[] = [
  { value: "bar_chart", label: "Bar Chart" },
  { value: "line_graph", label: "Line Graph" },
  { value: "pie_chart", label: "Pie Chart" },
  { value: "table", label: "Table" },
  { value: "process", label: "Process" },
  { value: "map", label: "Map" },
  { value: "two_charts", label: "Two Charts" },
];

export const QUESTION_SUBTYPES_TASK2: { value: WritingQuestionSubtype; label: string }[] = [
  { value: "opinion", label: "Opinion Essay" },
  { value: "advantages_disadvantages", label: "Advantages & Disadvantages" },
  { value: "discussion", label: "Discussion Essay" },
  { value: "problem_solution", label: "Problem & Solution" },
  { value: "two_part", label: "Two-Part Question" },
  { value: "causes_effects", label: "Causes & Effects" },
  { value: "direct_question", label: "Direct Question" },
];
