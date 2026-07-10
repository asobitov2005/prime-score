export type TestType = "reading" | "listening" | "writing" | "speaking";

export type TestScope = "full" | "section";

export type AttemptMode = "practice" | "exam";

export type AccessType = "public" | "premium";

export type TestStatus = "draft" | "published" | "archived";

export type PlanDuration = number;

export type LeaderboardPeriod = "week" | "month" | "all_time";

export type ReadingQuestionType =
  | "reading_mc_single"
  | "reading_mc_multiple"
  | "reading_true_false_not_given"
  | "reading_yes_no_not_given"
  | "reading_matching_information"
  | "reading_matching_headings"
  | "reading_matching_features"
  | "reading_matching_sentence_endings"
  | "reading_sentence_completion"
  | "reading_summary_completion_wordbank"
  | "reading_summary_completion_freetext"
  | "reading_note_completion"
  | "reading_table_completion"
  | "reading_flowchart_completion"
  | "reading_diagram_labeling"
  | "reading_short_answer";

export type ListeningQuestionType =
  | "listening_mc_single"
  | "listening_mc_multiple"
  | "listening_matching"
  | "listening_plan_map_labeling"
  | "listening_plan_map_diagram_labeling"
  | "listening_form_completion"
  | "listening_note_completion"
  | "listening_table_completion"
  | "listening_flowchart_completion"
  | "listening_summary_completion"
  | "listening_sentence_completion"
  | "listening_short_answer";

export type QuestionType = ReadingQuestionType | ListeningQuestionType;

export interface TestSectionSummary {
  id: string;
  number: number;
  title: string;
  questionCount: number;
  teaser: string;
}

export interface TestCatalogItem {
  id: string;
  slug: string;
  title: string;
  sectionTitle?: string;
  type: TestType;
  format: "full" | "passage_1" | "passage_2" | "passage_3" | "part_1" | "part_2" | "part_3" | "part_4";
  accessType: AccessType;
  status: TestStatus;
  source: string;
  sourceDetail: string;
  questionCount: number;
  estimatedMinutes: number;
  isPremiumLocked: boolean;
  description: string;
  tags: string[];
  createdAt: string;
  sections: TestSectionSummary[];
}

export type CatalogTest = TestCatalogItem;

export interface TestQuestionOption {
  id: string;
  label: string;
}

export interface TestQuestion {
  id: string;
  number: number;
  label?: string;
  type: QuestionType;
  prompt: string;
  instructions?: string;
  options?: TestQuestionOption[];
  wordBank?: string[];
  answerSlots?: number;
  selectionLimit?: number;
  sectionId?: string;
  sectionTitle?: string;
  groupId?: string;
  groupTitle?: string;
  explanation?: string;
}

export interface TestQuestionGroup {
  id: string;
  title: string;
  type: QuestionType;
  questionStart: number;
  questionEnd: number;
  diagramTitle?: string;
  diagramImageUrl?: string;
  questions: TestQuestion[];
}

export interface ReadingPassage {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  paragraphs: string[];
  questions: TestQuestion[];
  questionGroups: TestQuestionGroup[];
  images?: Array<{ alt: string; caption: string }>;
}

export interface ListeningSegment {
  id: string;
  label: string;
  startSecond: number;
  endSecond: number;
}

export interface ListeningPart {
  id: string;
  title: string;
  subtitle: string;
  transcriptSummary: string;
  segments: ListeningSegment[];
  questions: TestQuestion[];
  questionGroups: TestQuestionGroup[];
  audioDurationSeconds: number;
}

export interface DashboardStat {
  label: string;
  value: string;
  detail: string;
}

export interface DashboardWritingCriteria {
  taskAchievement: number | null;
  coherenceCohesion: number | null;
  lexicalResource: number | null;
  grammaticalRangeAccuracy: number | null;
}

export interface DashboardSpeakingCriteria {
  fluency: number | null;
  lexicalResource: number | null;
  grammar: number | null;
  pronunciation: number | null;
}
