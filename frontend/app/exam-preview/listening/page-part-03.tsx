import { ExamPreviewAccessGate, ReadingExamPreview, ReadingExamPreviewData, getGuestTestSnapshot, normalizeExamStart, startBackendAttempt } from "./page-dependencies";
import { ListeningExamPreviewPageProps, buildSubtitle, extractParagraphText, normalizeTranscriptQuestionLocations, normalizeTranscriptSegments, offsetQuestionLabel, offsetQuestionReferences, resolveEffectiveListeningQuestionOffset, resolveListeningSectionNumber } from "./page-part-01";
import { buildAttemptPreviewData } from "./page-part-02";

export async function buildGuestPreviewData(testId: string): Promise<ReadingExamPreviewData | null> {
  const snapshot = await getGuestTestSnapshot(testId);

  if (!snapshot || snapshot.test_type !== "listening" || !snapshot.sections?.length) {
    return null;
  }

  const paragraphs: ReadingExamPreviewData["paragraphs"] = [];
  const questionGroups: ReadingExamPreviewData["questionGroups"] = [];
  const sections = snapshot.sections ?? [];
  let firstQuestionNumber: number | null = null;
  let lastQuestionNumber: number | null = null;

  sections.forEach((section: any, sectionIndex: number) => {
    const questionNumbers = (section.question_groups ?? []).flatMap((group: any) => [group.question_start, group.question_end]);
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

    rawParagraphs.forEach((paragraph: any, paragraphIndex: number) => {
      paragraphs.push({
        paragraphKey: `${section.section_id}-${paragraphIndex + 1}`,
        text: extractParagraphText(paragraph),
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

    (section.question_groups ?? []).forEach((group: any, groupIndex: number) => {
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
        questions: group.questions.map((question: any) => ({
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

  return {
    attemptId: `guest-${testId}`,
    exitHref: `/tests/${snapshot.slug ?? snapshot.id}`,
    testId: snapshot.id,
    testSlug: snapshot.slug ?? snapshot.id,
    title: snapshot.title,
    subtitle: buildSubtitle(firstQuestionNumber, lastQuestionNumber, sections.length > 1),
    partLabel: sections.length > 1
      ? "Listening Test"
      : `Part ${resolveListeningSectionNumber(snapshot.format, sections[0]?.section_number ?? 1, 0, sections.length)}`,
    testType: "listening",
    timeLimitSeconds: snapshot.time_limit_seconds || 1800,
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

export async function ListeningExamPreviewPage({ searchParams }: ListeningExamPreviewPageProps) {
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
      return <ExamPreviewAccessGate kind="listening" backHref="/tests?type=listening" />;
    }
    return <ReadingExamPreview mode={mode} data={data} />;
  }

  if (!attemptId) {
    return <ExamPreviewAccessGate kind="listening" backHref="/tests?type=listening" />;
  }

  const data = await buildAttemptPreviewData(attemptId, initialReviewTarget);
  if (!data) {
    return <ExamPreviewAccessGate kind="listening" backHref="/tests?type=listening" />;
  }

  return <ReadingExamPreview mode={mode} data={data} />;
}
