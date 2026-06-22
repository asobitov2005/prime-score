export const PART_2_PREP_SECONDS = 60;
export const PART_2_SPEAKING_SECONDS = 120;
export const PART_2_NOTES_MAX = 500;

export type Part2CueCard = {
  promptText: string;
  bulletPoints: string[];
  topicTitle: string;
};

export function formatSpeakingTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function formatSpeakingDurationLabel(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (minutes === 0) {
    return `0:${String(remainder).padStart(2, "0")}`;
  }
  if (remainder === 0) {
    return `${minutes}:00`;
  }
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function speakingPrepNotesKey(sessionId: string): string {
  return `speaking-prep-notes:${sessionId}`;
}

export function readSpeakingPrepNotes(sessionId: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return window.sessionStorage.getItem(speakingPrepNotesKey(sessionId)) ?? "";
  } catch {
    return "";
  }
}

export function writeSpeakingPrepNotes(sessionId: string, notes: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(speakingPrepNotesKey(sessionId), notes.slice(0, PART_2_NOTES_MAX));
  } catch {
    // Ignore storage failures during live practice.
  }
}

export function buildCueCardSpeechText(input: {
  promptText: string;
  bulletPoints: string[];
}): string {
  const bullets = input.bulletPoints.map((point) => point.replace(/^[-•\s]+/, "").trim()).filter(Boolean);
  const bulletText = bullets.length > 0 ? ` You should say: ${bullets.join(". ")}.` : "";
  return `${input.promptText.trim()}.${bulletText}`.replace(/\.\./g, ".");
}

export function shortenSpeakingTopicTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return "Selected topic";
  }
  const withoutTail = trimmed.replace(/\s+you\s+.+/i, "").trim();
  return withoutTail || trimmed;
}
