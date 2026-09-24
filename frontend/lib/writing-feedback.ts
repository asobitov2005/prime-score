import type { WritingInlineAnnotation, WritingRoastFeedback, WritingSubmissionResult } from "@/lib/server-writing";

export const WRITING_CRITERIA = [
  { key: "task_achievement", label: "Task Achievement" },
  { key: "coherence", label: "Coherence and Cohesion" },
  { key: "lexical", label: "Lexical Resource" },
  { key: "grammar", label: "Grammatical Range and Accuracy" },
] as const;

export function writingCriteria(result: WritingSubmissionResult) {
  return WRITING_CRITERIA.map((criterion) => ({
    ...criterion,
    label: criterion.key === "task_achievement" && result.task_type === "task_2"
      ? "Task Response" : criterion.label,
    data: result[criterion.key],
  }));
}

export function formatBand(value: number | string | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === "") return "Not provided";
  const band = Number(value);
  return Number.isFinite(band) && band >= 0 && band <= 9 ? band.toFixed(1) : "Not provided";
}

export interface RevisionFocus {
  title: string;
  instruction: string;
  reason?: string;
  examples: string[];
  source: string;
  sourceId: string;
}

const hasText = (text: string | null | undefined): text is string => Boolean(text?.trim());

export function writingInputRejection(message: string | null | undefined): string | null {
  const prefix = "WRITING_INPUT_REJECTED:";
  const text = message?.trim() ?? "";
  if (!text.startsWith(prefix)) return null;
  return text.slice(prefix.length).trim() || "Write your own response to the task before submitting it for review.";
}

export interface WritingTaskFitFeedback {
  task_relation: "on_task" | "partial" | "off_topic" | "wrong_task" | "uncertain";
  explanation: string;
  essay_evidence: string[];
  task_evidence: string[];
}

export function taskFitFeedback(result: WritingSubmissionResult): WritingTaskFitFeedback | null {
  const raw = result.audit_result?.task_fit;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const relations = ["on_task", "partial", "off_topic", "wrong_task", "uncertain"];
  if (typeof value.task_relation !== "string" || !relations.includes(value.task_relation)) return null;
  if (typeof value.explanation !== "string" || !value.explanation.trim()) return null;
  const quotes = (items: unknown) => Array.isArray(items)
    ? items.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  return {
    task_relation: value.task_relation as WritingTaskFitFeedback["task_relation"],
    explanation: value.explanation,
    essay_evidence: quotes(value.essay_evidence),
    task_evidence: quotes(value.task_evidence),
  };
}

// Display precedence, not a relevance model: use explicit priorities when supplied,
// otherwise retain source order. Never infer links between independent feedback fields.
export function revisionFocus(result: WritingSubmissionResult): RevisionFocus[] {
  const actions = (result.target_action_plan ?? [])
    .map((action, index) => ({ action, index }))
    .filter(({ action }) => hasText(action.how) || hasText(action.title))
    .sort((a, b) => {
      const priority = (value: number) => Number.isFinite(value) && value > 0 ? value : Infinity;
      return priority(a.action.priority) - priority(b.action.priority) || a.index - b.index;
    });
  if (actions.length) return actions.map(({ action, index }) => ({
    title: action.title,
    instruction: action.how,
    reason: action.why,
    examples: [action.example].filter(hasText),
    source: "Priority action",
    sourceId: `writing-action-${index}`,
  }));

  const fixes = (result.action_plan?.fixes ?? []).filter(hasText);
  if (fixes.length) return fixes.map((instruction) => ({
    title: "Revision focus", instruction, examples: [], source: "Action plan", sourceId: "writing-action-plan",
  }));
  const steps = (result.next_steps ?? []).filter(hasText);
  if (steps.length) return steps.map((instruction) => ({
    title: "Practice focus", instruction, examples: [], source: "Next steps", sourceId: "writing-next-steps",
  }));
  const checklist = (result.checklist ?? []).map((item, index) => ({ item, index }))
    .filter(({ item }) => item.status !== "met" && hasText(item.how_to_fix));
  if (checklist.length) return checklist.map(({ item, index }) => ({
    title: item.label, instruction: item.how_to_fix!, reason: item.detail, examples: [],
    source: "Task checklist", sourceId: `writing-check-${index}`,
  }));
  return writingCriteria(result).flatMap(({ key, label, data }) =>
    (data.improvements ?? []).filter(hasText).map((instruction) => ({
      title: label, instruction, examples: [], source: "Criterion feedback", sourceId: `writing-${key}`,
    })),
  );
}

export function hasRoast(roast: WritingRoastFeedback | null | undefined): roast is WritingRoastFeedback {
  return Boolean(roast && Object.values(roast).some((value) =>
    Array.isArray(value) ? value.some(hasText) : typeof value === "string" && hasText(value),
  ));
}

function codepointOffsets(essay: string): number[] {
  const offsets = [0];
  for (const character of essay) offsets.push(offsets[offsets.length - 1] + character.length);
  return offsets;
}

function annotationSpan(essay: string, annotation: WritingInlineAnnotation, offsets = codepointOffsets(essay)) {
  // Python reports codepoint positions; DOM/JS strings use UTF-16 code units.
  if (!Number.isInteger(annotation.offset) || !Number.isInteger(annotation.length)
    || annotation.offset < 0 || annotation.length <= 0
    || annotation.offset + annotation.length >= offsets.length) return null;
  const start = offsets[annotation.offset];
  const end = offsets[annotation.offset + annotation.length];
  return essay.slice(start, end) === annotation.original ? { start, end } : null;
}

export function validAnnotation(essay: string, annotation: WritingInlineAnnotation): boolean {
  return annotationSpan(essay, annotation) !== null;
}

export function annotatedSegments(essay: string, annotations: WritingInlineAnnotation[]) {
  const segments: Array<{ text: string; annotationIndex?: number }> = [];
  const offsets = codepointOffsets(essay);
  const indexed = annotations.map((annotation, index) => ({ annotation, index }))
    .flatMap(({ annotation, index }) => {
      const span = annotationSpan(essay, annotation, offsets);
      return span ? [{ ...span, index }] : [];
    })
    .sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const { start, end, index } of indexed) {
    if (start < cursor) continue;
    if (start > cursor) segments.push({ text: essay.slice(cursor, start) });
    segments.push({ text: essay.slice(start, end), annotationIndex: index });
    cursor = end;
  }
  if (cursor < essay.length) segments.push({ text: essay.slice(cursor) });
  return segments;
}

export function annotationContext(essay: string, annotation: WritingInlineAnnotation): string | null {
  const span = annotationSpan(essay, annotation);
  if (!span) return null;
  let { start, end } = span;
  while (start > 0 && !/[.!?\n\r]/.test(essay[start - 1])) start -= 1;
  while (end < essay.length && !/[.!?\n\r]/.test(essay[end])) end += 1;
  if (/[.!?]/.test(essay[end] ?? "")) end += 1;
  return essay.slice(start, end).trim();
}
