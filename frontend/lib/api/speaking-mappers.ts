import type {
  BackendSpeakingEvaluation,
  BackendSpeakingHistoryItem,
  BackendSpeakingSessionCreateResponse,
  BackendSpeakingSessionResult,
  BackendSpeakingTestListItem,
  BackendSpeakingTopicItem,
  SpeakingEvaluation,
  SpeakingHistoryItem,
  SpeakingSessionCreateResponse,
  SpeakingSessionResult,
  SpeakingTestListItem,
  SpeakingTopicItem,
} from "@/lib/api/speaking-types";

export function mapSpeakingTest(
  item: BackendSpeakingTestListItem,
): SpeakingTestListItem {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    status: item.status,
    accessType: item.access_type,
    modeKind: item.mode_kind,
    source: item.source ?? null,
    sourceDetail: item.source_detail ?? null,
    description: item.description ?? null,
    estimatedMinutes: item.estimated_minutes,
    version: item.version,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export function mapSpeakingSession(
  item: BackendSpeakingSessionCreateResponse,
): SpeakingSessionCreateResponse {
  return {
    sessionId: item.session_id,
    speakingTestId: item.speaking_test_id,
    entryMode: item.entry_mode,
    status: item.status,
  };
}

export function mapSpeakingHistoryItem(
  item: BackendSpeakingHistoryItem,
): SpeakingHistoryItem {
  return {
    sessionId: item.session_id,
    speakingTestId: item.speaking_test_id,
    title: item.title,
    entryMode: item.entry_mode,
    status: item.status,
    source: item.source ?? null,
    sourceDetail: item.source_detail ?? null,
    overallBand: item.overall_band ?? null,
    timeSpentSec: item.time_spent_sec ?? null,
    startedAt: item.started_at ?? null,
    endedAt: item.ended_at ?? null,
    gradedAt: item.graded_at ?? null,
  };
}

export function mapSpeakingEvaluation(
  item: BackendSpeakingEvaluation | null | undefined,
): SpeakingEvaluation | null {
  if (!item) {
    return null;
  }
  return {
    overallBand: item.overall_band ?? null,
    fluencyBand: item.fluency_band ?? null,
    lexicalBand: item.lexical_band ?? null,
    grammarBand: item.grammar_band ?? null,
    pronunciationBand: item.pronunciation_band ?? null,
    summaryFeedback: item.summary_feedback ?? "",
    strengths: item.strengths ?? [],
    criticalIssues: item.critical_issues ?? [],
    pronunciationIssues: item.pronunciation_issues ?? [],
    grammarIssues: item.grammar_issues ?? [],
    lexicalIssues: item.lexical_issues ?? [],
    improvementActions: item.improvement_actions ?? [],
    deepFeedbackMarkdown: item.deep_feedback_markdown ?? "",
    evaluatorModel: item.evaluator_model ?? null,
    rubricVersion: item.rubric_version ?? null,
  };
}

export function mapSpeakingSessionResult(
  item: BackendSpeakingSessionResult,
): SpeakingSessionResult {
  const structuredFeedback = item.structured_feedback ?? {};
  return {
    sessionId: item.session_id,
    speakingTestId: item.speaking_test_id,
    title: item.title,
    entryMode: item.entry_mode,
    status: item.status,
    startedAt: item.started_at ?? null,
    endedAt: item.ended_at ?? null,
    gradedAt: item.graded_at ?? null,
    transcript: item.transcript ?? "",
    candidateTranscript: item.candidate_transcript ?? "",
    examinerTranscript: item.examiner_transcript ?? "",
    diarizedTranscript: (item.diarized_transcript ?? [])
      .filter((entry) => entry.role && entry.text)
      .map((entry) => ({
        role: entry.role ?? "",
        text: entry.text ?? "",
        at: entry.at ?? null,
        offsetMs: entry.offset_ms ?? null,
      })),
    audioAssets: (item.audio_assets ?? []).map((asset) => ({
      id: asset.id,
      speakerRole: asset.speaker_role,
      storagePath: asset.storage_path,
      mimeType: asset.mime_type,
      durationMs: asset.duration_ms ?? null,
      channelKind: asset.channel_kind,
      metadata: asset.metadata ?? {},
    })),
    structuredFeedback: {
      criteriaFeedback: structuredFeedback.criteria_feedback ?? {},
      errorFeedback: structuredFeedback.error_feedback ?? [],
      strengths: structuredFeedback.strengths ?? [],
      improvementActions: structuredFeedback.improvement_actions ?? [],
    },
    evaluation: mapSpeakingEvaluation(item.evaluation),
    turnCount: typeof item.turn_count === "number" ? item.turn_count : null,
    plannedQuestionCount:
      typeof item.planned_question_count === "number"
        ? item.planned_question_count
        : null,
    questionsAnswered:
      typeof item.questions_answered === "number"
        ? item.questions_answered
        : null,
  };
}

export function mapSpeakingTopic(
  item: BackendSpeakingTopicItem,
): SpeakingTopicItem {
  return {
    id: item.id,
    partNumber: item.part_number,
    topicTitle: item.topic_title,
    promptText: item.prompt_text,
    bulletPoints: item.bullet_points ?? [],
    sampleQuestions: item.sample_questions ?? [],
    difficultyLabel: item.difficulty_label ?? null,
    categoryTags: item.category_tags ?? [],
    icon: item.icon ?? null,
    iconTone: item.icon_tone ?? null,
    isNewTopic: item.is_new_topic === true,
    followupGroupKey: item.followup_group_key ?? null,
  };
}
