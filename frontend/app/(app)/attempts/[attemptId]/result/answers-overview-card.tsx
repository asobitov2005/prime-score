"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type AnswerItem = {
  question_id: string;
  question_number: number;
  question_label?: string | null;
  answer_value?: string | null;
  is_correct?: boolean | null;
  correct_answers: string[];
};

export function AnswersOverviewCard({
  items,
  testFormat,
}: {
  items: AnswerItem[];
  testFormat: string;
}) {
  const [showAnswers, setShowAnswers] = useState(false);
  const questionOffset = getQuestionNumberOffset(testFormat);
  const expandedItems = expandAnswerItems(items, questionOffset);
  const midpoint = Math.ceil(expandedItems.length / 2);
  const columns = [expandedItems.slice(0, midpoint), expandedItems.slice(midpoint)].filter((column) => column.length > 0);
  const ToggleIcon = showAnswers ? Eye : EyeOff;

  return (
    <div className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-3 px-6 py-5">
        <h3 className="text-2xl font-semibold tracking-tight">Answers overview</h3>
        <button
          type="button"
          onClick={() => setShowAnswers((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-2 text-sm font-medium transition-all ${
            showAnswers
              ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-700 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.85)] dark:text-emerald-300"
              : "border-border/80 bg-muted/25 text-foreground hover:bg-muted/45"
          }`}
          aria-pressed={showAnswers}
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
              showAnswers
                ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "border-border/70 bg-background/80 text-muted-foreground"
            }`}
          >
            <ToggleIcon className="h-4 w-4" />
          </span>
          <span className="pr-1 text-left leading-none">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Answers
            </span>
            <span className="mt-0.5 block text-sm font-semibold">
              {showAnswers ? "Visible" : "Hidden"}
            </span>
          </span>
        </button>
      </div>
      <div className="px-6 pb-6">
        {items.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="overflow-hidden rounded-2xl border border-border/80">
                <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] border-b border-border/80 bg-muted/[0.18]">
                  <div className="px-3 py-3 text-sm font-semibold text-foreground">No.</div>
                  <div className="border-l border-border/70 px-4 py-3 text-sm font-semibold text-foreground">Your Answers</div>
                  <div className="border-l border-border/70 px-4 py-3 text-sm font-semibold text-foreground">Correct Answers</div>
                </div>
                {column.map((item, index) => (
                  <div
                    key={item.question_id}
                    className={`grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] ${index !== column.length - 1 ? "border-b border-border/70" : ""}`}
                  >
                    <div className="flex items-center justify-center px-2 py-3 text-sm font-bold text-foreground">
                      {item.display_number}
                    </div>
                    <div
                      className="border-l border-border/70 px-4 py-3 text-sm font-medium text-foreground"
                      style={getAnswerCellStyle(item.is_correct, item.answer_value)}
                    >
                      {formatAnswerValue(item.answer_value)}
                    </div>
                    <div
                      className={`border-l border-border/70 px-4 py-3 text-sm font-medium transition-all ${
                        showAnswers ? "blur-0" : "text-muted-foreground blur-[5px] select-none"
                      }`}
                      style={getCorrectAnswerCellStyle(item.is_correct, showAnswers)}
                      aria-hidden={!showAnswers}
                    >
                      {formatCorrectAnswers(item.correct_answers)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Answer details will appear once the backend has finished scoring.</p>
        )}
      </div>
    </div>
  );
}

type ExpandedAnswerItem = {
  question_id: string;
  display_number: number;
  answer_value?: string | null;
  is_correct?: boolean | null;
  correct_answers: string[];
};

function expandAnswerItems(items: AnswerItem[], questionOffset: number): ExpandedAnswerItem[] {
  return items.flatMap((item) => {
    const range = parseQuestionRange(item.question_label, questionOffset);
    if (!range || range.start === range.end) {
      return [{
        question_id: item.question_id,
        display_number: item.question_number + questionOffset,
        answer_value: item.answer_value,
        is_correct: item.is_correct,
        correct_answers: item.correct_answers,
      }];
    }

    const count = range.end - range.start + 1;
    const userParts = normalizeAnswerParts(item.answer_value, count);
    const correctParts = normalizeAnswerParts(item.correct_answers.join(","), count);

    return Array.from({ length: count }, (_, index) => ({
      question_id: `${item.question_id}-${index}`,
      display_number: range.start + index,
      answer_value: userParts[index] ?? null,
      is_correct: item.is_correct ? true : compareAnswerParts(userParts[index], correctParts[index]),
      correct_answers: correctParts[index] ? [correctParts[index] as string] : [],
    }));
  });
}

function parseQuestionRange(label: string | null | undefined, questionOffset: number) {
  const match = String(label || "").trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) {
    return null;
  }

  let start = Number(match[1]);
  let end = Number(match[2]);
  if (questionOffset > 0 && start <= 13 && end <= 13) {
    start += questionOffset;
    end += questionOffset;
  }
  return { start, end };
}

function normalizeAnswerParts(value: string | null | undefined, targetLength: number): string[] {
  const parts = String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const normalizedParts = parts.every((part) => /^[A-Za-z]$/.test(part))
    ? [...parts].sort((left, right) => left.localeCompare(right))
    : parts;

  while (normalizedParts.length < targetLength) {
    normalizedParts.push("");
  }

  return normalizedParts.slice(0, targetLength);
}

function compareAnswerParts(left: string | undefined, right: string | undefined) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function getQuestionNumberOffset(testFormat: string): number {
  switch (testFormat) {
    case "passage_2":
      return 13;
    case "passage_3":
      return 26;
    default:
      return 0;
  }
}

function formatAnswerValue(value: string | null | undefined): string {
  if (!value) {
    return "Not answered";
  }

  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function formatCorrectAnswers(values: string[]): string {
  if (!values.length) {
    return "—";
  }

  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
}

function getAnswerCellStyle(isCorrect: boolean | null | undefined, answerValue?: string | null) {
  if (isCorrect) {
    return {
      backgroundColor: "rgba(16,185,129,0.12)",
    };
  }

  if (answerValue) {
    return {
      backgroundColor: "rgba(244,63,94,0.12)",
    };
  }

  return {
    backgroundColor: "rgba(148,163,184,0.08)",
  };
}

function getCorrectAnswerCellStyle(isCorrect: boolean | null | undefined, showAnswers: boolean) {
  if (!showAnswers) {
    return {
      backgroundColor: "rgba(148,163,184,0.08)",
    };
  }

  return {
    backgroundColor: "rgba(16,185,129,0.12)",
  };
}
