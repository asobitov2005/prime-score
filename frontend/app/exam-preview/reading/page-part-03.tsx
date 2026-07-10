import { ExamPreviewAccessGate, ReadingExamPreview, ReadingExamPreviewData, getGuestTestSnapshot, normalizeExamStart, sanitizeQuestionGroupOptionFields, startBackendAttempt } from "./page-dependencies";
import { ReadingExamPreviewPageProps, buildReadingSectionIntro, buildSubtitle, extractExplicitParagraphLabel, extractParagraphText, offsetQuestionLabel, offsetQuestionReferences, parsePassageBlockStyle, resolveEffectiveReadingQuestionOffset, resolveReadingSectionNumber } from "./page-part-01";
import { buildAttemptPreviewData } from "./page-part-02";

export async function buildGuestPreviewData(testId: string): Promise<ReadingExamPreviewData | null> {
  const snapshot = await getGuestTestSnapshot(testId);
  if (!snapshot || snapshot.test_type !== "reading" || !snapshot.sections?.length) {
    return null;
  }

  const paragraphs: ReadingExamPreviewData["paragraphs"] = [];
  const questionGroups: ReadingExamPreviewData["questionGroups"] = [];
  let firstQuestionNumber: number | null = null;
  let lastQuestionNumber: number | null = null;
  const sections = snapshot.sections ?? [];

  sections.forEach((section, sectionIndex) => {
    const sectionQuestionNumbers = (section.question_groups ?? []).flatMap((group: any) => [
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
    rawParagraphs.forEach((paragraph: any, index: number) => {
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

    (section.question_groups ?? []).forEach((group: any) => {
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
        questions: group.questions.map((question: any) => ({
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

  return {
    attemptId: `guest-${testId}`,
    exitHref: `/tests/${snapshot.slug ?? snapshot.id}`,
    testId: snapshot.id,
    testSlug: snapshot.slug ?? snapshot.id,
    testType: "reading",
    title: snapshot.title,
    subtitle: buildSubtitle(firstQuestionNumber, lastQuestionNumber, sections.length > 1),
    partLabel: sections.length > 1
      ? "Reading Test"
      : `Passage ${resolveReadingSectionNumber(snapshot.format, sections[0]?.section_number ?? 1, 0, sections.length)}`,
    timeLimitSeconds: snapshot.time_limit_seconds || 3600,
    paragraphs,
    questionGroups,
    initialAnswers: {},
    initialTextHighlights: {},
    initialTimeSpentSeconds: 0,
    initialSectionTimeSpentSeconds: {},
    initialUiState: {},
    reviewItems: {},
  };
}

export async function ReadingExamPreviewPage({ searchParams }: ReadingExamPreviewPageProps) {
  const mode = searchParams?.mode === "practice"
    ? "practice"
    : searchParams?.mode === "review"
      ? "review"
      : searchParams?.mode === "guest"
        ? "guest"
        : "exam";
        
  const attemptId = searchParams?.attemptId;
  const testId = searchParams?.testId;
  const isStart = searchParams?.start === "1";
  const initialReviewTarget: ReadingExamPreviewData["initialReviewTarget"] = {
    sectionId: searchParams?.sectionId,
    questionId: searchParams?.questionId,
    questionType: searchParams?.questionType,
  };

  // Instant-start: the attempt is created on the server here so the user enters
  // the exam immediately on click (with the loading skeleton) instead of waiting
  // on the catalog page while the start request resolves.
  if (isStart && testId && mode !== "review" && mode !== "guest") {
    const normalized = normalizeExamStart({
      scope: searchParams?.scope,
      mode: searchParams?.mode,
      sectionId: searchParams?.sectionId,
      forceNew: searchParams?.forceNew === "1",
    });

    try {
      const started = await startBackendAttempt({
        testId,
        scope: normalized.scope,
        sectionId: normalized.sectionId,
        mode: normalized.mode,
        forceNew: normalized.forceNew,
      });
      const data = await buildAttemptPreviewData(started.attemptId, initialReviewTarget);
      if (data) {
        return <ReadingExamPreview mode={normalized.mode} data={data} />;
      }
    } catch {
      // Fall through to the guest/access-gate handling below.
    }
  }

  if (testId && mode !== "review") {
    const data = await buildGuestPreviewData(testId);
    if (!data) {
      return <ExamPreviewAccessGate kind="reading" backHref="/tests?type=reading" />;
    }
    return <ReadingExamPreview mode={mode} data={data} />;
  }

  if (!attemptId) {
    return <ExamPreviewAccessGate kind="reading" backHref="/tests?type=reading" />;
  }

  const data = await buildAttemptPreviewData(attemptId, initialReviewTarget);
  if (!data) {
    return <ExamPreviewAccessGate kind="reading" backHref="/tests?type=reading" />;
  }

  return <ReadingExamPreview mode={mode as any} data={data} />;
}
