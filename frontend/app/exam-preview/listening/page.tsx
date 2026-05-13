import { ExamPreviewAccessGate } from "@/components/exam/exam-preview-access-gate";
import { ReadingExamPreview, type ReadingExamPreviewData } from "@/components/exam/reading-exam-preview";
import { getBackendAttempt, getBackendAttemptReview } from "@/lib/server-attempts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface ListeningExamPreviewPageProps {
  searchParams?: {
    mode?: string;
    attemptId?: string;
  };
}

type RawParagraph = string | { id?: string; text?: string; label?: string };

function normalizeTranscriptSegments(
  segments:
    | Array<{
        id?: string;
        start_sec?: number;
        end_sec?: number;
        text?: string;
      }>
    | null
    | undefined
) {
  return (segments ?? [])
    .filter((segment) => typeof segment?.text === "string" && segment.text.trim().length > 0)
    .map((segment, index) => ({
      id: String(segment.id ?? `segment-${index + 1}`),
      startSec: Math.max(0, Number(segment.start_sec ?? 0)),
      endSec: Math.max(0, Number(segment.end_sec ?? segment.start_sec ?? 0)),
      text: String(segment.text ?? "").trim(),
    }));
}

function normalizeTranscriptQuestionLocations(
  locations:
    | Array<{
        question_id?: string | null;
        question_label?: string;
        question_prompt?: string;
        start_sec?: number;
        end_sec?: number;
        answer_text?: string;
        correct_answer?: string;
      }>
    | null
    | undefined
) {
  return (locations ?? [])
    .filter((location) => typeof location?.question_label === "string" && location.question_label.trim().length > 0)
    .map((location) => ({
      questionId: location.question_id ?? undefined,
      questionLabel: String(location.question_label ?? "").trim(),
      questionPrompt: String(location.question_prompt ?? "").trim(),
      startSec: Math.max(0, Number(location.start_sec ?? 0)),
      endSec: Math.max(0, Number(location.end_sec ?? location.start_sec ?? 0)),
      answerText: String(location.answer_text ?? "").trim(),
      correctAnswer: String(location.correct_answer ?? "").trim(),
    }));
}

function listeningSectionQuestionOffset(partNumber: number) {
  if (partNumber <= 1) return 0;
  if (partNumber === 2) return 10;
  if (partNumber === 3) return 20;
  if (partNumber === 4) return 30;
  return 0;
}

function resolveEffectiveListeningQuestionOffset(partNumber: number, sectionQuestionStart: number | null) {
  const baseOffset = listeningSectionQuestionOffset(partNumber);
  if (baseOffset === 0) {
    return 0;
  }
  if ((sectionQuestionStart ?? 0) > 1) {
    return 0;
  }
  return baseOffset;
}

function resolveListeningSectionNumber(snapshotFormat: string | null | undefined, fallbackNumber: number, sectionIndex: number, totalSections: number) {
  if (totalSections > 1) {
    return fallbackNumber || sectionIndex + 1;
  }

  const formatMatch = String(snapshotFormat ?? "").match(/^part_(\d+)$/i);
  if (formatMatch) {
    return Number(formatMatch[1]);
  }

  return fallbackNumber || 1;
}

function offsetQuestionLabel(label: string | null | undefined, offset: number) {
  if (!label || offset === 0) {
    return label ?? undefined;
  }
  return label.replace(/\d+/g, (value) => String(Number(value) + offset));
}

function offsetQuestionReferences(text: string | null | undefined, offset: number) {
  if (!text || offset === 0) {
    return text ?? undefined;
  }
  return text.replace(/\bQuestions?\s+(\d+)(?:-(\d+))?/g, (_, start, end) => {
    if (end) {
      return `Questions ${Number(start) + offset}-${Number(end) + offset}`;
    }
    return `Question ${Number(start) + offset}`;
  });
}

function buildSubtitle(questionStart: number | null, questionEnd: number | null, isFullTest: boolean) {
  if (questionStart === null || questionEnd === null) {
    return "Listen to the audio and answer the questions in the panel on the right.";
  }

  if (isFullTest) {
    return `Listen to the recording and answer questions ${questionStart}-${questionEnd} in the panel on the right.`;
  }

  return `Listen to the recording and answer questions ${questionStart}-${questionEnd} in the panel on the right.`;
}

