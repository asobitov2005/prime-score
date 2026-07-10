import { ReadingExamPreviewData, getBackendAttempt, getBackendAttemptReview } from "./page-dependencies";
import { buildSubtitle, extractParagraphText, normalizeTranscriptQuestionLocations, normalizeTranscriptSegments, offsetQuestionLabel, offsetQuestionReferences, resolveEffectiveListeningQuestionOffset, resolveListeningSectionNumber } from "./page-part-01";

export async function buildAttemptPreviewData(
  attemptId: string,
  initialReviewTarget?: ReadingExamPreviewData["initialReviewTarget"]
): Promise<ReadingExamPreviewData | null> {
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
        explanation: item.explanation ?? null,
        explanationReference: item.explanation_reference ?? null,
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
    initialSectionTimeSpentSeconds: attempt.section_time_spent_sec ?? {},
    initialUiState: {
      theme: attempt.ui_state?.theme ?? undefined,
      splitRatio: attempt.ui_state?.split_ratio ?? undefined,
      fontScale: attempt.ui_state?.font_scale ?? undefined,
      activeQuestionId: attempt.active_question_id ?? undefined,
    },
    initialReviewTarget,
    reviewItems,
  };
}
