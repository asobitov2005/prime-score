import { ADMIN_PUBLIC_API_BASE_URL } from "./writing-api-dependencies";

export const baseUrl = ADMIN_PUBLIC_API_BASE_URL;

export type WritingTaskType = "task_1" | "task_2";

export type WritingTaskStatus = "draft" | "published" | "archived";

export type WritingDifficulty = "easy" | "medium" | "hard";

export type WritingQuestionSubtype =
  | "bar_chart" | "line_graph" | "pie_chart" | "table"
  | "process" | "map" | "two_charts"
  | "opinion" | "advantages_disadvantages" | "discussion"
  | "problem_solution" | "two_part" | "causes_effects" | "direct_question";

export type WritingImageSummaryStatus =
  | "not_required"
  | "pending"
  | "ready"
  | "failed";

export interface WritingTask {
  id: string;
  title: string;
  task_type: WritingTaskType;
  prompt_html: string;
  image_url: string | null;
  image_summary: string | null;
  image_summary_status: WritingImageSummaryStatus | string;
  word_minimum: number;
  time_limit_seconds: number;
  difficulty: WritingDifficulty;
  status: WritingTaskStatus;
  source: string | null;
  question_subtype: WritingQuestionSubtype | null;
  description: string | null;
  sample_band: number | null;
  sample_answer: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface WritingTaskListResponse {
  items: WritingTask[];
  total: number;
}

export interface WritingTaskCreateInput {
  title: string;
  task_type: WritingTaskType;
  prompt_html: string;
  image_url?: string | null;
  word_minimum: number;
  time_limit_seconds: number;
  difficulty: WritingDifficulty;
  source?: string | null;
  question_subtype: WritingQuestionSubtype;
  description?: string | null;
  sample_band?: number | null;
  sample_answer?: string | null;
  status: WritingTaskStatus;
}

export type WritingTaskUpdateInput = Partial<WritingTaskCreateInput>;

export interface WritingSubmission {
  id: string;
  user_id: string;
  user_display_name?: string | null;
  user_username?: string | null;
  user_phone?: string | null;
  task_id: string;
  task_title?: string | null;
  task_type: WritingTaskType;
  essay_text?: string;
  word_count: number;
  status: string;
  submitted_at: string;
  time_spent_seconds?: number;
  overall_band?: number | null;
  graded_at?: string | null;
  error_message?: string | null;
  evaluation?: WritingEvaluation | null;
}

export interface WritingCriterionFeedback {
  band: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  evidence_quotes: string[];
  reasoning: string;
}

export interface WritingInlineAnnotation {
  offset: number;
  length: number;
  original: string;
  replacements: string[];
  category: string;
  severity?: string | null;
  short_message?: string | null;
  explanation?: string | null;
  band_impact?: string | null;
  examiner_tip?: string | null;
  improved_sentence?: string | null;
}

export interface WritingVocabularySuggestion {
  current_phrase: string;
  improved_phrase: string;
  level: string;
  why_it_works: string;
  example_sentence: string;
}

export interface WritingRoastFeedback {
  overall_roast: string;
  one_liner: string;
  task_achievement_zinger: string;
  coherence_zinger: string;
  lexical_zinger: string;
  grammar_zinger: string;
  savage_tips: string[];
  pep_talk: string;
}

export interface WritingEvaluation {
  submission_id: string;
  task_id: string;
  task_type: WritingTaskType;
  task_title: string;
  word_count: number;
  word_minimum: number;
  time_spent_seconds: number;
  submitted_at: string;
  graded_at: string;
  essay_text: string;
  overall_band: number;
  potential_band?: number | null;
  word_count_penalty: number;
  task_achievement: WritingCriterionFeedback;
  coherence: WritingCriterionFeedback;
  lexical: WritingCriterionFeedback;
  grammar: WritingCriterionFeedback;
  inline_annotations: WritingInlineAnnotation[];
  vocabulary_suggestions: WritingVocabularySuggestion[];
  improved_version?: string | null;
  overall_summary: string;
  next_steps: string[];
  roast?: WritingRoastFeedback | null;
  cache_hit?: boolean;
  model_version?: string;
  prompt_version?: string;
  grader_profile_version?: number | null;
  rubric_version?: number | null;
  anchor_set_version?: number | null;
  roast_profile_version?: number | null;
  improved_profile_version?: number | null;
  annotation_profile_version?: number | null;
}

export interface WritingSubmissionListResponse {
  items: WritingSubmission[];
  total: number;
}
