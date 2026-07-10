"use client";

import { BarChart3, CircleDot, FileQuestion, LayoutPanelTop, LineChart, Map, MessageSquareText, PieChart, Route, Sparkles, SplitSquareHorizontal, Table2, WritingDifficulty, WritingQuestionSubtype, WritingTask, WritingTaskStatus, WritingTaskType } from "./dependencies";



export interface WritingTaskFormProps {
  mode: "create" | "edit";
  task?: WritingTask | null;
}

export interface FormState {
  title: string;
  task_type: WritingTaskType;
  image_url: string | null;
  word_minimum: number;
  time_limit_minutes: number;
  difficulty: WritingDifficulty;
  source: string;
  description: string;
  sample_band: string;
  sample_answer: string;
  question_subtype: WritingQuestionSubtype | null;
  status: Exclude<WritingTaskStatus, "archived">;
}

export const subtypeIcons: Record<WritingQuestionSubtype, typeof BarChart3> = {
  bar_chart: BarChart3,
  line_graph: LineChart,
  pie_chart: PieChart,
  table: Table2,
  process: Route,
  map: Map,
  two_charts: LayoutPanelTop,
  opinion: CircleDot,
  advantages_disadvantages: SplitSquareHorizontal,
  discussion: MessageSquareText,
  problem_solution: FileQuestion,
  two_part: LayoutPanelTop,
  causes_effects: Route,
  direct_question: Sparkles,
};

export function defaultsForType(t: WritingTaskType): { word_minimum: number; time_limit_minutes: number } {
  return t === "task_1"
    ? { word_minimum: 150, time_limit_minutes: 20 }
    : { word_minimum: 250, time_limit_minutes: 40 };
}

export function buildInitialState(task: WritingTask | null | undefined): FormState {
  if (task) {
    return {
      title: task.title,
      task_type: task.task_type,
      image_url: task.image_url ?? null,
      word_minimum: task.word_minimum,
      time_limit_minutes: Math.max(1, Math.round(task.time_limit_seconds / 60)),
      difficulty: task.difficulty,
      source: task.source ?? "",
      description: task.description ?? "",
      sample_band: task.sample_band != null ? String(task.sample_band) : "",
      sample_answer: task.sample_answer ?? "",
      question_subtype: task.question_subtype ?? null,
      status: task.status === "archived" ? "draft" : task.status
    };
  }
  const defaults = defaultsForType("task_2");
  return {
    title: "",
    task_type: "task_2",
    image_url: null,
    word_minimum: defaults.word_minimum,
    time_limit_minutes: defaults.time_limit_minutes,
    difficulty: "medium",
    source: "",
    description: "",
    sample_band: "",
    sample_answer: "",
    question_subtype: null,
    status: "draft"
  };
}
