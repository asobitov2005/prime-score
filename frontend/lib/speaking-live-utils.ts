export const PART_1_QUESTION_COUNT = 8;
export const PART_1_PREAMBLE_TURNS = 3;

export function isSpeakingSessionClosingMessage(
  text: string,
  entryMode: string,
  part: number,
): boolean {
  const normalized = text.trim();
  if (!normalized) {
    return false;
  }

  const partOneClosing = /part\s*1.{0,48}(complete|finished|conclud|over|done|end|tugadi)|that'?s (the )?end of part\s*1|end of part\s*1|this concludes part\s*1|we'?ve finished part\s*1|part\s*1.{0,24}thank you|thank you.{0,32}part\s*1|part\s*1.{0,32}tugadi|tugadi.{0,32}part\s*1|suhbat.{0,24}tugadi|no more questions.{0,24}part\s*1/i.test(
    normalized,
  );

  if (entryMode === "part_1" || (entryMode === "full" && part === 1)) {
    return partOneClosing;
  }

  return /that concludes|end of the (speaking )?test|this is the end of/i.test(normalized);
}

export function resolvePart1QuestionNumber(
  turnCount: number,
  status: string,
  inputTurnOpen: boolean,
  totalQuestions = PART_1_QUESTION_COUNT,
): number {
  if (turnCount <= PART_1_PREAMBLE_TURNS) {
    return 0;
  }

  const topicTurn = turnCount - PART_1_PREAMBLE_TURNS;
  if (inputTurnOpen) {
    return Math.min(totalQuestions, Math.max(1, topicTurn));
  }
  if (status === "ai_speaking") {
    return Math.min(totalQuestions, Math.max(1, topicTurn + 1));
  }
  return Math.min(totalQuestions, Math.max(1, topicTurn));
}

export function resolvePart1ProgressPercent(
  currentQuestion: number,
  totalQuestions = PART_1_QUESTION_COUNT,
): number {
  if (currentQuestion <= 0 || totalQuestions <= 0) {
    return 0;
  }
  return Math.round((currentQuestion / totalQuestions) * 100);
}
