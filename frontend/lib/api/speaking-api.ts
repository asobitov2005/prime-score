import type { ApiRequest } from "@/lib/api/core";
import {
  mapSpeakingHistoryItem,
  mapSpeakingSession,
  mapSpeakingSessionResult,
  mapSpeakingTest,
  mapSpeakingTopic,
} from "@/lib/api/speaking-mappers";
import type {
  BackendSpeakingHistoryItem,
  BackendSpeakingSessionCreateResponse,
  BackendSpeakingSessionResult,
  BackendSpeakingTestListItem,
  BackendSpeakingTopicItem,
  SpeakingEntryMode,
} from "@/lib/api/speaking-types";

export function createSpeakingApi(request: ApiRequest) {
  return {
    listSpeakingTests: () =>
      request<{ items: BackendSpeakingTestListItem[]; total: number }>(
        "/speaking/tests",
        { method: "GET" },
      ).then((payload) => ({
        items: payload.items.map(mapSpeakingTest),
        total: payload.total,
      })),
    createSpeakingSession: (
      speakingTestId: string,
      entryMode: SpeakingEntryMode,
    ) =>
      request<BackendSpeakingSessionCreateResponse>("/speaking/sessions", {
        method: "POST",
        body: JSON.stringify({
          speaking_test_id: speakingTestId,
          entry_mode: entryMode,
        }),
      }).then(mapSpeakingSession),
    listSpeakingHistory: () =>
      request<{ items: BackendSpeakingHistoryItem[] }>(
        "/speaking/sessions/history",
        { method: "GET" },
      ).then((payload) => ({
        items: payload.items.map(mapSpeakingHistoryItem),
      })),
    getSpeakingSessionResult: (sessionId: string) =>
      request<BackendSpeakingSessionResult>(
        `/speaking/sessions/${sessionId}/result`,
        { method: "GET" },
      ).then(mapSpeakingSessionResult),
    deleteSpeakingSession: (sessionId: string) =>
      request<{ ok: true }>(`/speaking/sessions/${sessionId}`, {
        method: "DELETE",
      }),
    listSpeakingTopics: (partNumber?: number) => {
      const search = new URLSearchParams();
      if (partNumber) {
        search.set("part_number", String(partNumber));
      }
      const suffix = search.toString() ? `?${search.toString()}` : "";
      return request<{ items: BackendSpeakingTopicItem[]; total: number }>(
        `/speaking/topics${suffix}`,
        { method: "GET" },
      ).then((payload) => ({
        items: payload.items.map(mapSpeakingTopic),
        total: payload.total,
      }));
    },
  };
}
