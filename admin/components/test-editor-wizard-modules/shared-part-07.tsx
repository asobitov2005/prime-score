"use client";

import { AdminTestDraftState, cn, normalizeAdminTestSourceDetail } from "./dependencies";

import { normalizeInlineBlankPlaceholders, stripGeneratedListeningIntroFromContent } from "./shared-part-01";

import { extractExamPracticeNumber, normalizeBinaryDraftAnswers, resolveDraftTitleForSave } from "./shared-part-06";



export function getNextExamPracticeTitleFromTests(
  tests: Array<{ source: string; title: string; type?: string }>,
  type: AdminTestDraftState["metadata"]["type"],
) {
  let maxNumber = 0;
  for (const test of tests) {
    if (String(test.source).trim().toLowerCase() !== "custom") {
      continue;
    }
    if (String(test.type ?? "").trim().toLowerCase() && String(test.type ?? "").trim().toLowerCase() !== type) {
      continue;
    }
    const number = extractExamPracticeNumber(test.title);
    if (number !== null) {
      maxNumber = Math.max(maxNumber, number);
    }
  }
  return `Exam Practice Test ${maxNumber + 1}`;
}

export function defaultTimeLimitLabelForType(type: AdminTestDraftState["metadata"]["type"]) {
  return type === "listening" ? "Audio duration + 2 min" : "60 min exam";
}

export function resolveDraftLogicalIndex(
  draftType: AdminTestDraftState["metadata"]["type"],
  format: AdminTestDraftState["metadata"]["format"],
  uiIndex: number,
) {
  if (format === "full") {
    return uiIndex;
  }

  const expectedPrefix = draftType === "listening" ? "part_" : "passage_";
  if (!format.startsWith(expectedPrefix)) {
    return uiIndex;
  }

  const suffix = Number.parseInt(format.split("_")[1] ?? "", 10);
  if (!Number.isFinite(suffix) || suffix <= 0) {
    return uiIndex;
  }

  return uiIndex === 0 ? suffix - 1 : uiIndex;
}

export function isGenericSectionTitle(value: string) {
  return /^(Reading Passage|Listening Part|Passage|Part)\s+\d+\s*$/i.test(value.trim());
}

export function isGenericListeningIntroTitle(value: string) {
  return /^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(value.trim());
}

export function shouldRenderSectionTitle(
  draftType: AdminTestDraftState["metadata"]["type"],
  title: string,
) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return false;
  }
  if (
    draftType === "listening"
    && (isGenericSectionTitle(trimmedTitle) || isGenericListeningIntroTitle(trimmedTitle))
  ) {
    return false;
  }
  return true;
}

export function normalizeMetadataQuickFixes(draft: AdminTestDraftState): AdminTestDraftState {
  const metadataTitle = resolveDraftTitleForSave(draft);
  const normalizedSourceDetail = normalizeAdminTestSourceDetail(draft.metadata.source, draft.metadata.sourceDetail);
  const normalizedTimeLimitLabel = draft.metadata.timeLimitLabel.trim() || defaultTimeLimitLabelForType(draft.metadata.type);
  const sectionLabelPrefix = draft.metadata.type === "listening" ? "Part" : "Passage";
  const sectionTitlePrefix = draft.metadata.type === "listening" ? "Listening Part" : "Reading Passage";

  return {
    ...draft,
    metadata: {
      ...draft.metadata,
      title: metadataTitle,
      sourceDetail: normalizedSourceDetail,
      timeLimitLabel: normalizedTimeLimitLabel,
    },
    content: {
      ...draft.content,
      sections: draft.content.sections.map((section, index) => {
        const logicalIndex = resolveDraftLogicalIndex(draft.metadata.type, draft.metadata.format, index);
        const normalizedLabel = `${sectionLabelPrefix} ${logicalIndex + 1}`;
        const trimmedTitle = section.title.trim();
        const normalizedTitle = draft.metadata.type === "listening"
          ? ((isGenericSectionTitle(trimmedTitle) || isGenericListeningIntroTitle(trimmedTitle)) ? "" : trimmedTitle)
          : (!trimmedTitle || isGenericSectionTitle(trimmedTitle)
              ? `${sectionTitlePrefix} ${logicalIndex + 1}`
              : trimmedTitle);

        return {
          ...section,
          label: normalizedLabel,
          title: normalizedTitle,
          content: draft.metadata.type === "listening"
            ? stripGeneratedListeningIntroFromContent(section.content)
            : section.content,
          subtitle: section.subtitle.trim(),
        };
      }),
    },
    questionGroups: (draft.questionGroups ?? []).map((group) => ({
      ...group,
      title: normalizeInlineBlankPlaceholders(group.title.trim()),
      instructions: normalizeInlineBlankPlaceholders(group.instructions.trim()),
      optionsTitle: normalizeInlineBlankPlaceholders(group.optionsTitle?.trim() ?? ""),
      questionBlock: group.questionBlock !== undefined ? normalizeInlineBlankPlaceholders(group.questionBlock) : group.questionBlock,
      answerBlock: group.answerBlock !== undefined ? normalizeInlineBlankPlaceholders(group.answerBlock) : group.answerBlock,
      secondaryBlock: group.secondaryBlock !== undefined ? normalizeInlineBlankPlaceholders(group.secondaryBlock) : group.secondaryBlock,
      questions: group.questions.map((question) => ({
        ...question,
        prompt: normalizeInlineBlankPlaceholders(question.prompt),
        explanation: normalizeInlineBlankPlaceholders(question.explanation),
        variants: question.variants.map((variant) => normalizeInlineBlankPlaceholders(variant)),
      })),
    })),
  };
}

