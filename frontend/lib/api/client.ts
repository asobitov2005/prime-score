import { createAuthApi } from "@/lib/api/auth-api";
import {
  createApiRequestContext,
  type ApiClientConfig,
} from "@/lib/api/core";
import { createDashboardApi } from "@/lib/api/dashboard-api";
import { createLeaderboardApi } from "@/lib/api/leaderboard-api";
import { createSpeakingApi } from "@/lib/api/speaking-api";
import { createTestApi } from "@/lib/api/test-api";

export { ApiError } from "@/lib/api/core";
export type { ApiClientConfig } from "@/lib/api/core";
export type {
  SpeakingAudioAsset,
  SpeakingDiarizedTranscriptItem,
  SpeakingEntryMode,
  SpeakingEvaluation,
  SpeakingHistoryItem,
  SpeakingSessionCreateResponse,
  SpeakingSessionResult,
  SpeakingStructuredFeedback,
  SpeakingTestListItem,
  SpeakingTopicItem,
} from "@/lib/api/speaking-types";

export function createApiClient(config: ApiClientConfig = {}) {
  const context = createApiRequestContext(config);
  return {
    ...createAuthApi(context),
    ...createTestApi(context.request),
    ...createSpeakingApi(context.request),
    ...createDashboardApi(context.request),
    ...createLeaderboardApi(context.request),
  };
}
