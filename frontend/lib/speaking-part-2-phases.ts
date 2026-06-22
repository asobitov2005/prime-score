import type { Part2CueCard } from "@/lib/speaking-preparation";

export type Part2ViewPhase = "examiner" | "preparation" | "speaking";

function normalizeTranscript(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectPart2TopicReveal(transcript: string): boolean {
  const text = normalizeTranscript(transcript);
  return (
    /here(?:'s| is| are)? (?:your|the) topic/.test(text)
    || /here(?:'s| is) your cue card/.test(text)
    || /this is your topic/.test(text)
    || /i(?:'d| would) like you to talk about/.test(text)
    || /i want you to talk about/.test(text)
    || /now talk about/.test(text)
  );
}

export function detectPart2PrepStart(transcript: string): boolean {
  const text = normalizeTranscript(transcript);
  return (
    /one minute to prepare/.test(text)
    || /1 minute to prepare/.test(text)
    || /minute to prepare/.test(text)
    || /time to prepare/.test(text)
    || /prepare for one minute/.test(text)
    || /you can make notes/.test(text)
    || /take one minute/.test(text)
    || /you have one minute/.test(text)
  );
}

export function detectPart2CueCardInTranscript(transcript: string, cueCard: Part2CueCard): boolean {
  const text = normalizeTranscript(transcript);
  const prompt = normalizeTranscript(cueCard.promptText);
  if (!prompt) {
    return false;
  }

  const promptSnippet = prompt.slice(0, Math.min(prompt.length, 48));
  if (promptSnippet.length >= 12 && text.includes(promptSnippet)) {
    return true;
  }

  const firstWords = prompt.split(" ").slice(0, 5).join(" ");
  return firstWords.length >= 12 && text.includes(firstWords);
}

export function shouldShowPart2CueCard(transcript: string, cueCard: Part2CueCard): boolean {
  if (!transcript.trim()) {
    return false;
  }
  if (detectPart2TopicReveal(transcript)) {
    return true;
  }
  if (detectPart2PrepStart(transcript)) {
    return true;
  }
  return detectPart2CueCardInTranscript(transcript, cueCard);
}

export function detectPart2SpeakingStart(transcript: string): boolean {
  const text = normalizeTranscript(transcript);
  return (
    /begin your (?:long )?turn/.test(text)
    || /start speaking now/.test(text)
    || /please start(?: speaking)?/.test(text)
    || /you may begin/.test(text)
    || /preparation time is over/.test(text)
    || /that's your minute/.test(text)
    || /start your long turn/.test(text)
  );
}
