import { ReadingExamPreviewData, getBackendAttempt, getBackendAttemptReview, sanitizeQuestionGroupOptionFields } from "./page-dependencies";
import { buildReadingSectionIntro, buildSubtitle, extractExplicitParagraphLabel, extractParagraphText, offsetQuestionLabel, offsetQuestionReferences, parsePassageBlockStyle, resolveEffectiveReadingQuestionOffset, resolveReadingSectionNumber } from "./page-part-01";

export async function buildAttemptPreviewData(
  attemptId: string,
  initialReviewTarget?: ReadingExamPreviewData["initialReviewTarget"]
): Promise<ReadingExamPreviewData | null> {
  const attempt = await getBackendAttempt(attemptId).catch(() => null);
  const snapshot = attempt?.test_snapshot;

  if (!attempt || !snapshot || snapshot.test_type !== "reading" || !snapshot.sections?.length) {
    return null;
  }

  const paragraphs: ReadingExamPreviewData["paragraphs"] = [];
  const questionGroups: ReadingExamPreviewData["questionGroups"] = [];
  let firstQuestionNumber: number | null = null;
  let lastQuestionNumber: number | null = null;
  const sections = snapshot.sections ?? [];

  sections.forEach((section, sectionIndex) => {
    const sectionQuestionNumbers = (section.question_groups ?? []).flatMap((group) => [
      group.question_start,
      group.question_end,
    ]);
    const sectionQuestionStart = sectionQuestionNumbers.length ? Math.min(...sectionQuestionNumbers) : null;
    const sectionQuestionEnd = sectionQuestionNumbers.length ? Math.max(...sectionQuestionNumbers) : null;
    const resolvedSectionNumber = resolveReadingSectionNumber(
      snapshot.format,
      section.section_number,
      sectionIndex,
      sections.length,
    );
    const sectionQuestionOffset = sections.length > 1
      ? 0
      : resolveEffectiveReadingQuestionOffset(resolvedSectionNumber, sectionQuestionStart);
    const adjustedSectionQuestionStart = sectionQuestionStart === null ? null : sectionQuestionStart + sectionQuestionOffset;
    const adjustedSectionQuestionEnd = sectionQuestionEnd === null ? null : sectionQuestionEnd + sectionQuestionOffset;
    const resolvedSectionLabel = `Passage ${resolvedSectionNumber}`;
    const sectionPreviewLabel = `Reading Passage ${resolvedSectionNumber}`;
    const sectionIntro = buildReadingSectionIntro(resolvedSectionNumber, adjustedSectionQuestionStart, adjustedSectionQuestionEnd);

    const rawParagraphs = section.paragraphs?.length
      ? section.paragraphs
      : (section.content ?? "").split(/\n\s*\n/).filter((paragraph) => paragraph.trim());

    let paragraphLabelIndex = 0;
    rawParagraphs.forEach((paragraph, index) => {
      const paragraphText = extractParagraphText(paragraph);
      const explicitLabel = extractExplicitParagraphLabel(paragraph);
      const hasExplicitLabel = explicitLabel !== null;
      const normalizedExplicitLabel = explicitLabel?.trim().toUpperCase() ?? "";
      const canReceiveLabel = hasExplicitLabel
        ? normalizedExplicitLabel.length > 0
        : !parsePassageBlockStyle(paragraphText).isStyled;
      const paragraphKey = normalizedExplicitLabel || (canReceiveLabel ? String.fromCharCode(65 + paragraphLabelIndex) : `block-${index}`);

      if (hasExplicitLabel && /^[A-Z]$/.test(normalizedExplicitLabel)) {
        paragraphLabelIndex = Math.max(paragraphLabelIndex, normalizedExplicitLabel.charCodeAt(0) - 64);
      } else if (!hasExplicitLabel && canReceiveLabel) {
        paragraphLabelIndex += 1;
      }

      paragraphs.push({
        paragraphKey,
        text: paragraphText,
        label: section.show_labels && canReceiveLabel ? paragraphKey : undefined,
        sectionId: section.section_id,
        sectionPreviewLabel: index === 0 ? sectionPreviewLabel : undefined,
        sectionIntro: index === 0 ? (sectionIntro ?? undefined) : undefined,
        sectionTitle: index === 0 ? (section.title ?? undefined) : undefined,
        sectionSubtitle: index === 0 ? (section.subtitle ?? undefined) : undefined,
        sectionLabel: index === 0 ? resolvedSectionLabel : undefined,
      });
    });

    (section.question_groups ?? []).forEach((group) => {
      const adjustedGroupQuestionStart = group.question_start + sectionQuestionOffset;
      const adjustedGroupQuestionEnd = group.question_end + sectionQuestionOffset;
      firstQuestionNumber = firstQuestionNumber === null
        ? adjustedGroupQuestionStart
        : Math.min(firstQuestionNumber, adjustedGroupQuestionStart);
      lastQuestionNumber = lastQuestionNumber === null
        ? adjustedGroupQuestionEnd
        : Math.max(lastQuestionNumber, adjustedGroupQuestionEnd);

      questionGroups.push(sanitizeQuestionGroupOptionFields({
        id: group.group_id,
        title: offsetQuestionReferences(group.group_title, sectionQuestionOffset) ?? group.group_title,
        instruction: offsetQuestionReferences(group.questions[0]?.instructions ?? group.group_title, sectionQuestionOffset) ?? group.group_title,
        type: group.question_type,
        sectionId: section.section_id,
        sectionTitle: section.title ?? undefined,
        sectionSubtitle: section.subtitle ?? undefined,
        sectionLabel: resolvedSectionLabel,
        questionBlock: group.shared_content?.question_block ?? "",
        secondaryBlock: group.shared_content?.secondary_block ?? "",
        optionsTitle: group.shared_content?.options_title ?? "",
        diagramTitle: group.shared_content?.diagram_title ?? "",
        diagramImageUrl: group.shared_content?.diagram_image_url ?? "",
        sharedOptions: group.shared_options ?? [],
        questions: group.questions.map((question) => ({
          id: question.question_id,
          number: question.question_number + sectionQuestionOffset,
          label: offsetQuestionLabel(question.label ?? undefined, sectionQuestionOffset),
          selectionLimit: question.selection_limit ?? undefined,
          type: question.question_type,
          prompt: question.prompt,
          instruction: question.instructions,
          options: question.options ?? [],
        })),
      }));
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
    exitHref: "/tests?type=reading",
    title: snapshot.title,
    subtitle: buildSubtitle(firstQuestionNumber, lastQuestionNumber, sections.length > 1),
    partLabel: sections.length > 1
      ? "Reading Test"
      : `Passage ${resolveReadingSectionNumber(snapshot.format, sections[0]?.section_number ?? 1, 0, sections.length)}`,
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
