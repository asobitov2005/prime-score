import type { SpeakingEntryMode, SpeakingTopicItem } from "@/lib/api/client";

export type SpeakingAiMode = "strict_exam" | "free_talk" | "uzbek_roast";

export function normalizeSpeakingEntryMode(value: string | null): SpeakingEntryMode {
  if (value === "part_1" || value === "part-1") return "part_1";
  if (value === "part_2" || value === "part-2") return "part_2";
  if (value === "part_3" || value === "part-3") return "part_3";
  return "full";
}

export function clampSpeakingPart(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(3, Math.max(1, Math.round(value)));
}

export function buildSpeakingTopicPickerHref(part: number, testId: string | null): string {
  const entryMode = `part_${part}` as SpeakingEntryMode;
  const params = new URLSearchParams({
    part: String(part),
    mode: entryMode,
    aiMode: "strict_exam",
  });
  if (testId) {
    params.set("testId", testId);
  }
  return `/speaking/topics?${params.toString()}`;
}

export const MAX_SPEAKING_TOPIC_SELECTION = 3;

export function supportsMultiTopicSelection(part: number): boolean {
  return part === 1 || part === 3;
}

export function buildRoastSpeakingHref(testId: string | null): string {
  const params = new URLSearchParams({
    start: "mock",
    aiMode: "uzbek_roast",
    mode: "full",
    part: "2",
    randomTopic: "1",
  });
  if (testId) {
    params.set("testId", testId);
  }
  return `/speaking?${params.toString()}`;
}

export function buildSpeakingLiveSessionHref(
  session: { sessionId: string; speakingTestId: string; entryMode: SpeakingEntryMode },
  aiMode: SpeakingAiMode,
  part: number,
  searchParams: Pick<URLSearchParams, "get" | "getAll">,
): string {
  const params = new URLSearchParams({
    sessionId: session.sessionId,
    testId: session.speakingTestId,
    mode: session.entryMode,
    aiMode,
    part: String(part),
    randomTopic: searchParams.get("randomTopic") ?? "1",
  });
  parseSpeakingTopicLabels(searchParams).forEach((topic) => params.append("topics", topic));

  if (session.entryMode === "part_1") {
    return `/speaking/part-1/live?${params.toString()}`;
  }

  params.set("start", "mock");
  return `/speaking?${params.toString()}`;
}

export function buildMicrophoneCheckHref(
  entryMode: SpeakingEntryMode,
  aiMode: SpeakingAiMode,
  part: number,
  testId: string | null,
  topics: SpeakingTopicItem[] | SpeakingTopicItem | null,
  randomTopic = false,
): string {
  const selectedTopics = Array.isArray(topics) ? topics : topics ? [topics] : [];
  const params = new URLSearchParams({
    mode: entryMode,
    aiMode,
    part: String(part),
    randomTopic: randomTopic || selectedTopics.length === 0 ? "1" : "0",
  });
  if (testId) {
    params.set("testId", testId);
  }
  if (!randomTopic) {
    selectedTopics.forEach((topic) => params.append("topics", topic.topicTitle));
  }
  return `/speaking/microphone-check?${params.toString()}`;
}

export function parseSpeakingTopicLabels(searchParams: Pick<URLSearchParams, "get" | "getAll">): string[] {
  const fromMulti = searchParams.getAll("topics").map((value) => value.trim()).filter(Boolean);
  if (fromMulti.length > 0) {
    return fromMulti.slice(0, MAX_SPEAKING_TOPIC_SELECTION);
  }
  const single = searchParams.get("topic")?.trim();
  return single ? [single] : [];
}

export function isPartPracticeEntryMode(entryMode: SpeakingEntryMode): boolean {
  return entryMode === "part_1" || entryMode === "part_2" || entryMode === "part_3";
}
