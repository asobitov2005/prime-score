import type {
  BackendAdminDraft,
  BackendAdminTest,
} from "@/lib/api/test-contracts";
import {
  resolveAdminQuestionType,
  sanitizeListeningSectionContent,
  sanitizeListeningSectionTitle,
  sanitizeQuestionGroupTitle,
} from "@/lib/api/test-helpers";
import {
  mapTranscriptQuestionLocations,
  mapTranscriptSegments,
} from "@/lib/api/transcript";
import { sanitizeAdminQuestionGroupOptionFields } from "@/lib/question-group-options";
import { normalizeAdminTestSourceDetail } from "@/lib/test-source";
import type {
  AdminTestDraftState,
  AdminTestSummary,
} from "@/lib/types";

export function mapAdminTest(test: BackendAdminTest): AdminTestSummary {
  return {
    id: test.id,
    title: test.title,
    type: test.test_type,
    format: test.format,
    source: test.source,
    sourceDetail: normalizeAdminTestSourceDetail(
      test.source,
      test.source_detail,
    ),
    accessType: test.access_type,
    status: test.status,
    reviewStatus: test.review_status ?? "needs_review",
    updatedAt: test.updated_at ?? new Date().toISOString(),
    questions: test.total_questions,
    version: test.version,
  };
}

export function mapAdminDraft(
  draft: BackendAdminDraft,
): AdminTestDraftState {
  return {
    metadata: {
      title: draft.metadata.title,
      type: draft.metadata.type,
      format: draft.metadata.format ?? "full",
      source: draft.metadata.source,
      sourceDetail: normalizeAdminTestSourceDetail(
        draft.metadata.source,
        draft.metadata.source_detail,
      ),
      accessType: draft.metadata.access_type,
      status: draft.metadata.status,
      version: draft.metadata.version,
      timeLimitLabel: draft.metadata.time_limit_label,
    },
    content: {
      sections: draft.content.sections.map((section) => ({
        id: section.id,
        label: section.label,
        title: sanitizeListeningSectionTitle(
          draft.metadata.type,
          section.title,
        ),
        subtitle: section.subtitle,
        content: sanitizeListeningSectionContent(
          draft.metadata.type,
          section.content,
        ),
        paragraphs: section.paragraphs,
        showLabels: section.showLabels,
        mediaKind: section.media_kind,
        audioUrl: section.audio_url ?? "",
        audioDurationSeconds: section.audio_duration_seconds ?? null,
        transcript: section.transcript ?? "",
        transcriptSegments: mapTranscriptSegments(
          section.transcript_segments,
        ),
        transcriptQuestionLocations: mapTranscriptQuestionLocations(
          section.transcript_question_locations,
        ),
        markerCount: section.marker_count,
      })),
    },
    questionGroups: (draft.questionGroups ?? []).map((group) =>
      sanitizeAdminQuestionGroupOptionFields({
        id: group.id,
        sectionId: group.section_id,
        title: sanitizeQuestionGroupTitle(String(group.title ?? "")),
        instructions: group.instructions,
        optionsTitle: group.options_title ?? "",
        typeId: resolveAdminQuestionType(
          group.type_id,
          group.shared_options,
        ),
        questionStart: group.question_start,
        questionEnd: group.question_end,
        sharedOptions: group.shared_options,
        questionBlock: group.question_block,
        answerBlock: group.answer_block,
        secondaryBlock: group.secondary_block,
        rawContent: group.raw_content,
        diagramTitle: group.diagram_title,
        diagramImageUrl: group.diagram_image_url,
        questions: group.questions.map((question) => ({
          id: question.id,
          label: question.label,
          prompt: question.prompt,
          acceptedAnswers: question.accepted_answers,
          explanation: question.explanation,
          variants: question.variants,
        })),
      }),
    ),
    questions: (draft.questions ?? []).map((question) => ({
      id: question.id,
      label: question.label,
      prompt: question.prompt,
      acceptedAnswers: question.accepted_answers,
      explanation: question.explanation,
      variants: question.variants,
    })),
    review: {
      checklist: draft.review.checklist,
      notes: draft.review.notes,
    },
    decisions: {
      questionBank: draft.decisions.question_bank,
      payment: draft.decisions.payment,
      listeningTimer: draft.decisions.listening_timer,
    },
  };
}
