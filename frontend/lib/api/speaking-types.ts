import type { AccessType } from "@/lib/types";

export type SpeakingEntryMode = "full" | "part_1" | "part_2" | "part_3";

export type SpeakingTestListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  accessType: AccessType;
  modeKind: string;
  source: string | null;
  sourceDetail: string | null;
  description: string | null;
  estimatedMinutes: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SpeakingSessionCreateResponse = {
  sessionId: string;
  speakingTestId: string;
  entryMode: SpeakingEntryMode;
  status: string;
};

export type SpeakingHistoryItem = {
  sessionId: string;
  speakingTestId: string;
  title: string;
  entryMode: SpeakingEntryMode;
  status: string;
  source: string | null;
  sourceDetail: string | null;
  overallBand: number | null;
  timeSpentSec: number | null;
  startedAt: string | null;
  endedAt: string | null;
  gradedAt: string | null;
};

export type SpeakingEvaluation = {
  overallBand: number | null;
  fluencyBand: number | null;
  lexicalBand: number | null;
  grammarBand: number | null;
  pronunciationBand: number | null;
  summaryFeedback: string;
  strengths: string[];
  criticalIssues: string[];
  pronunciationIssues: string[];
  grammarIssues: string[];
  lexicalIssues: string[];
  improvementActions: string[];
  deepFeedbackMarkdown: string;
  evaluatorModel: string | null;
  rubricVersion: string | null;
};

export type SpeakingAudioAsset = {
  id: string;
  speakerRole: string;
  storagePath: string;
  mimeType: string;
  durationMs: number | null;
  channelKind: string;
  metadata: Record<string, unknown>;
};

export type SpeakingDiarizedTranscriptItem = {
  role: string;
  text: string;
  at: string | null;
  offsetMs: number | null;
};

export type SpeakingStructuredFeedback = {
  criteriaFeedback: Record<string, unknown>;
  errorFeedback: Array<Record<string, unknown>>;
  strengths: string[];
  improvementActions: string[];
};

export type SpeakingSessionResult = {
  sessionId: string;
  speakingTestId: string;
  title: string;
  entryMode: SpeakingEntryMode;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  gradedAt: string | null;
  transcript: string;
  candidateTranscript: string;
  examinerTranscript: string;
  diarizedTranscript: SpeakingDiarizedTranscriptItem[];
  audioAssets: SpeakingAudioAsset[];
  structuredFeedback: SpeakingStructuredFeedback;
  evaluation: SpeakingEvaluation | null;
  turnCount: number | null;
  plannedQuestionCount: number | null;
  questionsAnswered: number | null;
};

export type SpeakingTopicItem = {
  id: string;
  partNumber: number;
  topicTitle: string;
  promptText: string;
  bulletPoints: string[];
  sampleQuestions: string[];
  difficultyLabel: string | null;
  categoryTags: string[];
  icon: string | null;
  iconTone: string | null;
  isNewTopic: boolean;
  followupGroupKey: string | null;
};

export type BackendSpeakingTestListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  access_type: AccessType;
  mode_kind: string;
  source?: string | null;
  source_detail?: string | null;
  description?: string | null;
  estimated_minutes: number;
  version: number;
  created_at: string;
  updated_at: string;
};

export type BackendSpeakingSessionCreateResponse = {
  session_id: string;
  speaking_test_id: string;
  entry_mode: SpeakingEntryMode;
  status: string;
};

export type BackendSpeakingHistoryItem = {
  session_id: string;
  speaking_test_id: string;
  title: string;
  entry_mode: SpeakingEntryMode;
  status: string;
  source?: string | null;
  source_detail?: string | null;
  overall_band?: number | null;
  time_spent_sec?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  graded_at?: string | null;
};

export type BackendSpeakingEvaluation = {
  overall_band?: number | null;
  fluency_band?: number | null;
  lexical_band?: number | null;
  grammar_band?: number | null;
  pronunciation_band?: number | null;
  summary_feedback?: string;
  strengths?: string[];
  critical_issues?: string[];
  pronunciation_issues?: string[];
  grammar_issues?: string[];
  lexical_issues?: string[];
  improvement_actions?: string[];
  deep_feedback_markdown?: string;
  evaluator_model?: string | null;
  rubric_version?: string | null;
};

export type BackendSpeakingSessionResult = {
  session_id: string;
  speaking_test_id: string;
  title: string;
  entry_mode: SpeakingEntryMode;
  status: string;
  started_at?: string | null;
  ended_at?: string | null;
  graded_at?: string | null;
  transcript?: string;
  candidate_transcript?: string;
  examiner_transcript?: string;
  diarized_transcript?: Array<{
    role?: string;
    text?: string;
    at?: string | null;
    offset_ms?: number | null;
  }>;
  audio_assets?: Array<{
    id: string;
    speaker_role: string;
    storage_path: string;
    mime_type: string;
    duration_ms?: number | null;
    channel_kind: string;
    metadata?: Record<string, unknown>;
  }>;
  structured_feedback?: {
    criteria_feedback?: Record<string, unknown>;
    error_feedback?: Array<Record<string, unknown>>;
    strengths?: string[];
    improvement_actions?: string[];
  };
  evaluation?: BackendSpeakingEvaluation | null;
  turn_count?: number | null;
  planned_question_count?: number | null;
  questions_answered?: number | null;
};

export type BackendSpeakingTopicItem = {
  id: string;
  part_number: number;
  topic_title: string;
  prompt_text: string;
  bullet_points?: string[];
  sample_questions?: string[];
  difficulty_label?: string | null;
  category_tags?: string[];
  icon?: string | null;
  icon_tone?: string | null;
  is_new_topic?: boolean;
  followup_group_key?: string | null;
};
