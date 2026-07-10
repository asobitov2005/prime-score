export const questionTypeAliases: Record<string, string> = {
  "mc-single": "reading_mc_single",
  "mc-multiple": "reading_mc_multiple",
  tfng: "reading_true_false_not_given",
  yng: "reading_yes_no_not_given",
  "matching-info": "reading_matching_information",
  "matching-headings": "reading_matching_headings",
  "matching-features": "reading_matching_features",
  "matching-endings": "reading_matching_sentence_endings",
  "sentence-completion": "reading_sentence_completion",
  "summary-word-bank": "reading_summary_completion_wordbank",
  "summary-free": "reading_summary_completion_freetext",
  "note-flow-chart": "reading_note_completion",
  "diagram-map": "reading_diagram_labeling",
  "short-answer": "reading_short_answer",
  matching: "listening_matching",
  labeling: "listening_plan_map_labeling",
  completion: "listening_form_completion",
  "map-free-text": "listening_plan_map_labeling",
};

export function sanitizeListeningSectionTitle(
  type: "reading" | "listening",
  title: string,
): string {
  const trimmedTitle = title.trim();
  if (type !== "listening") return title;
  if (
    /^(Reading Passage|Listening Part|Passage|Part)\s+\d+\s*$/i.test(
      trimmedTitle,
    )
  ) {
    return "";
  }
  if (/^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(trimmedTitle)) {
    return "";
  }
  return title;
}

export function sanitizeListeningSectionContent(
  type: "reading" | "listening",
  content: string,
): string {
  if (type !== "listening") return content;
  return content
    .split("\n")
    .filter(
      (line) =>
        !/^Part\s+\d+\.\s+Questions\s+\d+\s*-\s*\d+\.?$/i.test(
          line.trim(),
        ),
    )
    .join("\n")
    .trim();
}

export function resolveAdminQuestionType(
  typeId: string,
  sharedOptions: string[],
): string {
  if (typeId === "listening_plan_map_labeling" && sharedOptions.length === 0) {
    return "listening_plan_map_labeling_free_text";
  }
  return typeId;
}

export function sanitizeQuestionGroupTitle(title: string): string {
  const trimmedTitle = title.trim();
  if (/^Question Group(?:\s+\d+(?:\s*[-,]\s*\d+)*)?$/i.test(trimmedTitle)) {
    return "";
  }
  return trimmedTitle;
}

export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function generateUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    );
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }
  return `fallback-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export function getIeltsRange(index: number, type: string): string {
  if (type === "listening") {
    return `${index * 10 + 1}-${(index + 1) * 10}`;
  }
  if (index === 0) return "1-13";
  if (index === 1) return "14-26";
  if (index === 2) return "27-40";
  return "X-Y";
}

function isStyledPassageBlock(rawText: string): boolean {
  const trimmed = rawText.trim();
  let body =
    trimmed.startsWith("{") && trimmed.endsWith("}")
      ? trimmed.slice(1, -1).trim()
      : trimmed;
  let styled = false;
  let matched = true;
  while (matched) {
    matched = false;
    if (body.startsWith("<i>") || body.startsWith("<c>")) {
      styled = true;
      body = body.slice(3).trimStart();
      matched = true;
    }
  }
  return styled;
}

export function buildParagraphPayloads(
  content: string,
  showLabels: boolean,
): Array<{ id: string; label: string; text: string }> {
  let labelIndex = 0;
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const isLabelled = !isStyledPassageBlock(block);
      const label =
        showLabels && isLabelled ? String.fromCharCode(65 + labelIndex) : "";
      if (isLabelled) labelIndex += 1;
      return { id: `para-${index}`, label, text: block };
    });
}

export function detectSharedListeningAudio(
  sections: Array<{
    audioUrl?: string;
    audioDurationSeconds?: number | null;
  }>,
): { audioUrl: string; audioDurationSeconds: number | null } | null {
  if (sections.length === 0) return null;
  const firstUrl = String(sections[0]?.audioUrl ?? "").trim();
  if (!firstUrl) return null;
  if (
    !sections.every(
      (section) => String(section.audioUrl ?? "").trim() === firstUrl,
    )
  ) {
    return null;
  }
  const durationSeconds =
    sections.find((section) => (section.audioDurationSeconds ?? 0) > 0)
      ?.audioDurationSeconds ?? null;
  return { audioUrl: firstUrl, audioDurationSeconds: durationSeconds };
}