function extractParagraphText(paragraph: RawParagraph) {
  if (typeof paragraph !== "string") {
    return paragraph.text ?? "";
  }

  const trimmed = paragraph.trim();
  if (!trimmed.startsWith("{") || !trimmed.includes("text")) {
    return paragraph;
  }

  const textMarker = trimmed.match(/['"]text['"]\s*:\s*/);
  if (!textMarker) {
    return paragraph;
  }

  const textStart = textMarker.index! + textMarker[0].length;
  const quote = trimmed[textStart];
  const labelMarker = trimmed.lastIndexOf(", 'label':");
  const doubleLabelMarker = trimmed.lastIndexOf(', "label":');
  const endMarker = Math.max(labelMarker, doubleLabelMarker);

  if ((quote !== "'" && quote !== '"') || endMarker <= textStart) {
    return paragraph;
  }

  return trimmed.slice(textStart + 1, endMarker - 1);
}

async function buildAttemptPreviewData(attemptId: string): Promise<ReadingExamPreviewData | null> {
  const attempt = await getBackendAttempt(attemptId).catch(() => null);
  const snapshot = attempt?.test_snapshot;

  if (!attempt || !snapshot || snapshot.test_type !== "listening" || !snapshot.sections?.length) {
    return null;
  }

  const paragraphs: ReadingExamPreviewData["paragraphs"] = [];
  const questionGroups: ReadingExamPreviewData["questionGroups"] = [];
  const sections = snapshot.sections ?? [];
  let firstQuestionNumber: number | null = null;
  let lastQuestionNumber: number | null = null;

  sections.forEach((section, sectionIndex) => {
    const questionNumbers = (section.question_groups ?? []).flatMap((group) => [group.question_start, group.question_end]);
    const sectionQuestionStart = questionNumbers.length ? Math.min(...questionNumbers) : null;
    const sectionQuestionEnd = questionNumbers.length ? Math.max(...questionNumbers) : null;
    const resolvedPartNumber = resolveListeningSectionNumber(
      snapshot.format,
      section.section_number,
      sectionIndex,
      sections.length,
    );
    const questionOffset = sections.length > 1
      ? 0
      : resolveEffectiveListeningQuestionOffset(resolvedPartNumber, sectionQuestionStart);
    const adjustedQuestionStart = sectionQuestionStart === null ? null : sectionQuestionStart + questionOffset;
    const adjustedQuestionEnd = sectionQuestionEnd === null ? null : sectionQuestionEnd + questionOffset;
    const sectionLabel = `Part ${resolvedPartNumber}`;
    const sectionPreviewLabel = `Listening Section ${resolvedPartNumber}`;
    const transcriptSegments = normalizeTranscriptSegments(section.transcript_segments);
    const transcriptQuestionLocations = normalizeTranscriptQuestionLocations(section.transcript_question_locations);
    const rawParagraphs = section.paragraphs?.length
      ? section.paragraphs
      : String(section.content ?? "").trim().length > 0
        ? String(section.content ?? "").split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0)
        : String(section.transcript ?? "").trim().length > 0
          ? String(section.transcript ?? "").split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0)
          : [];

    rawParagraphs.forEach((paragraph, paragraphIndex) => {
      const paragraphText = extractParagraphText(paragraph);
      paragraphs.push({
        paragraphKey: `${section.section_id}-${paragraphIndex + 1}`,
        text: paragraphText,
        sectionId: section.section_id,
        sectionPreviewLabel: paragraphIndex === 0 ? sectionPreviewLabel : undefined,
        sectionTitle: paragraphIndex === 0 ? (section.title ?? undefined) : undefined,
        sectionSubtitle: paragraphIndex === 0 ? (section.subtitle ?? undefined) : undefined,
        sectionLabel: paragraphIndex === 0 ? sectionLabel : undefined,
        sectionAudioUrl: paragraphIndex === 0 ? (section.audio_url ?? undefined) : undefined,
        sectionAudioDurationSeconds: paragraphIndex === 0 ? (section.audio_duration_seconds ?? undefined) : undefined,
        sectionTranscriptSegments: paragraphIndex === 0 ? transcriptSegments : undefined,
        sectionTranscriptQuestionLocations: paragraphIndex === 0 ? transcriptQuestionLocations : undefined,
      });
    });

    (section.question_groups ?? []).forEach((group, groupIndex) => {
      const adjustedGroupStart = group.question_start + questionOffset;
      const adjustedGroupEnd = group.question_end + questionOffset;
      firstQuestionNumber = firstQuestionNumber === null
        ? adjustedGroupStart
        : Math.min(firstQuestionNumber, adjustedGroupStart);
      lastQuestionNumber = lastQuestionNumber === null
        ? adjustedGroupEnd
        : Math.max(lastQuestionNumber, adjustedGroupEnd);

      questionGroups.push({
        id: group.group_id,
        title: offsetQuestionReferences(group.group_title, questionOffset) ?? group.group_title,
        instruction: offsetQuestionReferences(group.questions[0]?.instructions ?? group.group_title, questionOffset) ?? group.group_title,
        type: group.question_type,
        sectionId: section.section_id,
        sectionTitle: section.title ?? undefined,
        sectionSubtitle: section.subtitle ?? undefined,
        sectionLabel,
        sectionAudioUrl: groupIndex === 0 ? (section.audio_url ?? undefined) : undefined,
        sectionAudioDurationSeconds: groupIndex === 0 ? (section.audio_duration_seconds ?? undefined) : undefined,
        sectionTranscriptSegments: groupIndex === 0 ? transcriptSegments : undefined,
        sectionTranscriptQuestionLocations: groupIndex === 0 ? transcriptQuestionLocations : undefined,
        questionBlock: group.shared_content?.question_block ?? "",
        secondaryBlock: group.shared_content?.secondary_block ?? "",
        optionsTitle: group.shared_content?.options_title ?? "",
        diagramTitle: group.shared_content?.diagram_title ?? "",
        diagramImageUrl: group.shared_content?.diagram_image_url ?? "",
        sharedOptions: group.shared_options ?? [],
        questions: group.questions.map((question) => ({
          id: question.question_id,
          number: question.question_number + questionOffset,
          label: offsetQuestionLabel(question.label ?? undefined, questionOffset),
          selectionLimit: question.selection_limit ?? undefined,
          type: question.question_type,
          prompt: question.prompt,
          instruction: question.instructions,
          options: question.options ?? [],
        })),
      });
    });
  });

  const review = await getBackendAttemptReview(attemptId).catch(() => null);
  const reviewItems = Object.fromEntries(
    (review?.items ?? []).map((item) => [
      item.question_id,
      {
        answerValue: item.answer_value ?? null,
        isCorrect: item.is_correct ?? null,
        correctAnswers: item.correct_answers ?? [],
        options: item.options ?? [],
        questionType: item.question_type,
      },
    ])
  );

  return {
    attemptId,
    exitHref: "/tests?type=listening",
    title: snapshot.title,
    subtitle: buildSubtitle(firstQuestionNumber, lastQuestionNumber, sections.length > 1),
    partLabel: sections.length > 1
      ? "Listening Test"
      : `Part ${resolveListeningSectionNumber(snapshot.format, sections[0]?.section_number ?? 1, 0, sections.length)}`,
    testType: "listening",
    timeLimitSeconds: snapshot.time_limit_seconds,
    paragraphs,
    questionGroups,
    initialAnswers: attempt.answers ?? {},
    initialTextHighlights: attempt.text_highlights ?? {},
    initialTimeSpentSeconds: attempt.time_spent_sec ?? 0,
    initialUiState: {
      theme: attempt.ui_state?.theme ?? undefined,
      splitRatio: attempt.ui_state?.split_ratio ?? undefined,
      fontScale: attempt.ui_state?.font_scale ?? undefined,
      activeQuestionId: attempt.active_question_id ?? undefined,
    },
    reviewItems,
  };
}

export default async function ListeningExamPreviewPage({ searchParams }: ListeningExamPreviewPageProps) {
  const mode = searchParams?.mode === "practice"
    ? "practice"
    : searchParams?.mode === "review"
      ? "review"
      : "exam";
  const attemptId = searchParams?.attemptId;

  if (!attemptId) {
    return <ExamPreviewAccessGate kind="listening" backHref="/tests?type=listening" />;
  }

  const data = await buildAttemptPreviewData(attemptId);
  if (!data) {
    return <ExamPreviewAccessGate kind="listening" backHref="/tests?type=listening" />;
  }

  return <ReadingExamPreview mode={mode} data={data} />;
}
