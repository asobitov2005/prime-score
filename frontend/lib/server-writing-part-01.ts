export type WritingTaskType = "task_1" | "task_2";

export type WritingQuestionSubtype =
  | "bar_chart" | "line_graph" | "pie_chart" | "table"
  | "process" | "map" | "two_charts"
  | "opinion" | "advantages_disadvantages" | "discussion"
  | "problem_solution" | "two_part" | "causes_effects" | "direct_question";

export type WritingSubmissionStatus =
  | "queued"
  | "QUEUED"
  | "processing"
  | "PROCESSING"
  | "completed"
  | "COMPLETED"
  | "failed"
  | "FAILED";

export interface WritingTaskListItem {
  id: string;
  title: string;
  task_type: WritingTaskType;
  image_url?: string | null;
  word_minimum: number;
  time_limit_seconds: number;
  question_subtype?: WritingQuestionSubtype | null;
  source?: string | null;
  description?: string | null;
  created_at?: string;
}

export interface WritingTaskListResponse {
  items: WritingTaskListItem[];
  total: number;
}

export interface WritingTaskDetail extends WritingTaskListItem {
  prompt_html: string;
  image_summary?: string | null;
}

export interface WritingSubmissionRecord {
  id: string;
  status: WritingSubmissionStatus;
  error_message?: string | null;
  task_id?: string;
  task_title?: string;
  task_type?: WritingTaskType;
  word_count?: number | null;
  desired_score?: number | string | null;
  overall_band?: number | string | null;
  submitted_at?: string | null;
  graded_at?: string | null;
}

export interface WritingCriterionEvaluation {
  band: number | string;
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

export interface WritingActionPlan {
  main_limiter: string;
  main_limiter_band: number | string;
  strongest_area: string;
  strongest_area_band: number | string;
  fixes: string[];
}

export interface WritingTargetAction {
  title: string;
  why: string;
  how: string;
  example: string;
  band_impact: string;
  priority: number;
}

export interface WritingBandBoundary {
  criterion: string;
  current_band: number | string;
  next_band: number | string;
  why_current: string;
  required_for_next: string;
}

export interface WritingScoreBooster {
  criterion: string;
  original: string;
  why_it_scores: string;
  keep_doing: string;
  band_value: string;
}

export interface WritingChecklistItem {
  label: string;
  status: "met" | "partial" | "missing" | string;
  detail: string;
  how_to_fix?: string;
}

export interface WritingErrorPattern {
  category: string;
  subcategory?: string;
  label: string;
  count: number;
  percentage: number;
  examples: string[];
  fix?: string;
}

export interface WritingSentenceFix {
  priority: number;
  original: string;
  replacement: string;
  corrected_sentence: string;
  why: string;
  band_impact: string;
  category: string;
}

export interface WritingRevisionDiff {
  original: string;
  revised: string;
  reason: string;
  criterion: string;
}