export function prepareDraftForSave(draft: AdminTestDraftState): AdminTestDraftState {
  const normalizedDraft = normalizeBinaryDraftAnswers(draft);
  return normalizeMetadataQuickFixes(normalizedDraft);
}

export function parseBraceBoldText(text: string) {
  const segments: Array<{ text: string; bold: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const openIndex = text.indexOf("{", cursor);
    if (openIndex === -1) {
      segments.push({ text: text.slice(cursor), bold: false });
      break;
    }

    if (openIndex > cursor) {
      segments.push({ text: text.slice(cursor, openIndex), bold: false });
    }

    const closeIndex = text.indexOf("}", openIndex + 1);
    if (closeIndex === -1) {
      segments.push({ text: text.slice(openIndex), bold: false });
      break;
    }

    const boldText = text.slice(openIndex + 1, closeIndex);
    if (boldText) {
      segments.push({ text: boldText, bold: true });
    }
    cursor = closeIndex + 1;
  }

  return segments;
}

export function parseInlineItalicText(text: string) {
  const segments: Array<{ text: string; italic: boolean }> = [];
  const tokens = text.split(/(<\/?i>)/i);
  let italic = false;

  tokens.forEach((token) => {
    if (!token) {
      return;
    }
    if (/^<i>$/i.test(token)) {
      italic = true;
      return;
    }
    if (/^<\/i>$/i.test(token)) {
      italic = false;
      return;
    }
    segments.push({ text: token, italic });
  });

  return segments;
}

export function renderBraceBoldInlineText(text: string, keyPrefix: string) {
  const italicSegments = parseInlineItalicText(text);
  if (italicSegments.length === 0) {
    return text;
  }

  return italicSegments.flatMap((italicSegment, italicIndex) => {
    const segments = parseBraceBoldText(italicSegment.text);
    if (segments.length === 0) {
      return [];
    }

    return segments.map((segment, index) => {
      const sharedClassName = italicSegment.italic ? "italic" : undefined;

      if (segment.bold) {
        return (
          <strong
            key={`${keyPrefix}-bold-${italicIndex}-${index}`}
            className={cn("font-bold text-inherit", sharedClassName)}
          >
            {segment.text}
          </strong>
        );
      }

      if (italicSegment.italic) {
        return (
          <em key={`${keyPrefix}-italic-${italicIndex}-${index}`} className="italic">
            {segment.text}
          </em>
        );
      }

      return <span key={`${keyPrefix}-plain-${italicIndex}-${index}`}>{segment.text}</span>;
    });
  });
}

export function renderBraceBoldText(text: string, keyPrefix: string) {
  const normalizedText = normalizeInlineBlankPlaceholders(text);
  const lines = normalizedText.split("\n");
  if (lines.length === 1 && !/^\s*\*/.test(lines[0] ?? "")) {
    return renderBraceBoldInlineText(normalizedText, keyPrefix);
  }

  return lines.map((rawLine, index) => {
    const isBulletLine = /^\s*\*/.test(rawLine);
    const lineText = rawLine.replace(/^\s*\*\s?/, "");
    const renderedLine = renderBraceBoldInlineText(lineText, `${keyPrefix}-line-${index}`);

    return (
      <span key={`${keyPrefix}-row-${index}`}>
        {isBulletLine ? (
          <span className="my-0.5 inline-flex max-w-full items-start gap-2 align-top">
            <span className="mt-[0.55em] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
            <span className="min-w-0 flex-1">{lineText ? renderedLine : <>&nbsp;</>}</span>
          </span>
        ) : lineText ? (
          renderedLine
        ) : (
          <span>&nbsp;</span>
        )}
        {index < lines.length - 1 ? <br /> : null}
      </span>
    );
  });
}
