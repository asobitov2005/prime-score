import { notFound } from "next/navigation";

import { ReadingExamPreview, type ReadingExamPreviewData } from "@/components/exam/reading-exam-preview";
import { getBackendAttempt } from "@/lib/server-attempts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface ReadingExamPreviewPageProps {
  searchParams?: {
    mode?: string;
    attemptId?: string;
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

  snapshot.sections.forEach((section) => {
    const sectionQuestionNumbers = (section.question_groups ?? []).flatMap((group) => [
      group.question_start,
      group.question_end,
    ]);
    const sectionQuestionStart = sectionQuestionNumbers.length ? Math.min(...sectionQuestionNumbers) : null;
    const sectionQuestionEnd = sectionQuestionNumbers.length ? Math.max(...sectionQuestionNumbers) : null;
    const sectionPreviewLabel = `Reading Passage ${section.section_number}`;
    const sectionIntro = buildReadingSectionIntro(section.section_number, sectionQuestionStart, sectionQuestionEnd);

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
        sectionLabel: index === 0 ? (section.label ?? `Passage ${section.section_number}`) : undefined,
      });
    });

    (section.question_groups ?? []).forEach((group) => {
      firstQuestionNumber = firstQuestionNumber === null
        ? group.question_start
        : Math.min(firstQuestionNumber, group.question_start);
      lastQuestionNumber = lastQuestionNumber === null
        ? group.question_end
        : Math.max(lastQuestionNumber, group.question_end);

      questionGroups.push({
        id: group.group_id,
        title: group.group_title,
        instruction: group.questions[0]?.instructions ?? group.group_title,
        type: group.question_type,
        sectionId: section.section_id,
        sectionTitle: section.title ?? undefined,
        sectionLabel: section.label ?? `Passage ${section.section_number}`,
        questionBlock: group.shared_content?.question_block ?? "",
        secondaryBlock: group.shared_content?.secondary_block ?? "",
        sharedOptions: group.shared_options ?? [],
        questions: group.questions.map((question) => ({
          id: question.question_id,
          number: question.question_number,
          type: question.question_type,
          prompt: question.prompt,
          instruction: question.instructions,
          options: question.options ?? [],
        })),
      });
    });
  });

  return {
    attemptId,
    exitHref: "/tests?type=reading",
    title: snapshot.title,
    subtitle: buildSubtitle(firstQuestionNumber, lastQuestionNumber, snapshot.sections.length > 1),
    partLabel: snapshot.sections.length > 1 ? "Reading Test" : (snapshot.sections[0]?.label ?? "Passage 1"),
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
  };
}

export default async function ReadingExamPreviewPage({ searchParams }: ReadingExamPreviewPageProps) {
  const mode = searchParams?.mode === "practice" ? "practice" : "exam";
  const attemptId = searchParams?.attemptId;

  if (!attemptId) {
    return <ReadingExamPreview mode={mode} />;
  }

  const data = await buildAttemptPreviewData(attemptId);
  if (!data) {
    notFound();
  }

  const stateKey = [
    attemptId,
    data.initialTimeSpentSeconds ?? 0,
    data.initialUiState?.activeQuestionId ?? "",
    ...Object.entries(data.initialAnswers ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([questionId, value]) => questionId + ":" + value),
  ].join("|");

  return <ReadingExamPreview key={stateKey} mode={mode} data={data} />;
}
