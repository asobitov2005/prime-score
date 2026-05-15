import { ExamPreviewAccessGate } from "@/components/exam/exam-preview-access-gate";
import { ReadingExamPreview, type ReadingExamPreviewData } from "@/components/exam/reading-exam-preview";
import { getBackendAttempt, getBackendAttemptReview } from "@/lib/server-attempts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface ReadingExamPreviewPageProps {
  searchParams?: {
    mode?: string;
    attemptId?: string;
    testId?: string;
  };
}

function buildSubtitle(questionStart: number | null, questionEnd: number | null, isFullTest: boolean) {
  if (questionStart === null || questionEnd === null) {
    return "Read the passage and answer the questions in the panel on the right.";
  }

  if (isFullTest) {
    return `Read the passages and answer questions ${questionStart}-${questionEnd} in the panel on the right.`;
  }

  return `Read the passage and answer questions ${questionStart}-${questionEnd} in the panel on the right.`;
}

type RawParagraph = string | { id?: string; text?: string; label?: string };

function parsePassageBlockStyle(rawText: string) {
  const trimmed = rawText.trim();
  const hasOuterBraces = trimmed.startsWith("{") && trimmed.endsWith("}");
  let body = hasOuterBraces ? trimmed.slice(1, -1).trim() : trimmed;
  let italic = false;
  let center = false;

  let matched = true;
  while (matched) {
    matched = false;
    if (body.startsWith("<i>")) {
      italic = true;
      body = body.slice(3).trimStart();
      matched = true;
    }
    if (body.startsWith("<c>")) {
      center = true;
      body = body.slice(3).trimStart();
      matched = true;
    }
  }

  return {
    isStyled: italic || center,
  };
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

function extractExplicitParagraphLabel(paragraph: RawParagraph) {
  if (typeof paragraph !== "string") {
    return Object.prototype.hasOwnProperty.call(paragraph, "label") ? paragraph.label ?? "" : null;
  }

  const match = paragraph.match(/['"]label['"]\s*:\s*['"]([^'"]*)['"]/);
  return match ? match[1] ?? "" : null;
}

function buildReadingSectionIntro(sectionNumber: number, questionStart: number | null, questionEnd: number | null) {
  if (questionStart === null || questionEnd === null) {
    return null;
  }
  return `You should spend about 20 minutes on Questions ${questionStart}-${questionEnd}, which are based on Reading Passage ${sectionNumber} below.`;
}

function resolveReadingSectionNumber(snapshotFormat: string | null | undefined, fallbackNumber: number, sectionIndex: number, totalSections: number) {
  if (totalSections > 1) {
    return fallbackNumber || sectionIndex + 1;
  }

  const formatMatch = String(snapshotFormat ?? "").match(/^passage_(\d+)$/i);
  if (formatMatch) {
    return Number(formatMatch[1]);
  }

  return fallbackNumber || 1;
}

function readingSectionQuestionOffset(sectionNumber: number) {
  if (sectionNumber <= 1) return 0;
  if (sectionNumber === 2) return 13;
  if (sectionNumber === 3) return 26;
  return 0;
}

function resolveEffectiveReadingQuestionOffset(sectionNumber: number, sectionQuestionStart: number | null) {
  const baseOffset = readingSectionQuestionOffset(sectionNumber);
  if (baseOffset === 0) {
    return 0;
  }
  if ((sectionQuestionStart ?? 0) > 1) {
    return 0;
  }
  return baseOffset;
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

async function buildAttemptPreviewData(attemptId: string): Promise<ReadingExamPreviewData | null> {
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

      questionGroups.push({
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
    initialUiState: {
      theme: attempt.ui_state?.theme ?? undefined,
      splitRatio: attempt.ui_state?.split_ratio ?? undefined,
      fontScale: attempt.ui_state?.font_scale ?? undefined,
      activeQuestionId: attempt.active_question_id ?? undefined,
    },
    reviewItems,
  };
}

import { getGuestTestSnapshot } from "@/lib/server-data";

async function buildGuestPreviewData(testId: string): Promise<ReadingExamPreviewData | null> {
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

      questionGroups.push({
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
      });
    });
  });

  return {
    attemptId: `guest-${testId}`,
    exitHref: "/tests?type=reading",
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
    initialUiState: {},
    reviewItems: {},
  };
}

export default async function ReadingExamPreviewPage({ searchParams }: ReadingExamPreviewPageProps) {
  const mode = searchParams?.mode === "practice"
    ? "practice"
    : searchParams?.mode === "review"
      ? "review"
      : searchParams?.mode === "guest"
        ? "guest"
        : "exam";
        
  const attemptId = searchParams?.attemptId;
  const testId = searchParams?.testId;

  if (mode === "guest" && testId) {
    const data = await buildGuestPreviewData(testId);
    if (!data) {
      return <ExamPreviewAccessGate kind="reading" backHref="/tests?type=reading" />;
    }
    return <ReadingExamPreview mode="guest" data={data} />;
  }

  if (!attemptId) {
    return <ExamPreviewAccessGate kind="reading" backHref="/tests?type=reading" />;
  }

  const data = await buildAttemptPreviewData(attemptId);
  if (!data) {
    return <ExamPreviewAccessGate kind="reading" backHref="/tests?type=reading" />;
  }

  return <ReadingExamPreview mode={mode as any} data={data} />;
}
