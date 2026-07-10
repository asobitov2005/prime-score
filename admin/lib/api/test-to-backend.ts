import type { BackendDraftPayload } from "@/lib/api/test-contracts";
import {
  buildParagraphPayloads,
  detectSharedListeningAudio,
  generateUuid,
  getIeltsRange,
  isUuidLike,
  questionTypeAliases,
  sanitizeQuestionGroupTitle,
} from "@/lib/api/test-helpers";
import { sanitizeAdminQuestionGroupOptionFields } from "@/lib/question-group-options";
import { normalizeAdminTestSourceDetail } from "@/lib/test-source";
import type { AdminTestDraftState } from "@/lib/types";

function resolveQuestionType(
  draft: AdminTestDraftState,
  typeId: string,
): string {
  if (typeId === "listening_plan_map_labeling_free_text") {
    return "listening_plan_map_labeling";
  }
  if (typeId.includes("_")) {
    return typeId;
  }
  if (draft.metadata.type === "listening") {
    const listeningType = {
      "mc-single": "listening_mc_single",
      "mc-multiple": "listening_mc_multiple",
      "sentence-completion": "listening_sentence_completion",
      "short-answer": "listening_short_answer",
      completion: "listening_form_completion",
      labeling: "listening_plan_map_labeling",
      matching: "listening_matching",
      "map-free-text": "listening_plan_map_labeling",
    }[typeId];
    if (listeningType) return listeningType;
  }
  return questionTypeAliases[typeId] ?? typeId;
}

export function toBackendDraftPayload(
  draft: AdminTestDraftState,
): BackendDraftPayload {
  const sectionIdMap = new Map<string, string>();
  for (const section of draft.content.sections) {
    sectionIdMap.set(
      section.id,
      isUuidLike(section.id) ? section.id : generateUuid(),
    );
  }

  const questionGroups =
    draft.questionGroups && draft.questionGroups.length > 0
      ? draft.questionGroups
      : [];
  const sharedListeningAudio =
    draft.metadata.type === "listening" && draft.metadata.format === "full"
      ? detectSharedListeningAudio(draft.content.sections)
      : null;

  return {
    metadata: {
      title: draft.metadata.title,
      type: draft.metadata.type,
      format: draft.metadata.format,
      source: draft.metadata.source,
      source_detail: normalizeAdminTestSourceDetail(
        draft.metadata.source,
        draft.metadata.sourceDetail,
      ),
      access_type: draft.metadata.accessType,
      time_limit_label: draft.metadata.timeLimitLabel,
    },
    content: draft.content.sections.map((section, index) => {
      const parsedParagraphs = section.content.trim()
        ? buildParagraphPayloads(
            section.content,
            Boolean(section.showLabels),
          )
        : section.paragraphs || [];
      const range = getIeltsRange(index, draft.metadata.type);
      const autoSubtitle =
        draft.metadata.type === "listening"
          ? `Part ${index + 1}. Questions ${range}.`
          : `You should spend about 20 minutes on Questions ${range}, which are based on Reading Passage ${index + 1} below.`;
      return {
        id: sectionIdMap.get(section.id),
        label:
          draft.metadata.type === "listening"
            ? `Part ${index + 1}`
            : `Passage ${index + 1}`,
        title: section.title,
        subtitle: autoSubtitle,
        content: section.content,
        paragraphs: parsedParagraphs,
        showLabels: Boolean(section.showLabels),
        media_kind: section.mediaKind,
        audio_url: section.audioUrl || "",
        audio_duration_seconds: sharedListeningAudio
          ? index === 0
            ? section.audioDurationSeconds ??
              sharedListeningAudio.audioDurationSeconds ??
              null
            : null
          : section.audioDurationSeconds ?? null,
        transcript: section.transcript || "",
        transcript_segments: (section.transcriptSegments ?? []).map(
          (segment) => ({
            id: segment.id,
            start_sec: segment.startSec,
            end_sec: segment.endSec,
            text: segment.text,
          }),
        ),
        transcript_question_locations: (
          section.transcriptQuestionLocations ?? []
        ).map((location) => ({
          question_id: location.questionId,
          question_label: location.questionLabel,
          question_prompt: location.questionPrompt,
          start_sec: location.startSec,
          end_sec: location.endSec,
          answer_text: location.answerText,
          correct_answer: location.correctAnswer,
        })),
        marker_count: section.markerCount,
      };
    }),
    question_groups: questionGroups.map((group) => {
      const sanitizedGroup = sanitizeAdminQuestionGroupOptionFields(group);
      return {
        id: isUuidLike(sanitizedGroup.id) ? sanitizedGroup.id : undefined,
        section_id:
          sectionIdMap.get(sanitizedGroup.sectionId) ?? generateUuid(),
        title: sanitizeQuestionGroupTitle(sanitizedGroup.title),
        instructions: sanitizedGroup.instructions,
        options_title: sanitizedGroup.optionsTitle,
        type_id: resolveQuestionType(draft, sanitizedGroup.typeId),
        question_start: sanitizedGroup.questionStart,
        question_end: sanitizedGroup.questionEnd,
        shared_options:
          sanitizedGroup.typeId ===
          "listening_plan_map_labeling_free_text"
            ? []
            : sanitizedGroup.sharedOptions,
        question_block: sanitizedGroup.questionBlock,
        answer_block: sanitizedGroup.answerBlock,
        secondary_block: sanitizedGroup.secondaryBlock,
        diagram_title: "",
        diagram_image_url: sanitizedGroup.diagramImageUrl,
        questions: sanitizedGroup.questions.map((question) => ({
          id: isUuidLike(question.id) ? question.id : undefined,
          label: question.label,
          prompt: question.prompt,
          accepted_answers: question.acceptedAnswers,
          explanation: question.explanation,
          variants: question.variants || [],
        })),
      };
    }),
  };
}
