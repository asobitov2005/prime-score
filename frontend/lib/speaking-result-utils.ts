import type { SpeakingDiarizedTranscriptItem, SpeakingSessionResult } from "@/lib/api/client";
import { formatIeltsBand, roundIeltsBand } from "@/lib/ielts-band";
import { isSpeakingSessionClosingMessage, PART_1_PREAMBLE_TURNS } from "@/lib/speaking-live-utils";

export function formatSpeakingBand(value: number | null | undefined): string {
  return formatIeltsBand(value, "—");
}

export function bandProgressPercent(value: number | null | undefined): number {
  const band = roundIeltsBand(value);
  if (band === null) {
    return 0;
  }
  return Math.min(100, Math.max(0, (band / 9) * 100));
}

export function bandToCefr(value: number | null | undefined): string {
  const band = roundIeltsBand(value);
  if (band === null) {
    return "—";
  }
  if (band >= 8.5) return "CEFR C2";
  if (band >= 7.0) return "CEFR C1";
  if (band >= 6.0) return "CEFR B2";
  if (band >= 5.0) return "CEFR B1";
  if (band >= 4.0) return "CEFR A2";
  return "CEFR A1";
}

export function getScoreHeadline(value: number | null | undefined): string {
  const band = roundIeltsBand(value);
  if (band === null) {
    return "Result saved";
  }
  if (band >= 7.5) return "Excellent work!";
  if (band >= 6.5) return "Good effort!";
  if (band >= 5.5) return "Solid progress!";
  return "Keep going!";
}

export function getScoreSubtext(value: number | null | undefined): string {
  const band = roundIeltsBand(value);
  if (band === null) {
    return "Your speaking session was saved successfully.";
  }
  if (band >= 7.0) {
    return "You are performing strongly. Keep refining detail and range.";
  }
  return "Keep practicing to reach a higher band.";
}

export function formatSpeakingDuration(result: SpeakingSessionResult): string {
  const primaryAudio = result.audioAssets[0];
  if (primaryAudio?.durationMs && primaryAudio.durationMs > 0) {
    return formatDurationSeconds(Math.round(primaryAudio.durationMs / 1000));
  }
  if (result.startedAt && result.endedAt) {
    const started = new Date(result.startedAt).getTime();
    const ended = new Date(result.endedAt).getTime();
    if (Number.isFinite(started) && Number.isFinite(ended) && ended > started) {
      return formatDurationSeconds(Math.round((ended - started) / 1000));
    }
  }
  return "—";
}

export function formatResultDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatSpeakingPartLabel(entryMode: SpeakingSessionResult["entryMode"], part?: number): string {
  if (entryMode === "part_1") return "Part 1";
  if (entryMode === "part_2") return "Part 2";
  if (entryMode === "part_3") return "Part 3";
  if (typeof part === "number" && part >= 1 && part <= 3) {
    return `Part ${part}`;
  }
  return "Full test";
}

export function countExaminerQuestions(items: SpeakingDiarizedTranscriptItem[]): number {
  return items.filter((item) => {
    const role = item.role.toLowerCase();
    return role === "examiner" || role === "assistant" || role === "ai";
  }).length;
}

export function countPart1TopicQuestions(items: SpeakingDiarizedTranscriptItem[]): number {
  let examinerQuestions = 0;
  for (const item of items) {
    const role = item.role.toLowerCase();
    if (role !== "examiner" && role !== "assistant" && role !== "ai") {
      continue;
    }
    const text = item.text.trim();
    if (!text.includes("?") || isSpeakingSessionClosingMessage(text, "part_1", 1)) {
      continue;
    }
    examinerQuestions += 1;
  }
  return Math.max(0, examinerQuestions - PART_1_PREAMBLE_TURNS);
}

export function resolveSpeakingQuestionsAnswered(result: SpeakingSessionResult): number {
  if (typeof result.questionsAnswered === "number") {
    return Math.max(0, result.questionsAnswered);
  }
  if (result.entryMode === "part_1") {
    const topicQuestions = countPart1TopicQuestions(result.diarizedTranscript);
    if (topicQuestions > 0) {
      return topicQuestions;
    }
  }
  return Math.max(countExaminerQuestions(result.diarizedTranscript), 1);
}

export function pickStrengthText(result: SpeakingSessionResult): string {
  const evaluation = result.evaluation;
  if (evaluation?.strengths?.length) {
    return evaluation.strengths[0];
  }
  if (result.structuredFeedback.strengths.length) {
    return result.structuredFeedback.strengths[0];
  }
  if (evaluation?.summaryFeedback) {
    return evaluation.summaryFeedback;
  }
  return "Good fluency and clear answers. You used relevant examples.";
}

export function pickImprovementText(result: SpeakingSessionResult): string {
  const evaluation = result.evaluation;
  if (evaluation?.improvementActions?.length) {
    return evaluation.improvementActions[0];
  }
  if (evaluation?.criticalIssues?.length) {
    return evaluation.criticalIssues[0];
  }
  if (evaluation?.lexicalIssues?.length) {
    return evaluation.lexicalIssues[0];
  }
  if (evaluation?.grammarIssues?.length) {
    return evaluation.grammarIssues[0];
  }
  return "Try to use more specific vocabulary and complex sentence structures.";
}

function formatDurationSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
